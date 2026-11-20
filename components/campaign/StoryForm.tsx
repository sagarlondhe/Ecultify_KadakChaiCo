'use client';

import { useState, type FormEvent } from 'react';
import { submissionSchema } from '@/lib/validation';

const STORY_MIN_LENGTH = 10;
const STORY_MAX_LENGTH = 300;

type FieldName = 'name' | 'city' | 'contact' | 'story' | 'consent';
type FormValues = {
  name: string;
  city: string;
  contact: string;
  story: string;
  consent: boolean;
};
type FormErrors = Partial<Record<FieldName, string>>;
type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'approved'; publicId: string }
  | { kind: 'pending' }
  | { kind: 'rejected' }
  | { kind: 'error'; message: string };

const initialValues: FormValues = {
  name: '',
  city: '',
  contact: '',
  story: '',
  consent: false,
};

function getFieldErrors(values: FormValues): FormErrors {
  const result = submissionSchema.safeParse(values);
  if (result.success) return {};

  return result.error.issues.reduce<FormErrors>((errors, issue) => {
    const field = issue.path[0] as FieldName | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}

function getServerFieldErrors(body: unknown): FormErrors {
  if (!body || typeof body !== 'object' || !('details' in body)) return {};

  const fieldNames: FieldName[] = ['name', 'city', 'contact', 'story', 'consent'];
  const details = body.details;
  if (!Array.isArray(details)) return {};

  return details.reduce<FormErrors>((errors, detail) => {
    if (!detail || typeof detail !== 'object') return errors;
    if (
      'field' in detail &&
      'message' in detail &&
      typeof detail.field === 'string' &&
      typeof detail.message === 'string' &&
      fieldNames.includes(detail.field as FieldName)
    ) {
      const field = detail.field as FieldName;
      if (!errors[field]) errors[field] = detail.message;
    }
    return errors;
  }, {});
}

export default function StoryForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<SubmissionState>({ kind: 'idle' });

  function updateField<K extends FieldName>(field: K, value: FormValues[K]) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (errors[field]) {
      setErrors({ ...errors, [field]: getFieldErrors(nextValues)[field] });
    }
    if (state.kind !== 'idle' && state.kind !== 'submitting') {
      setState({ kind: 'idle' });
    }
  }

  function validateField(field: FieldName) {
    setErrors({ ...errors, [field]: getFieldErrors(values)[field] });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === 'submitting') return;

    const nextErrors = getFieldErrors(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const parsed = submissionSchema.safeParse(values);
    if (!parsed.success) return;

    setState({ kind: 'submitting' });
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (
        (response.status === 409 || response.status === 429) &&
        body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string'
      ) {
        setState({ kind: 'error', message: body.error });
        return;
      }

      if (response.status === 400) {
        const serverErrors = getServerFieldErrors(body);
        setErrors(
          Object.keys(serverErrors).length > 0
            ? serverErrors
            : { story: 'Please check your details and try again.' }
        );
        setState({ kind: 'idle' });
        return;
      }

      if (
        !response.ok ||
        !body ||
        typeof body !== 'object' ||
        !('success' in body) ||
        body.success !== true ||
        !('status' in body)
      ) {
        setState({
          kind: 'error',
          message: 'We couldn’t send your story just now. Please try again.',
        });
        return;
      }

      const resultStatus = body.status;
      const publicId =
        'publicId' in body &&
        typeof body.publicId === 'string' &&
        /^[0-9a-f]{32}$/.test(body.publicId)
          ? body.publicId
          : null;

      if (resultStatus === 'approved' && publicId) {
        setState({ kind: 'approved', publicId });
      } else if (resultStatus === 'pending_review') {
        setState({ kind: 'pending' });
      } else if (resultStatus === 'rejected') {
        setState({ kind: 'rejected' });
      } else {
        setState({
          kind: 'error',
          message: 'We couldn’t confirm your submission. Please try again.',
        });
        return;
      }

      setValues(initialValues);
      setErrors({});
    } catch {
      setState({
        kind: 'error',
          message: 'We couldn’t connect just now. Please check your connection and try again.',
      });
    }
  }

  const isSubmitting = state.kind === 'submitting';
  const fieldClass =
    'mt-2 block min-h-12 w-full rounded-xl border border-chai-200 bg-cream-50 px-4 py-3 text-base text-chai-950 outline-none transition placeholder:text-chai-400 focus:border-chai-600 focus:ring-2 focus:ring-chai-200 disabled:cursor-not-allowed disabled:opacity-70';

  return (
    <form
      className="space-y-5"
      noValidate
      aria-busy={isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-semibold text-chai-950">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={60}
            required
            value={values.name}
            onChange={(event) => updateField('name', event.target.value)}
            onBlur={() => validateField('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={fieldClass}
            placeholder="e.g. Aanya Sharma"
            disabled={isSubmitting}
          />
          {errors.name && <p id="name-error" className="mt-1.5 text-sm text-red-800">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="city" className="text-sm font-semibold text-chai-950">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            autoComplete="address-level2"
            maxLength={50}
            required
            value={values.city}
            onChange={(event) => updateField('city', event.target.value)}
            onBlur={() => validateField('city')}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? 'city-error' : undefined}
            className={fieldClass}
            placeholder="e.g. Jaipur"
            disabled={isSubmitting}
          />
          {errors.city && <p id="city-error" className="mt-1.5 text-sm text-red-800">{errors.city}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="contact" className="text-sm font-semibold text-chai-950">
          Email address or Indian mobile number
        </label>
        <input
          id="contact"
          name="contact"
          type="text"
          autoComplete="email"
          required
          value={values.contact}
          onChange={(event) => updateField('contact', event.target.value)}
          onBlur={() => validateField('contact')}
          aria-invalid={Boolean(errors.contact)}
          aria-describedby={errors.contact ? 'contact-error contact-hint' : 'contact-hint'}
          className={fieldClass}
          placeholder="you@example.com or 98765 43210"
          disabled={isSubmitting}
        />
        <p id="contact-hint" className="mt-1.5 text-xs leading-5 text-chai-600">
          We’ll only use this to contact you about your story.
        </p>
        {errors.contact && <p id="contact-error" className="mt-1.5 text-sm text-red-800">{errors.contact}</p>}
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="story" className="text-sm font-semibold text-chai-950">
            Your chai-break story
          </label>
          <span
            aria-live="polite"
            className={`shrink-0 text-xs tabular-nums ${
              values.story.length > STORY_MAX_LENGTH ? 'font-semibold text-red-800' : 'text-chai-600'
            }`}
          >
            {values.story.length}/{STORY_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="story"
          name="story"
          rows={5}
          minLength={STORY_MIN_LENGTH}
          maxLength={STORY_MAX_LENGTH}
          required
          value={values.story}
          onChange={(event) => updateField('story', event.target.value)}
          onBlur={() => validateField('story')}
          aria-invalid={Boolean(errors.story)}
          aria-describedby={errors.story ? 'story-hint story-error' : 'story-hint'}
          className={`${fieldClass} min-h-36 resize-y`}
          placeholder="That chai break when..."
          disabled={isSubmitting}
        />
        <div className="mt-1.5 flex flex-wrap justify-between gap-2">
          <p id="story-hint" className="text-xs leading-5 text-chai-600">
            Between {STORY_MIN_LENGTH} and {STORY_MAX_LENGTH} characters.
          </p>
          {errors.story && <p id="story-error" className="text-sm text-red-800">{errors.story}</p>}
        </div>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-cream-100 p-4">
          <input
            name="consent"
            type="checkbox"
            required
            checked={values.consent}
            onChange={(event) => updateField('consent', event.target.checked)}
            onBlur={() => validateField('consent')}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-chai-400 accent-chai-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chai-700"
            disabled={isSubmitting}
          />
          <span className="text-sm leading-6 text-chai-800">
            I agree to share this story with Kadak Chai Co. for the
            #MyChaiBreak campaign. I understand it will be reviewed before
            anything is featured.
          </span>
        </label>
        {errors.consent && <p id="consent-error" className="mt-1.5 text-sm text-red-800">{errors.consent}</p>}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {state.kind === 'approved' && (
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-950">
            <p className="font-semibold">Your story is approved for the campaign. Thank you!</p>
            <p>We’re glad you shared your #MyChaiBreak with us.</p>
            <a
              href={`/entry/${state.publicId}`}
              className="mt-2 inline-flex font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-900"
            >
              View and share your result
            </a>
          </div>
        )}
        {state.kind === 'pending' && (
          <div role="status" className="rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-sm leading-6 text-chai-900">
            <p className="font-semibold">Thanks for sharing your story.</p>
            <p>It’s safely with us and awaiting review. We’ll be in touch if it’s selected.</p>
          </div>
        )}
        {state.kind === 'rejected' && (
          <div role="status" className="rounded-xl border border-chai-200 bg-cream-100 p-4 text-sm leading-6 text-chai-900">
            <p className="font-semibold">Thanks for taking part.</p>
            <p>This story isn’t a fit for the campaign, but we appreciate you sharing it with us.</p>
          </div>
        )}
        {state.kind === 'error' && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
            {state.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-chai-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-chai-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-chai-700 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {isSubmitting ? 'Sending your story…' : 'Send my story'}
      </button>
      <p className="text-center text-xs leading-5 text-chai-600">
        Your details stay private and are never shown with your story.
      </p>
    </form>
  );
}
