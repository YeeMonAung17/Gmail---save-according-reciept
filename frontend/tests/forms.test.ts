import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyPlan, previewBudget, toPennies, validateStep } from '../src/lib/forms.js';
import { money } from '../src/lib/format.js';

test('GBP input and formatting preserve exact pennies', () => {
  assert.equal(toPennies('49.99'), 4999);
  assert.equal(toPennies('1.001'), null);
  assert.equal(toPennies('-10'), null);
  assert.equal(money(401), '£4.01');
});

test('form validation only requires fields reached in onboarding', () => {
  const plan = { ...emptyPlan(), income: '3200', rent: '1500' };
  assert.deepEqual(validateStep(plan, '2026-10-10'), {});
  assert.equal(previewBudget(plan).weekly, 39230);
  const errors = validateStep({ ...plan, step: 3 }, '2026-10-10');
  assert.equal(errors.target, 'Enter a positive target up to £1,000,000.');
  assert.equal(errors.targetDate, 'Choose a real future date.');
});

test('invalid financial allocations and calendar dates receive errors', () => {
  const plan = { ...emptyPlan(), income: '2000', step: 3, target: '100', targetDate: '2026-02-30' };
  assert.equal(validateStep(plan, '2026-01-01').targetDate, 'Choose a real future date.');
  assert.equal(validateStep({ ...plan, emergencyMode: 'percentage', emergency: '101' }, '2026-01-01').emergency, 'Use a percentage from 0 to 100.');
  assert.equal(validateStep({ ...plan, rent: '3000' }, '2026-01-01').income, 'Your essential expenses exceed your income.');
});
