# RecurrSave: Inbox to Interest

**Turn routine inbox receipts into progress towards your dream goals.**

RecurrSave helps people understand what they can afford to spend, plan an emergency cushion and save small amounts towards something they care about. A purchase receipt becomes a prompt to save, while a ten day budget streak rewards consistent habits.

The hackathon app will use a mocked inbox and simulated Engine Spaces. It will demonstrate the complete journey without connecting to Gmail or moving real money.

1. **Architecture**

   Use React for the frontend and NestJS for the backend, with TypeScript in both. The React app presents the journey, while the NestJS API validates inputs, calculates budgets and processes mocked receipts. Use SQLite to remember the user's setup, receipts, savings and streak. Keep financial calculations and storage separate from the interface so the behaviour is easier to understand and verify.

2. **Five step onboarding**

   Guide the user through income and essentials → emergency allocation → goal and deadline → budget summary → weekly allowance and streak explanation. Start with what they earn and need to spend, then protect an emergency allocation before planning savings for a house, car, holiday or custom goal. Validate each step and preserve progress.

3. **Dashboard and visible accessibility**

   Show the weekly allowance, spending, emergency allocation, goal progress, receipt activity and current streak in one clear view. Let users manage savings rules and record spending. Keep a visible Accessibility button on both the dashboard and onboarding, offering larger text, high contrast and reduced motion. Support keyboard navigation and screen readers by default, with readable labels and written explanations alongside charts and colours.

4. **Receipt automation**

   Use a clearly labelled inbox simulator with PlayStation, Gym and Adobe receipts. When a receipt arrives, the backend reads its amount, applies the chosen rule and records a simulated transfer into the user's goal Space. A £49.99 PlayStation receipt rounded up to £50 saves £0.01; a 10% match on a £32 gym receipt saves £3.20. Processing the same receipt again must not create another transfer.

5. **Financial safeguards**

   Calculate money in pennies to keep amounts precise. Reject invalid amounts, past goal dates and allocations that exceed available income. Count both spending and savings against the discretionary budget, without counting essential expenses twice. If a receipt leaves too little money for its savings rule, record the purchase and explain why the simulated transfer was skipped.

6. **Streak logic**

   Reward ten consecutive confirmed days within the recorded budget with a simulated interest increase of 0.01 percentage points. An illustrative rate of 2.00% becomes 2.01%. A receipt alone does not prove that someone stayed within budget: the check includes recorded spending and savings. Award each boost once, and provide a clearly labelled demo calendar so judges can see the ten day journey during the presentation.

7. **Verification**

   Test calculations, input validation, duplicate receipt processing, insufficient budgets and streak boundaries. Run TypeScript checks and production builds for both applications, then review the complete onboarding and dashboard flow. Check keyboard use, screen reader support, larger text, contrast and browser zoom. During the presentation, demonstrate both a successful saving and a skipped transfer, then show the visible accessibility settings.

8. **README and demo walkthrough**

   Explain how to install the project, start the React frontend and NestJS backend in separate terminals, find local data and run checks. Include a short walkthrough: complete setup, simulate a receipt, watch the goal balance change and progress through a ten day streak. Clearly state that Gmail, transfers and interest rewards are simulated and require no banking or Google credentials.

The value of RecurrSave is the connection between responsible budgeting, small repeatable savings and visible progress towards a personal goal. The demo will make that connection easy to follow and accessible to use.
