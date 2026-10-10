import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudget, pennies, savingFor } from '../src/domain/money';
import { addDays, today, validDate, weekStart } from '../src/domain/dates';
import { budgetUsage } from '../src/domain/budget';
import { validatePlan } from '../src/domain/validation';
import { activeStreak, evaluateDay } from '../src/domain/streak';
import { parseReceipt } from '../src/receipts/fixtures';
import { PlanInput, SessionState } from '../src/domain/models';

export const plan: PlanInput = { income: '3200', rent: '950', utilities: '150', groceries: '250', bills: '150', emergencyMode: 'amount', emergency: '200', goalKind: 'travel', goalName: '', target: '2000', targetDate: '2099-06-01', initialRule: 'round10', step: 5, complete: true };
function state(): SessionState { return { plan, draft: plan, rules: [], entries: [], days: [], boosts: [], demoDate: '2026-10-01' }; }

test('money is parsed exactly, including fractional pounds', () => {
  assert.equal(pennies('15.99'), 1599);
  assert.equal(pennies('0.1'), 10);
  assert.equal(pennies('1000000'), 100000000);
  for (const invalid of ['-1', 'NaN', '1e3', '15.999', '', '1000000.01', 'Infinity', ' 12']) assert.throws(() => pennies(invalid));
});

test('budget protects essentials and emergency before the weekly allowance', () => {
  assert.deepEqual(calculateBudget(plan), { income: 320000, essentials: 150000, remaining: 170000, emergency: 20000, discretionary: 150000, weekly: 34615 });
  assert.equal(calculateBudget({ ...plan, emergencyMode: 'percentage', emergency: '10' }).emergency, 17000);
});

test('round ups and percentage matches follow the pitch and exact increments', () => {
  const rule = { merchant: 'playstation' as const, enabled: true, strategy: 'round10' as const, percentage: 10, essential: false };
  assert.equal(savingFor(4999, rule), 1);
  assert.equal(savingFor(1599, rule), 401);
  assert.equal(savingFor(2000, rule), 0);
  assert.equal(savingFor(1999, { ...rule, strategy: 'round5' }), 1);
  assert.equal(savingFor(3200, { ...rule, strategy: 'percentage' }), 320);
  assert.equal(savingFor(15, { ...rule, strategy: 'percentage' }), 2);
  assert.equal(savingFor(3200, { ...rule, enabled: false }), 0);
});

test('financial validation rejects overspending, invalid dates and unnamed goals', () => {
  assert.throws(() => validatePlan({ ...plan, income: '100' }, '2026-10-01'));
  assert.throws(() => validatePlan({ ...plan, emergency: '2000' }, '2026-10-01'));
  assert.throws(() => validatePlan({ ...plan, emergencyMode: 'percentage', emergency: '101' }, '2026-10-01'));
  assert.throws(() => validatePlan({ ...plan, targetDate: '2026-02-30' }, '2026-01-01'));
  assert.throws(() => validatePlan({ ...plan, targetDate: '2026-10-01' }, '2026-10-01'));
  assert.throws(() => validatePlan({ ...plan, goalKind: 'custom', goalName: ' ' }, '2026-10-01'));
  assert.doesNotThrow(() => validatePlan({ ...plan, emergency: '1700' }, '2026-10-01'));
});

test('calendar logic works across Sunday, month boundaries and daylight saving', () => {
  assert.equal(weekStart('2026-10-11'), '2026-10-05');
  assert.equal(weekStart('2026-10-12'), '2026-10-12');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(today(new Date('2026-03-29T23:30:00Z')), '2026-03-30');
  assert.equal(today(new Date('2026-10-25T23:30:00Z')), '2026-10-25');
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
});

test('monthly limit can restrict an otherwise available weekly allowance', () => {
  const current = state();
  current.entries = [
    { id: 'one', date: '2026-10-02', description: 'Earlier spending', amount: 145000, saved: 0, essential: false, source: 'manual', status: 'recorded', reason: '' },
    { id: 'two', date: '2026-10-12', description: 'Current spending', amount: 1000, saved: 320, essential: false, source: 'manual', status: 'recorded', reason: '' },
    { id: 'three', date: '2026-10-12', description: 'Essential', amount: 3200, saved: 320, essential: true, source: 'receipt', status: 'saved', reason: '' },
  ];
  const usage = budgetUsage(current.entries, '2026-10-12', calculateBudget(plan));
  assert.equal(usage.weeklyCommitted, 1640);
  assert.equal(usage.monthlyCommitted, 146640);
  assert.equal(usage.safeToSpend, 3360);
});

test('receipt parser refuses ambiguous, malformed and unsupported totals', () => {
  assert.equal(parseReceipt('Currency: GBP\nTotal: £15.99'), 1599);
  for (const invalid of ['Currency: USD\nTotal: £15.99', 'Currency: GBP\nCurrency: USD\nTotal: £1', 'Currency: GBP\nTotal: £1\nTotal: £2', 'Currency: GBP\nTotal: £1\nTotal: £1.999', 'Currency: GBP\nTotal: £0', 'Currency: GBP\nTotal: £1.999']) assert.throws(() => parseReceipt(invalid));
});

test('boost is awarded at ten and twenty days, with duplicate closure refused', () => {
  const current = state();
  for (let day = 0; day < 9; day++) evaluateDay(current, addDays('2026-10-01', day));
  assert.equal(current.boosts.length, 0);
  evaluateDay(current, '2026-10-10');
  assert.deepEqual(current.boosts, ['2026-10-10']);
  assert.throws(() => evaluateDay(current, '2026-10-10'));
  for (let day = 10; day < 20; day++) evaluateDay(current, addDays('2026-10-01', day));
  assert.deepEqual(current.boosts, ['2026-10-10', '2026-10-20']);
  assert.equal(activeStreak(current, '2026-10-21'), 20);
  assert.equal(activeStreak(current, '2026-10-22'), 0);
});

test('missing days and overspending restart the active streak', () => {
  const current = state();
  evaluateDay(current, '2026-10-01');
  assert.equal(evaluateDay(current, '2026-10-03').streak, 1);
  current.entries.push({ id: 'over', date: '2026-10-04', description: 'Over budget', amount: 40000, saved: 0, essential: false, source: 'manual', status: 'recorded', reason: '' });
  assert.equal(evaluateDay(current, '2026-10-04').streak, 0);
  assert.equal(evaluateDay(current, '2026-10-05').streak, 1);
});
