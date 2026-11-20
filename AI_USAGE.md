# AI Usage Disclosure

This project used GitHub Copilot/Copilot SDK in VS Code as an implementation and review assistant. I reviewed, ran, and understood the generated changes rather than treating tool output as automatically correct.

## Tools and models

| Tool/model | Used for |
|---|---|
| GitHub Copilot SDK in VS Code | Architecture, implementation drafts, test design, debugging, documentation, and code review. The underlying chat model/version was not consistently recorded by the workspace export, so it is not stated as fact here. |
| Next.js, React, TypeScript, Tailwind CSS | Application implementation and UI behavior. |
| Prisma CLI | Schema client generation and migration workflows. |
| Vitest | Unit and integration test implementation and execution. |
| npm / ESLint / TypeScript / Next.js build | Dependency setup, linting, type checking, and production build verification. |
| SQLite | Local persistence and integration-test storage. |
| Local browser checks | Submission states, anonymous admin redirect, and public 404 behavior. |

No live paid LLM provider, cloud deployment service, or external AI API was used for final application verification.

## Prompts that materially affected the result

These are real prompts from the project workflow. Identical material is retained; session exports are in `AI_SESSIONS.json` and `ai-logs/`.

### 1. Original project master prompt

The full master prompt is preserved at [prompt.md](prompt.md). Its key instruction was:

> Act as a Senior Full Stack Developer, Software Architect, UI/UX Designer, AI Integration Engineer, Security Engineer, and QA Engineer. Build a complete, functional, secure, maintainable, and interview-ready application based on the Ecultify Advertising LLP take-home assignment. Do not simply generate code. Understand the requirements, plan the architecture, implement features incrementally, test the implementation, identify problems, fix them, and explain important technical decisions.

This set the test-first, phase-gated, approval-gated workflow and the requirement to avoid fabricated progress.

### 2. Phase 5 frontend prompt

> I explicitly approve beginning **Phase 5 — Campaign Frontend and Submission Form**. Build the Kadak Chai Co. #MyChaiBreak campaign landing page using Next.js App Router, TypeScript, and Tailwind CSS. Implement the submission form, loading/success/pending/error states, client/server validation consistency, keyboard and responsive behavior, and prevent accidental duplicate submissions. Do not begin public result or admin phases.

This produced the campaign page and submission UX requirements.

### 3. Phase 7 admin prompt

> I explicitly approve beginning **Phase 7 — Admin Authentication and Dashboard**. Implement environment-configured administrator authentication with the approved HMAC-SHA256 signed session architecture. Protect dashboard and APIs server-side, support filtering/pagination, and allow audited approve/reject overrides without overwriting original AI fields.

This prompted the protected dashboard and moderation audit implementation.

### 4. Phase 8 QA prompt

> I explicitly approve beginning **Phase 8 — Automated Testing and QA**. Review missing test coverage across validation, database, AI, privacy, admin authorization, and public access. Add mandatory AI parser cases, run security/privacy and dependency audits, fix genuine bugs, and do not begin deployment or optional improvements.

This drove the final test expansion and defect-finding pass.

### 5. Documentation/export prompt

> Create README.md... AI_USAGE.md... AI_SESSIONS.json and an ai-logs/ folder. Export the AI chats, include real prompts, and describe mistakes and hand-written/reworked parts honestly.

This requested the submission documentation now in the repository.

## Two or more times the AI was wrong

### 1. AI timeout stopped too early

The real AI provider cleared its abort timeout as soon as `fetch()` returned headers. A stalled response body could continue beyond the intended timeout. I caught this in the real-provider timeout review and by reading [docs/PHASE_08_TESTING_QA.md](docs/PHASE_08_TESTING_QA.md). The implementation was corrected in `lib/ai/real.ts` so timeout/abort coverage remains active through reading and parsing the response body. Provider failures are normalized to timeout/network/provider categories and tests verify pending-review fallback.

### 2. Public unknown slugs returned the wrong HTTP status

The original App Router result implementation streamed a not-found UI and returned HTTP 200. I caught this during production/browser verification: a missing public token was not an actual HTTP 404. The result was moved to `app/entry/[slug]/route.ts`, which now returns 404 for unknown, pending, and rejected tokens and 200 only for approved entries.

### 3. Initial Vitest migration used the wrong lifecycle hooks

An intermediate test run used Node test-runner `before`/`after` hooks in suites that Vitest executes. Vitest reported the missing hooks. I caught the mismatch in test execution and replaced them with `beforeAll`/`afterAll`; the suite was rerun afterward.

The repository also records a metadata assertion escaping mistake and an external TypeScript run racing `.next/types`; in both cases, rerunning with correct escaping/build order exposed and resolved the issue.

## Parts written or substantially reworked by hand

- Final README setup and known-limitations text was assembled and manually checked against the environment and source.
- Final environment-variable documentation was limited to names and purposes; secrets, hashes, and private values were not copied into documentation.
- The AI mistake and verification summaries in this file were manually reconciled against project documentation and source behavior.
- The architecture decisions and remaining-work list were manually reviewed for consistency with the current code.
- Existing implementation areas were primarily AI-assisted drafts, then modified, tested, or corrected through direct review and documented QA. This includes schema/routing decisions, test assertions, timeout handling, public 404 behavior, and source cleanup.

