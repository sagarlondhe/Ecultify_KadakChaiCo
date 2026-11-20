# Kadak Chai Co. — #MyChaiBreak

A campaign website where people share chai-break stories. Submissions are checked by an AI moderation provider and can be reviewed by an administrator before an approved story is shared publicly.

## Features

- Responsive campaign landing page and story-submission form
- Client- and server-side validation, duplicate-contact checks, and submission rate limiting
- Mock AI moderation for offline development, with optional OpenAI-compatible providers
- Admin sign-in and a protected moderation dashboard with status/category filters
- Admin approve/reject actions with an audit trail that preserves the original AI decision
- Public pages for approved stories only
- SQLite persistence through Prisma

## Requirements

- Node.js 22 (Next.js 14 requires Node.js 18.17 or newer)
- npm

## Local setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Create an environment file in the repository root. Prisma CLI reads `.env`, so use that file for the database URL as well as application settings.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS/Linux:

   ```sh
   cp .env.example .env
   ```

   Edit `.env` before using the admin pages. Replace the sample admin username, password hash, and session secret with your own values. Do not use sample credentials in a shared or production environment.

   To make a bcrypt password hash locally, start Node and run:

   ```text
   node
   > const bcrypt = require('bcryptjs')
   > bcrypt.hash('<your-password>', 12).then(console.log)
   ```

   Put the resulting hash in `ADMIN_PASSWORD_HASH`. Escape `$` characters in the `.env` value as `\$`. Generate a session secret with:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

   Set the output as `ADMIN_SESSION_SECRET`.

3. Generate the Prisma client and apply database migrations:

   ```sh
   npx prisma generate
   npx prisma migrate deploy
   ```

   The example `DATABASE_URL` uses SQLite. With the provided schema, `file:./dev.db` stores the database at `prisma/dev.db`.

4. Start the development server:

   ```sh
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000).

## Pages and API

| Path | Description |
|---|---|
| `/` | Public campaign page and story form |
| `/admin/login` | Administrator sign-in |
| `/admin/dashboard` | Protected submission moderation dashboard |
| `/entry/{publicId}` | Public result page for an approved story |
| `POST /api/entries` | Validate and submit a story |
| `POST /api/entries/check-contact` | Check whether a contact has already been used |
| `POST /api/admin/login` | Authenticate an administrator |
| `POST /api/admin/logout` | End the admin session |
| `GET /api/admin/entries` | List submissions (requires an admin session) |
| `PATCH /api/admin/entries/{id}` | Approve or reject a submission (requires an admin session) |

Pending, rejected, and unknown public story IDs do not expose a public story page. Public pages show only a limited approved-story projection; contact details are not public.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Prisma database URL. The local SQLite example is `file:./dev.db`. |
| `AI_PROVIDER` | No | `mock` (default), `groq`, `gemini`, `openrouter`, or `openai`. |
| `AI_BASE_URL` | For real AI | Base URL for an OpenAI-compatible chat-completions API. |
| `AI_API_KEY` | For real AI | Secret API key for the selected provider. |
| `AI_MODEL` | For real AI | Model name accepted by the selected provider. |
| `AI_TIMEOUT_MS` | No | Provider request timeout in milliseconds; defaults to `15000`. |
| `ADMIN_USERNAME` | For admin | Administrator username. |
| `ADMIN_PASSWORD_HASH` | For admin | bcrypt hash of the administrator password. |
| `ADMIN_SESSION_SECRET` | For admin | HMAC signing secret; must be at least 32 characters. |
| `PORT` | No | Development/production server port; defaults to `3000`. |
| `NODE_ENV` | No | Set by the runtime; controls secure-cookie behavior in production. |

For example, the mock provider needs no API key and makes no external AI request:

```dotenv
AI_PROVIDER="mock"
```

To use a real provider, configure all of `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`. Real moderation sends the submitter's name, city, story, and consent value to that provider. Review the provider's privacy and data-retention terms before enabling it.

If AI moderation fails or returns an invalid response, the submission is left for administrator review rather than automatically approved.

## Development commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server after building |
| `npm run lint` | Run Next.js lint checks |
| `npm test` | Run the Vitest suite |
| `npx tsc --noEmit` | Check TypeScript types |
| `npx prisma validate` | Validate the Prisma schema |
| `npx prisma generate` | Generate the Prisma client |
| `npx prisma migrate deploy` | Apply committed migrations |

## Deploy on Render

The root `render.yaml` defines one Node.js web service with an attached persistent disk for the SQLite database. This keeps the existing database technology and application behavior unchanged. The service uses paid compute and disk resources (currently configured with the `1c-2g` plan) because Render requires a paid web service for persistent disks; review Render's current pricing before creating the resources. It is configured for one instance because the SQLite database and in-memory rate limiter are not shared across instances.

1. Push this repository, including `render.yaml` and `.node-version`, to GitHub.
2. In Render, choose **New → Blueprint**, connect the GitHub repository, and select the branch containing these deployment files.
3. Review the Blueprint resources and approve the charges before creating the service. The Blueprint uses the Singapore region, a 1 GB persistent disk mounted at `/var/data`, and Node.js 22.22.0.
4. When prompted for the unsynced environment variables, set:
   - `ADMIN_USERNAME`: a new administrator username.
   - `ADMIN_PASSWORD_HASH`: a bcrypt hash of a strong administrator password. Generate it using the local setup instructions above; do not enter the plain-text password.
   - `ADMIN_SESSION_SECRET`: a randomly generated secret with at least 32 characters.
5. Let the first deploy complete. Render runs `prisma migrate deploy` against the mounted SQLite database before starting Next.js. The service's public URL appears in the Render dashboard under **Settings → Domains**.
6. Smoke-test the deployed URL:
   - Load the homepage and `/admin/login`; submit a story with a valid email and another with a valid Indian mobile number.
   - Try invalid email and phone values and confirm validation blocks them. Resubmit a previously used email and phone (including an equivalent formatted phone number) and confirm duplicate-contact errors appear.
   - Check the story submission result and confirm it appears in the admin dashboard. Confirm approved public result links load when a story is approved.
   - Check Render logs for startup, migration, API, or database errors. After a restart or redeploy, confirm the prior submissions are still present.

The Blueprint build command is `npm ci --include=dev && npm run prisma:generate && npm run build`; the start command is `npx prisma migrate deploy && npm start`. Development dependencies are included at build time because Prisma CLI is declared as a development dependency.

Render supplies `PORT` at runtime; Next.js listens on that port. The production database URL and AI mock provider are set in the Blueprint. To use a real AI provider, change `AI_PROVIDER` and set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` as Render environment variables; store the API key as a secret and review the provider's handling of submitted personal data before enabling it.

Email delivery is not implemented in the current project, so email sending cannot be enabled by deployment configuration alone. Email and Indian phone validation, duplicate-contact handling, and the story form are implemented in the existing application. Verify those flows after deployment as described above.

## Project layout

```text
app/          Next.js pages and API routes
components/   Campaign form and admin UI
lib/          Validation, AI providers, authentication, and data services
prisma/       Prisma schema and database migrations
tests/        Vitest tests
```

## Notes and limitations

- SQLite is suitable for local development and this single-instance Render deployment because its database is stored on the attached persistent disk. A multi-instance deployment needs a shared database and shared rate-limit storage.
- Submission rate limiting is process-local and is not shared across multiple server instances.
- The admin dashboard currently displays an “Export CSV” link, but the export API route has no handler yet; CSV export is not currently available.
- The admin session is an HTTP-only signed cookie that expires after eight hours.
- Keep `.env` and other environment files out of version control. Store production credentials in your deployment's secret manager.

See [AI_USAGE.md](./AI_USAGE.md) for the project's AI-usage disclosure.
