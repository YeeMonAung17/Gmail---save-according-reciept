# RecurrSave

Turn routine inbox receipts into progress towards your dream goals.

A React frontend and NestJS backend for the hackathon idea described in [PRESENTATION.md](PRESENTATION.md). Gmail receipts, Engine Spaces, transfers and interest boosts are fully simulated. There are no Google or banking credentials, external email requests or real payments.

## Requirements

- Node.js 22.23 or later on the 22 series, or Node.js 24 or later. The development version is recorded in `.nvmrc`.
- npm 10 or later.
- A writable local filesystem for SQLite.

## Install

From the project root:

```sh
npm ci
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

The environment files contain local configuration only. Defaults work without copying them.

## Start the frontend

In your first terminal, from the project root:

```sh
npm run dev:frontend
```

Open **http://localhost:5173**. Use this URL consistently: the default backend origin check expects `localhost`, rather than `127.0.0.1`.

## Start the backend

In your second terminal, from the project root:

```sh
npm run dev:backend
```

The backend runs at **http://localhost:3000**. Its API base URL is `http://localhost:3000/api`. Check availability at `http://localhost:3000/api/health`.

Both processes must be running. The frontend sends `/api` requests through Vite's development proxy to NestJS. The backend compiles and restarts when source files change.

## Configuration

| Location | Variable | Default | Purpose |
| --- | --- | --- | --- |
| `frontend/.env` | `API_PROXY_TARGET` | `http://localhost:3000` | Backend address used by the development proxy |
| `backend/.env` | `PORT` | `3000` | Backend port |
| `backend/.env` | `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed browser origin for API mutations |
| `backend/.env` | `DATABASE_PATH` | `./data/recurrsave.sqlite` | SQLite location, relative to the backend workspace |
| `backend/.env` | `DEMO_ENABLED` | `true` | Give new sessions a simulated calendar |

Do not put server secrets in the frontend. Configuration prefixed with `VITE_` would be exposed to the browser; this app does not need any such values.

SQLite is initialised automatically. No database server, ORM or manual migration command is needed. The initial schema is version 1. Node.js 22 currently prints a notice that its native SQLite module is experimental; the application does not suppress it.

Each browser receives an anonymous session cookie. Financial records are isolated by session and persist after restarting the backend. Display preferences are saved separately in browser local storage. To try a new demo without changing existing data, use a private browser window.

## Demo walkthrough

1. Open the frontend and choose **Try an example budget**, or enter your own monthly take home pay and essentials.
2. Allocate an emergency amount or percentage, choose your goal and deadline, and review the summary.
3. Choose the PlayStation savings rule and complete setup. The example produces £1,500 monthly discretionary income and a £346.15 weekly allowance.
4. On the dashboard, simulate a PlayStation receipt. £49.99 rounded up to £50 saves £0.01 into the active goal Space.
5. Simulate Gym and Adobe receipts. The initial rules save £3.20 and £0.01 respectively, provided the budget permits the transfers.
6. Choose **Replay last receipt**. The backend recognises the message identifier and creates no second purchase or saving.
7. Change a savings rule. If a purchase was already included in your monthly essentials, explicitly mark it as such to avoid counting its purchase amount twice.
8. Record discretionary spending that is not represented by a receipt. Both spending and savings reduce the available budget.
9. Confirm that all spending is recorded and close the demo day. Advance by one day and repeat. Ten consecutive days within budget award one illustrative interest boost from 2.00% to 2.01%.
10. Open **Accessibility** in the header. Try larger text, high contrast and reduced motion, then navigate using the keyboard.

For an insufficient budget demonstration, create a new private browser session with a small discretionary budget and simulate a purchase. The purchase is recorded, but the saving is skipped when either budget limit would be exceeded.

## Financial rules

- Money is parsed and stored as integer pennies. Inputs allow at most two decimal places and amounts up to £1,000,000.
- Monthly remaining income = take home pay minus essential expenses.
- Emergency allocation is a fixed amount or a percentage of remaining income.
- Monthly discretionary budget = remaining income minus emergency allocation.
- Weekly allowance = `floor(monthly discretionary pennies * 12 / 52)`. It is an annualised estimate, not the number of weeks in a particular month.
- Weekly budgets start on Monday. Calendar month and weekly limits both apply; safe to spend is the smaller remaining amount, with a minimum display of zero.
- Recorded overspending is retained. It prevents further automatic savings and causes a failed daily evaluation, rather than hiding the purchase.
- Essential receipt classification is explicit. By default, demo receipts are discretionary; the app does not assume a subscription was included in the user's setup.
- Round ups use the nearest next £5 or £10 boundary. Exact boundaries produce zero savings. Percentage matches round to the nearest penny.
- Savings transfers consume discretionary money even when the underlying purchase is classified as essential.
- The emergency amount is a budget allocation, not a simulated account balance that increases every time the dashboard loads.
- The initial version has one active goal. The completed financial plan is fixed for the session so past budget checks cannot be changed retroactively. Merchant savings rules remain editable.

## Streak rules

The timezone is Europe/London. In demo mode, each session has its own date and the visible calendar buttons control it. Closing a simulated day requires the user to confirm that all spending for that day is recorded. Spending cannot be added to a closed demo day.

A successful day is one where recorded weekly and monthly spending plus savings are within both limits. Missing confirmations and over budget days break the active streak. Each completed block of ten consecutive successful days adds **0.01 percentage points** to an illustrative base rate of 2.00%. Awards are preserved, and duplicate day closure cannot award another boost. No real interest is calculated or credited.

Setting `DEMO_ENABLED=false` makes newly created sessions use the real calendar. In those sessions, only yesterday can be closed, and simulated date advancement is disabled. Use a new browser session when changing calendar mode; existing demo history is not converted to real calendar history.

## Accessibility

The **Accessibility** control is visible before onboarding and on the dashboard. It offers standard, large and extra large text, high contrast, reduced motion and Restore defaults. Preferences persist on the device. System reduced motion and forced colours are respected without opening the settings panel.

The interface includes a keyboard skip link, visible focus indicators, semantic headings, labelled native controls, field errors, onboarding focus management, live feedback and text equivalents for visual budget and streak indicators. Information is never available only through colour or hover.

Use Tab and Shift+Tab to move between controls. The settings disclosure supports Enter or Space to open, and Escape to close and return focus to its trigger. Browser zoom is supported. Screen reader verification is still required before claiming full accessibility conformance; automated checks cannot replace it.

## Project structure

```text
frontend/
  src/
    api/             API requests and response types
    components/      Focused UI components and accessibility controls
    lib/             Input validation and display formatting
    pages/           Onboarding and dashboard
    styles/          Responsive CSS and accessibility preferences
  tests/             Form, API client and browser checks
backend/
  src/
    common/          Request validation, errors and state safeguards
    database/        SQLite persistence and atomic updates
    domain/          Pure money, budget, date and streak calculations
    sessions/        Anonymous cookie session middleware
    onboarding/      Financial setup
    dashboard/       Budget and goal summaries
    rules/           Merchant rule settings
    receipts/        Mock fixtures and savings processing
    spending/        Manual discretionary spending
    streaks/         Day confirmation and demo calendar
    health/          Availability endpoint
  test/              Domain and HTTP integration tests
```

Controllers accept HTTP requests. Services implement the use cases. Domain functions do calculations. The SQLite provider stores each session's state as a JSON document, with separate unique receipt delivery and boost award records. A transaction updates these together or rolls them back together. All feature providers are registered in one NestJS application module to keep the initial project simple.

## Backend API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check actual backend and storage availability |
| GET | `/api/dashboard` | Retrieve budgets, goal, rules, receipts, ledger and streak |
| GET | `/api/onboarding` | Retrieve saved setup and calendar date |
| PUT | `/api/onboarding` | Validate and save a completed step or final plan |
| GET | `/api/rules` | Retrieve merchant rules |
| PUT | `/api/rules` | Save exactly one rule per demo merchant |
| POST | `/api/receipts/simulate` | Process a fixture with a unique message identifier |
| POST | `/api/spending` | Record spending using an idempotent request identifier |
| POST | `/api/days/close` | Confirm and evaluate the day |
| POST | `/api/demo/advance-day` | Advance this session's demo date |

Except for health, the endpoints use the session cookie. Mutations require JSON and an `Origin` header matching `FRONTEND_ORIGIN`. Requests above 16 KB are rejected. Unknown DTO fields are rejected, and financial responses use `Cache-Control: no-store`.

Receipt request:

```json
{
  "merchant": "playstation",
  "messageId": "8db9a92b-0f28-43b7-b2e1-1b89d8ea9cec"
}
```

Use `playstation`, `gym` or `adobe`. Reuse a message identifier to replay delivery; use a new UUID for a genuinely new simulated purchase.

Spending request:

```json
{
  "id": "548a9df3-35ba-4af1-a7eb-3ab093944283",
  "amount": "12.50",
  "description": "Lunch with a friend"
}
```

Amounts in requests are decimal strings; amounts in API budget and ledger responses are integer pennies. Successful mutation responses contain `message`. Receipt responses also include `entry` and `duplicate`. Validation errors contain `message` and, for financial fields, a `fields` map. Common status codes are 400 for invalid request structure, 403 for disallowed origins, 409 for conflicting state, 413 for excessive body size and 422 for invalid financial values.

## Checks

From the root:

```sh
npm run typecheck
npm test
npm run build
npm audit
```

Tests use Node.js's built in runner. Backend tests start a real NestJS HTTP server with an isolated SQLite database. They cover validation, sessions, duplicate processing, skipped transfers, budget calculations, rollback and streak boundaries. Frontend tests cover form rules and API error handling.

With both development servers running and Google Chrome installed:

```sh
npm run test:browser
```

The browser check uses Chrome's debugging protocol with an isolated temporary profile and no browser testing dependency. Its default executable path is for macOS. On another platform, set `CHROME_PATH` to your installed Chrome executable. `APP_URL` can override the default `http://localhost:5173`.

It exercises onboarding, persistence on refresh, receipt replay, display preferences, narrow layouts and the ten day reward through the UI. Screenshots are saved in a temporary folder whose path is printed. A fresh anonymous session is created for every run.

Verification on 10 October 2026: 6 frontend tests and 22 backend tests passed, TypeScript checks and both production builds passed, and `npm audit` reported zero known vulnerabilities. The Chrome walkthrough also passed rule editing, all three sample receipts, spending retry after a blocked request, accessible names, visible text contrast, the keyboard skip link, system reduced motion and layout at 320 pixels with extra large text. Manual VoiceOver and a complete contrast and browser zoom audit remain outstanding.

## Production build

```sh
npm run build
npm run start:backend
```

The frontend build is in `frontend/dist`. The backend build is in `backend/dist`.

For production hosting, serve `frontend/dist` with a static web server and proxy `/api` to the running NestJS process on port 3000. Use one public HTTPS origin, set `FRONTEND_ORIGIN` to that origin and set `NODE_ENV=production` so the session cookie is Secure. Keep the SQLite file on persistent writable storage. The backend binds to local loopback for use behind the proxy.

For example, the relevant Nginx location rules are:

```nginx
root /absolute/path/to/frontend/dist;

location / {
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Configure your HTTPS listener separately. Do not expose the development server as production hosting.

## Dependency choices

The requested stack uses React, Vite, NestJS and TypeScript. Required supporting packages provide NestJS's Express adapter, runtime validation, reflection metadata and RxJS. CSS, icons, money parsing, SQLite and tests use local code or Node.js facilities. No UI framework, ORM, routing package or browser testing package is needed.

Registry review of the pinned versions:

| Package | Version | Release | Approximate unpacked size | Licence |
| --- | --- | --- | --- | --- |
| React | 19.3.0 | 9 September 2026 | 179 KB | MIT |
| React DOM | 19.3.0 | 9 September 2026 | 8,064 KB | MIT |
| Vite | 8.3.4 | 8 October 2026 | 2,377 KB | MIT |
| NestJS core | 12.1.2 | 30 September 2026 | 681 KB | MIT |
| NestJS common | 12.1.2 | 30 September 2026 | 543 KB | MIT |
| NestJS Express adapter | 12.1.2 | 30 September 2026 | 68 KB | MIT |
| class-validator | 0.15.1 | 26 February 2026 | 5,327 KB | MIT |
| class-transformer | 0.5.1 | 22 November 2021 | 776 KB | MIT |
| reflect-metadata | 0.2.2 | 29 March 2024 | 241 KB | Apache-2.0 |
| RxJS | 7.8.2 | 22 February 2025 | 4,498 KB | Apache-2.0 |
| TypeScript | 5.9.3 | 30 September 2025 | 23,625 KB | Apache-2.0 |

These are package installation sizes, not browser bundle sizes. The older supporting libraries are still required by the chosen NestJS validation and reflection approach. Registry usage signals range from roughly 11 million to 305 million weekly downloads across these packages. TypeScript declarations are bundled except for React, which uses its corresponding `@types` packages. Vite's build toolchain includes platform specific binaries; Node.js provides SQLite without an additional native package.

The alternative was custom request validation without the validation libraries. The selected DTO approach keeps request rules conventional within NestJS. Sources: [NestJS validation](https://docs.nestjs.com/techniques/validation), [Vite guide](https://vite.dev/guide/), [Node.js SQLite](https://nodejs.org/api/sqlite.html) and the [npm registry](https://registry.npmjs.org/).

## Demo limits

This is an anonymous local hackathon application, not a production banking service. Spending is entered or simulated by the user; unrecorded purchases cannot be detected. There is one active goal per session and a 5,000 entry demo limit. Gmail parsing supports the supplied fixtures only. A goal deadline is planning guidance, not a savings guarantee. No account recovery, banking authentication, real yield or live Gmail integration is included.
