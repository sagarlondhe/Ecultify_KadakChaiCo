import { NextRequest, NextResponse } from 'next/server';
import {
  duplicateContactMessage,
  submissionSchema,
} from '@/lib/validation';
import {
  createStoryEntry,
  DuplicateContactError,
  getEntryByContact,
} from '@/lib/entries/service';
import { moderateStory } from '@/lib/ai';
import { mapAiOutcomeToStatus } from '@/lib/ai/status';
import { consumeRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimit = consumeRateLimit(`submission:${getClientIp(request)}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many submissions. Please wait a little before trying again.',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
        },
        { status: 400 }
      );
    }

    const validationResult = submissionSchema.safeParse(body);

    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join('.') || 'root',
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details,
        },
        { status: 400 }
      );
    }

    const { name, city, contact, story, consent } = validationResult.data;

    if (await getEntryByContact(contact)) {
      return NextResponse.json(
        {
          success: false,
          error: duplicateContactMessage(
            contact.includes('@') ? 'email' : 'phone'
          ),
        },
        { status: 409 }
      );
    }

    const aiOutcome = await moderateStory({
      name,
      city,
      story,
      consent,
    });

    const status = mapAiOutcomeToStatus(aiOutcome);

    const entry = await createStoryEntry({
      name,
      city,
      contact,
      story,
      consent,
      status,
      aiDecision: aiOutcome.success ? aiOutcome.result.decision : null,
      aiCategory: aiOutcome.success ? aiOutcome.result.category : null,
      aiCaption: aiOutcome.success ? aiOutcome.result.caption : null,
      aiReason: aiOutcome.success ? aiOutcome.result.reason : null,
      aiRawResponse: null,
    });

    if (!aiOutcome.success) {
      console.error(
        `AI moderation fallback: code=${aiOutcome.code}; entry_id=${entry.id}`
      );
    }

    return NextResponse.json(
      {
        success: true,
        status,
        publicId: status === 'approved' ? entry.publicId : null,
        message:
          status === 'approved'
            ? 'Thank you! Your story was approved.'
            : 'Thank you! Your story was received and is under review by our team.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DuplicateContactError) {
      return NextResponse.json(
        {
          success: false,
          error: 'This email address or phone number has already been used.',
        },
        { status: 409 }
      );
    }

    // Safe error handling: Log internally without exposing internal errors,
    // stack traces, or credentials to client.
    console.error('Error handling story submission:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          'Unable to process submission at this time. Please try again later.',
      },
      { status: 500 }
    );
  }
}
