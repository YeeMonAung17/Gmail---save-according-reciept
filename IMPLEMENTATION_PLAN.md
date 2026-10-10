# RecurrSave implementation plan

## Objective

Build a clean React frontend with a NestJS backend that turns mocked inbox receipts into simulated savings towards a personal goal. Include the five onboarding pages, a weekly budget dashboard, emergency planning and the ten day streak incentive.

The initial demo is implemented. The completion checklist records the verified features and the remaining accessibility review. See `README.md` for startup commands and demo instructions.

## Agreed scope

- Use React for the frontend and NestJS for the backend, with TypeScript in both applications.
- Mock Gmail entirely. Do not use Gmail APIs, Google OAuth, Pub/Sub or Google credentials.
- Simulate Engine Spaces, savings transfers and interest boosts. Do not move real money.
- Provide sample receipts and a way to simulate receipt arrival.
- Persist onboarding, rules, transactions and streak progress locally.
- Validate inputs in both the browser and backend.
- Make accessibility a core requirement, with visible controls and explicit acceptance checks throughout onboarding and the dashboard.
- Explain how to start the app and backend in `README.md`.

## Accessibility is a core feature

Accessibility must be visible in the product and demonstrated during the presentation. It is part of the initial implementation, not an optional finishing task.

Provide a clearly labelled **Accessibility** button in the header on both onboarding and the dashboard. Its settings panel must offer standard, large and extra large text, a high contrast option and reduced motion. Remember these display preferences on the device and include a Restore defaults action. Respect system reduced motion and forced colour settings from the first render. An accessibility preference must never require an account or completing onboarding.

The default experience must already support keyboard use, screen readers, readable contrast and browser zoom. Users must not need to find the settings panel to make basic tasks accessible. Show errors in text beside inputs, accompany status colours with words or icons, and provide text equivalents for charts and progress indicators.

Include an accessibility demonstration in the judge walkthrough: open the visible settings panel, increase text size, enable high contrast and complete a form using only the keyboard.

## Proposed architecture

Use a React application built with Vite for the frontend and a separate NestJS REST API for the backend. Keep them in one repository using npm workspaces, with independent development processes and build scripts. Document both startup commands in the README.

Run the frontend at `http://localhost:5173` and the backend at `http://localhost:3000`, with API endpoints under `/api`. In development, proxy frontend `/api` requests to NestJS so the browser uses one origin for API calls and session cookies. For production, serve the frontend build and proxy `/api` through one public origin; do not treat the Vite development server as a production server. This proxy arrangement follows the [Vite server proxy documentation](https://vite.dev/config/server-options.html#server-proxy).

Use SQLite for local persistence, preferably through the Node.js SQLite module to avoid an additional database dependency. Confirm compatibility with the selected Node.js LTS version and NestJS before adopting it. Only the NestJS backend may access the database. SQLite requires writable persistent storage and is not suitable for an ephemeral serverless deployment without a storage change.

Keep React components responsible for presentation and interaction. Group NestJS controllers and services by feature and register them in one application module for this initial demo. Controllers handle HTTP requests and injectable services implement application behaviour. Keep money calculations, receipt parsing and streak evaluation in independently testable domain functions. Use a database provider for storage and transactions. The React frontend must never import backend services or database code. The NestJS application structure follows its [official getting started guide](https://docs.nestjs.com/first-steps).

Validate forms in React for immediate feedback and validate every request again in NestJS. Keep the backend authoritative for budgets, transfers and streak outcomes. Define explicit request and response contracts and check them in integration tests rather than introducing a shared package before it is needed.

Use a random anonymous demo session in an HttpOnly cookie to isolate each visitor's records. This is a local hackathon demo, not a production banking identity system.

Proposed structure, to confirm before scaffolding:

```text
frontend/
  src/
    main.tsx                    React entry point
    App.tsx                     Onboarding and dashboard navigation
    pages/                      Five step setup and dashboard
    components/                 Forms, accessibility panel and simulator
    api/                        Typed requests to the NestJS API
    styles/                     Responsive and accessible presentation
  tests/                        Form and interaction tests
  vite.config.ts                Frontend tooling and API proxy
  .env.example                  Public frontend configuration only
backend/
  src/
    main.ts                     NestJS bootstrap and /api prefix
    app.module.ts               Root application module
    domain/                     Money, receipt and streak calculations
    database/                   SQLite provider and versioned schema
    sessions/                   Anonymous session isolation
    onboarding/                 Setup controllers, services and DTOs
    dashboard/                  Budget and goal summaries
    rules/                      Savings rule configuration
    receipts/                   Mock fixtures, parsing and processing
    spending/                   Discretionary spending records
    streaks/                    Daily evaluation and demo calendar
    health/                     Storage and application availability
  test/                         Domain and API integration tests
  .env.example                  Backend port, origin and database path
package.json                    Workspace scripts
README.md
```

## Step 1: Confirm tooling and establish the project

1. Review the dependencies using the `check-dep` skill and obtain approval before installation.
2. Choose compatible maintained versions of React, Vite, NestJS, TypeScript and their required supporting packages. Review validation, routing, test and UI dependencies separately before adding them.
3. Establish `frontend` and `backend` npm workspaces. Scaffold React with Vite and NestJS with strict TypeScript settings in both applications.
4. Use plain CSS and simple components unless another library has an agreed benefit.
5. Add root scripts for `dev:frontend`, `dev:backend`, building both applications, type checking and tests. Add a backend production start script and document how the frontend production build is served.
6. Add `.gitignore` entries for dependencies, build output, environment secrets and local database files.
7. Configure the frontend `/api` proxy, the backend `/api` prefix and environment examples. Keep database configuration and other server settings out of frontend environment variables.

Acceptance: both development processes start independently, the React app can reach NestJS through the proxy, and both applications produce successful production builds. Record the actual verification output.

## Step 2: Define financial rules and shared validation

1. Store money in integer pennies. Convert validated decimal inputs at the boundary and format GBP for display.
2. Calculate monthly essentials as rent or mortgage, utilities, groceries and fixed bills.
3. Calculate remaining monthly income as take home pay minus essentials.
4. Accept emergency allocation as a fixed amount or a percentage of remaining income. Store the resulting amount, not two independent allocations.
5. Calculate net monthly discretionary budget as remaining income minus emergency allocation.
6. Calculate the indicative weekly allowance as `floor(monthly discretionary pennies * 12 / 52)`. Explain this annualised conversion in the UI and README.
7. Enforce both weekly and calendar month discretionary limits so the weekly estimate cannot permit overspending in a long month.
8. Validate positive income and target amount, nonnegative expenses, percentages from 0 to 100, permitted rule increments, text lengths and real future goal dates.
9. Reject expenses or allocations that exceed available income. Allow a zero discretionary budget but explain that automatic savings cannot execute.
10. Show the monthly saving pace needed to reach the goal. Treat an unrealistic deadline as guidance, not an invented promise of success.

Acceptance: calculation and validation tests cover fractional pounds, boundary values, invalid dates, negative amounts, excessive allocations and a zero available budget.

## Step 3: Implement persistence and session boundaries

1. Create a versioned SQLite schema. Store financial plans, the active goal, rules, ledger entries and daily evaluations in each session's JSON document, with separate unique receipt delivery and boost award records. Update these records atomically.
2. Initialise the database automatically through a NestJS database provider at backend startup using an environment configurable file location. Close the connection on shutdown.
3. Scope every database read and write to the current session. Do not accept ownership from request bodies.
4. Use prepared statements, database constraints and transactions.
5. Add a unique receipt identifier per session and a unique boost award per completed streak block.
6. Snapshot the applicable budget for each evaluation period so future configuration changes cannot rewrite past streak results.
7. Save onboarding progress so refreshes do not discard completed steps.

Acceptance: data survives an application restart, separate sessions cannot access each other's data, and transaction failures leave no partial receipt or transfer records.

## Step 4: Build the five onboarding pages

1. **Financial baseline:** collect monthly take home pay and the four essential expense categories. Show the remaining amount as inputs change.
2. **Security first:** display remaining income and let the user select an emergency amount or percentage. Explain that this is a monthly allocation, not an existing cash balance.
3. **Target goal:** offer House Deposit, New Car, Holiday / Travel and Custom Goal. Require a custom name where appropriate, a target amount and a future target date.
4. **Budget summary:** show income, essentials, emergency allocation and the net discretionary budget with a clear visual breakdown.
5. **Weekly engine:** show the calculated weekly allowance, explain the ten day streak, choose an initial savings rule and finish setup.
6. Include a progress indicator, Back and Continue controls, retained field values and errors attached to the relevant inputs.
7. Validate on the backend before finalising setup. Redirect completed users to the dashboard.
8. Keep the Accessibility control visible on every step. Announce step changes, move focus to the new step heading and focus the first invalid field when validation fails.

Acceptance: all five steps work with keyboard navigation and a screen reader, invalid values cannot bypass validation, returning to a previous step preserves values, and refreshing restores saved progress. Larger text and high contrast must remain usable throughout the flow.

## Step 5: Build the dashboard

1. Show weekly allowance, spending, automatic savings and remaining safe to spend amount.
2. Show goal balance, target, deadline and progress, alongside the monthly emergency allocation.
3. Show the current streak, days until the next boost and the illustrative boosted rate.
4. Show receipt activity with the merchant, invoice amount, rule, destination, saved amount and processing status.
5. Provide working actions to simulate a receipt, record discretionary spending and manage savings rules.
6. Add loading, empty, success and recoverable error states. Prevent accidental duplicate submissions while a request is pending.
7. Use a restrained visual style with readable typography, clear GBP amounts and layouts suitable for phones and desktops.
8. Keep a labelled Accessibility button in the header. Pair every chart with readable amounts and labels, and express transfer and streak statuses in text rather than colour alone.

Acceptance: each displayed figure comes from the backend ledger, every action has a visible result, and the dashboard updates after a receipt or spending entry.

## Step 6: Implement the mocked inbox and savings pipeline

1. Provide fixtures for PlayStation Network (£49.99), Gym Membership (£32.00) and Adobe Creative Cloud (£19.99).
2. Define a mock receipt envelope containing a stable message identifier, sender, subject, body and received time.
3. Parse the supported mock receipt format on the backend. Reject malformed, ambiguous or non GBP receipts rather than guessing an amount.
4. Match the receipt to an enabled merchant rule and the active goal Space.
5. Support rounding up to the nearest £5 or £10. An amount already at an exact increment produces £0 savings.
6. Support percentage matching with explicit rounding to the nearest penny.
7. Record the purchase and simulated savings transfer atomically. Deduct savings transfers from available discretionary money.
8. Classify receipts explicitly as discretionary or already included in essentials. Do not deduct an essential purchase again, but still deduct any savings match from discretionary money.
9. Record the purchase even if savings cannot proceed. Mark the transfer as skipped when it would exceed either budget limit or when no rule applies.
10. Process repeated delivery of the same message idempotently. An intentional new simulated purchase receives a new message identifier.
11. Label the inbox, Engine transfer records and resulting balances as demo data throughout the experience.

Example outcomes:

| Receipt | Rule | Simulated savings |
| --- | --- | --- |
| PlayStation £49.99 | Round up to £10 | £0.01 |
| Gym £32.00 | Match 10% | £3.20 |
| Adobe £19.99 | Round up to £5 | £0.01 |
| Additional £15.99 example | Round up to £10 | £4.01 |

The initial version has one active goal selected during onboarding. These sample rules route to that goal; the different destination names in the pitch are examples rather than a requirement for multiple simultaneous goals.

Acceptance: verify the examples, exact increment purchases, percentage rounding, duplicate delivery, unmatched receipts, essential classification and insufficient budget behaviour.

## Step 7: Implement spending and the ten day streak

1. Let users record additional discretionary spending with an amount and description. Make clear that these are purchases not already represented by a receipt.
2. Evaluate completed calendar days in one documented timezone, initially Europe/London, with Monday as the start of the budget week.
3. Count a day only after it is closed and the recorded weekly and monthly spending plus savings remain within the applicable budgets.
4. Require explicit daily confirmation, including days with no spending. Do not infer that an inactive or missing day was successful.
5. Reset the active streak after an overspent or missing day. Keep past awards in the ledger.
6. Award a simulated increase of 0.01 percentage points once for each ten consecutive qualifying days. For example, an illustrative rate of 2.00% becomes 2.01%.
7. Treat this as a demo reward, not a real bank yield or a guarantee of interest earnings. Do not calculate or credit actual interest.
8. Add a clearly labelled simulated calendar control so judges can progress through ten days without waiting. Keep simulated time on the backend and separate it from normal calendar evaluation.
9. Prevent closing the same day twice or earning the same boost twice. Evaluate a day's eligibility using its recorded budget snapshot.

Acceptance: test nine versus ten days, twenty consecutive days, duplicate evaluation, missed days, overspending, a week boundary and a daylight saving boundary. Verify the demo controls produce the same rules as normal evaluation.

## Step 8: Finish the backend API

Proposed endpoint responsibilities:

| Endpoint | Responsibility |
| --- | --- |
| `GET /api/dashboard` | Return the current plan, budgets, goal, ledger and streak |
| `GET /api/onboarding` | Restore setup progress |
| `PUT /api/onboarding` | Validate and save setup progress or complete the plan |
| `GET /api/rules` | List the session's merchant rules |
| `PUT /api/rules` | Validate and save rule settings |
| `POST /api/receipts/simulate` | Submit a supported mocked receipt to the processing pipeline |
| `POST /api/spending` | Record additional discretionary spending |
| `POST /api/days/close` | Confirm and evaluate the completed day |
| `POST /api/demo/advance-day` | Advance the explicitly enabled demo calendar |
| `GET /api/health` | Return basic application and storage availability |

1. Implement endpoints as NestJS controllers backed by injectable services. Define request DTOs and validate bodies at runtime through a global validation pipe, independently of TypeScript. Reject unknown fields and invalid types instead of silently accepting them. Review the required validation packages before installation; follow the [NestJS validation documentation](https://docs.nestjs.com/techniques/validation).
2. Use consistent JSON response shapes, meaningful HTTP status codes and readable validation errors.
3. Reject oversized or unsupported requests and protect cookie authenticated mutations by checking the configured frontend origin. Use the development proxy and production public origin for normal browser access. If direct browser access to a separate API origin is required, allow only explicitly configured origins with credentials; never use wildcard CORS for session requests.
4. Return session financial data with appropriate cache prevention headers.
5. Log operational errors without exposing receipt bodies, session tokens or financial details. Return a generic message for unexpected server failures.
6. Keep processing in NestJS services shared by controllers and tests. Avoid trusting frontend calculations or client supplied transfer amounts.
7. Use a consistent exception filter for unexpected failures and validation responses. Have the React API client handle unsuccessful responses and unavailable backend errors visibly.

Acceptance: NestJS API tests cover successful requests, invalid JSON, invalid fields, oversized requests, missing setup, foreign origins, isolation and repeated processing. Verify that session cookies survive calls through the frontend proxy and the intended production origin arrangement.

## Step 9: Review accessibility and user experience

1. Build the visible Accessibility settings panel early and reuse it across onboarding and the dashboard. Use labelled controls for text size, high contrast and reduced motion, persist preferences on the device and provide Restore defaults.
2. Use semantic headings and landmarks, a Skip to main content link, visible form labels and meaningful button text. Expose the current onboarding step and selected options programmatically.
3. Support keyboard operation for every action, maintain logical focus order and show a clear focus indicator. Opening and closing the settings panel must preserve predictable focus. If a modal is used, support Escape, keep focus inside while open and return focus to its trigger when closed.
4. Associate instructions and validation errors with their fields. Mark invalid fields programmatically, preserve entered values and provide a readable error summary where several fields fail.
5. Announce receipt processing results, saved settings and budget updates with appropriate live regions without repeatedly interrupting screen reader users. Never rely on a temporary toast as the only record of an error.
6. Provide at least 4.5:1 contrast for normal text and 3:1 for large text and essential control boundaries. Meet these requirements in the default theme as well as the high contrast option.
7. Use text and symbols alongside colour for successful, skipped and failed transfers. Give charts, budget breakdowns, goal progress and streak indicators equivalent readable values.
8. Use relative font sizes, permit browser zoom and make content reflow at a 320 CSS pixel viewport. Check 200% and 400% zoom and every text size setting without lost controls, clipped currency values or overlapping content.
9. Use comfortably sized touch targets, aiming for at least 44 by 44 CSS pixels for primary interactive controls. Do not make essential information available only on hover.
10. Respect `prefers-reduced-motion` and system forced colours. Disable nonessential transitions and animated progress effects when reduced motion is active. Do not introduce flashing effects.
11. Explain budget calculations, rule outcomes and skipped transfers in plain language. Keep simulated data and reward labels visible without interrupting the main flow.
12. Check narrow screens, long custom goal names, large currency values and date or amount entry with assistive technology. Use appropriate input types and input modes without replacing validation.

Acceptance: complete onboarding, receipt simulation, rule editing, spending entry and day confirmation using only a keyboard. Manually review these workflows with VoiceOver on the available macOS environment. Verify text size, contrast and motion settings, browser zoom and focus behaviour. Report any assistive technology or device checks that could not be performed.

## Step 10: Verify the complete implementation

1. Run domain tests for money, budgets, parsing and streak calculations.
2. Run NestJS API integration tests against an isolated temporary database and React tests for form validation and request error handling.
3. Run strict TypeScript checking and production builds for both the React frontend and NestJS backend.
4. Check the installed dependency tree for known vulnerabilities and report unresolved findings.
5. Exercise a fresh session: finish onboarding, change a rule, simulate all three receipts, record spending and earn a demo boost.
6. Exercise failures: duplicate receipt, malformed input, exhausted budget, missed day and unavailable backend.
7. Verify persistence after restarting the application and isolation using a second browser session.
8. Review the implementation against this plan and report actual command output. Do not claim checks passed unless they were run successfully.
9. Run the accessibility acceptance checks in Step 9. Use automated accessibility checks if compatible tooling has been approved, and supplement them with the required keyboard and screen reader review.
10. Verify the frontend proxy, session cookies and production API routing. Confirm the frontend handles a stopped backend without losing entered values.

Acceptance: document successful checks and disclose any failures or verification limits. Do not weaken tests to obtain a passing result.

## Step 11: Write the README and hand over

1. Explain the project and what is mocked.
2. Document the exact required Node.js and npm versions.
3. Document root installation and the separate `frontend/.env.example` and `backend/.env.example` files. State which configuration is public and which belongs only on the server.
4. Document two terminal startup instructions: `npm run dev:frontend` for React at `http://localhost:5173` and `npm run dev:backend` for NestJS at `http://localhost:3000`. Explain the frontend `/api` proxy and show the backend API base URL, `http://localhost:3000/api`.
5. Document builds for both applications, the backend production start command, frontend static hosting with API proxying, type checking and test commands. Ensure refreshing a frontend page works with the chosen navigation and hosting setup.
6. Explain automatic database initialisation, its file location and the persistent storage requirement.
7. Document API request and response examples, budget calculations, rounding, receipt classification and streak rules.
8. Include a short judge walkthrough covering onboarding, the three sample receipts, duplicate protection and the ten day boost.
9. State that no Gmail credentials are required and no real bank transfer or interest change occurs.
10. State the demo limits: anonymous local sessions, user confirmed spending, one active goal and no production banking authentication.
11. Describe the visible accessibility controls and keyboard navigation. Record accessibility verification and any known limitations, and include the accessibility demonstration in the judge walkthrough.

Acceptance: someone starting from a clean checkout can run the app and backend using only the README and can reproduce the demonstration.

## Completion checklist

- [x] Dependencies and project structure agreed.
- [x] React frontend and NestJS backend start successfully.
- [x] Frontend proxy, session cookies and API routing work together.
- [x] Five onboarding steps complete and persist correctly.
- [x] Shared calculations and server validation enforce budget limits.
- [x] Responsive dashboard shows ledger backed values.
- [x] Accessibility controls are visible on onboarding and the dashboard.
- [x] Text size, high contrast and reduced motion preferences work and persist.
- [ ] Keyboard, screen reader, contrast and zoom checks completed with evidence.
- [x] Mock receipt processing and rule management work.
- [x] Duplicate delivery cannot create duplicate savings.
- [x] Spending and savings both affect budget eligibility.
- [x] Daily streak evaluation and demo time controls work.
- [x] Boosts are awarded once per ten day block.
- [x] Sessions are isolated and data survives restart.
- [x] Automated checks and visual code review completed with evidence.
- [x] README explains app startup, backend startup and demo limitations.

The browser walkthrough verifies form validation focus, the keyboard skip link, visible settings, preference persistence, narrow screen reflow and the complete ten day reward. A manual VoiceOver walkthrough and a full contrast and browser zoom audit remain outstanding. The unchecked accessibility item must stay open until those checks have been performed.
