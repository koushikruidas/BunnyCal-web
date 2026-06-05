# BunnyCal E2E Runbook

## Overview

The E2E suite uses persona-based authenticated browser states.

A persona represents a pre-authenticated BunnyCal user with specific integrations already connected.

Examples:

- google-host
- google-multi-calendar
- ms-personal
- ms-work

---

# First Time Setup

Generate the Google Host persona.

```bash
npm run test:e2e:setup:google-host
```

What happens:

1. Real Google Chrome opens.
2. Login to BunnyCal using the dedicated test account.
3. Complete any required OAuth flows.
4. Wait until BunnyCal dashboard loads.
5. Playwright saves:

```text
tests/e2e/fixtures/auth-states/google-host.json
```

This only needs to be repeated when the session expires.

---

# Verify Persona Exists

Confirm:

```text
tests/e2e/fixtures/auth-states/google-host.json
```

exists and is not empty.

---

# Golden Path Test

Run the primary end-to-end workflow.

```bash
npm run test:e2e:golden
```

Flow:

Host:

- Load google-host persona
- Create event
- Publish event

Guest:

- Open booking link
- Select slot
- Enter attendee details
- Confirm booking

Assertions:

- Booking confirmation shown
- Event details displayed
- Attendee email displayed

This is the most important E2E test.

---

# Run Full E2E Suite

```bash
npm run test:e2e
```

Runs the `google-host` and `public` projects — everything that requires only the
google-host persona plus the unauthenticated public booking tests:

- Onboarding tests
- Event creation tests
- Integration tests
- Conferencing tests (google-host only)
- Public booking tests

> **Note:** This command does not run tests for `google-multi-calendar`,
> `ms-personal`, or `ms-work` projects. Those require their own captured
> personas (see Generate Additional Personas below). To run all five projects:
>
> ```bash
> npx playwright test
> ```
>
> Only use that command after capturing all personas, otherwise the
> uncaptured projects will error immediately.

---

# Interactive Mode

```bash
npm run test:e2e:ui
```

Opens Playwright UI for debugging.

---

# Headed Mode

```bash
npm run test:e2e:headed
```

Runs tests with a visible browser.

Useful for debugging selector failures.

---

# Generate Additional Personas

Google Multi Calendar

```bash
npm run test:e2e:setup:google-multi-calendar
```

Microsoft Personal

```bash
npm run test:e2e:setup:ms-personal
```

Microsoft Work / School

```bash
npm run test:e2e:setup:ms-work
```

---

# Troubleshooting

## Missing Auth State

Error:

```text
Missing auth state
```

Solution:

Recreate the persona:

```bash
npm run test:e2e:setup:google-host
```

---

## Expired Session

Symptoms:

- Redirected to sign-in page
- Dashboard not accessible

Solution:

Regenerate the affected persona state.

Example:

```bash
npm run test:e2e:setup:google-host
```

---

## View Test Report

```bash
npm run test:e2e:report
```

or

```bash
npx playwright show-report
```

---

# Recommended Workflow

Daily Development

```bash
npm run test:e2e:golden
```

Before Merge (google-host + public projects)

```bash
npm run test:e2e
```

Before Merge (all projects — requires all personas captured)

```bash
npx playwright test
```

When Session Expires

```bash
npm run test:e2e:setup:google-host
```

```
Developer workflow
  
  First time (or when a session expires):

  # 1. Start the dev server
  npm run dev
  
  # 2. Run the capture utility for the persona you need
  npm run capture:google-host

  # A Chrome window opens on BunnyCal.
  # Sign in normally — Google, Microsoft, any provider.
  # When the dashboard loads, capture completes automatically.
  # File written to: tests/e2e/fixtures/auth-states/google-host.json

  # 3. Run tests
  npm run test:e2e:golden
  npm run test:e2e

  Refreshing an expired session:

  npm run capture:google-host   # same command, overwrites the file
  
  All capture commands:

  ┌───────────────────────────────────────┬──────────────────────────────┬─────────────────────────────────────────┐
  │                Command                │           Persona            │                 Used by                 │
  ├───────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
  │ npm run capture:google-host           │ Primary Google host          │ Golden path, onboarding, event creation │
  ├───────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
  │ npm run capture:google-multi-calendar │ Google multi-calendar        │ Availability source tests               │
  ├───────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
  │ npm run capture:ms-personal           │ Microsoft personal           │ MS conferencing tests                   │
  ├───────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
  │ npm run capture:ms-work               │ Microsoft work/Entra         │ Teams conferencing tests                │
  ├───────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
  │ npm run capture:fresh-user            │ New account, no integrations │ First-run onboarding tests              │
  └───────────────────────────────────────┴──────────────────────────────┴─────────────────────────────────────────┘

  Custom persona (ad-hoc):
  npx tsx scripts/capture-auth-state.ts --persona=my-custom-account --output=path/to/file.json
  
  CI: Inject the tests/e2e/fixtures/auth-states/ files as secrets or build artifacts. The test projects load them directly with storageState:. No capture step runs in CI.
```

