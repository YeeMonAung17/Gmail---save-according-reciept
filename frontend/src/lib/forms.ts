import type { Budget, PlanInput } from '../api/types.js';

export function toPennies(value: string): number | null {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return amount <= 100_000_000 ? amount : null;
}

export function previewBudget(plan: PlanInput): Budget {
  const income = toPennies(plan.income) || 0;
  const essentials = [
    plan.rent,
    plan.utilities,
    plan.groceries,
    plan.bills,
  ].reduce((sum, value) => sum + (toPennies(value) || 0), 0);
  const remaining = income - essentials;
  const emergency =
    plan.emergencyMode === 'percentage'
      ? Math.round((remaining * (toPennies(plan.emergency) || 0)) / 10_000)
      : toPennies(plan.emergency) || 0;
  const discretionary = remaining - emergency;
  return {
    income,
    essentials,
    remaining,
    emergency,
    discretionary,
    weekly: Math.floor((discretionary * 12) / 52),
  };
}

export function validateStep(
  plan: PlanInput,
  date: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of [
    'income',
    'rent',
    'utilities',
    'groceries',
    'bills',
  ] as const) {
    if (toPennies(plan[key]) === null)
      errors[key] =
        'Enter an amount from £0 to £1,000,000, with at most two decimal places.';
  }
  const budget = previewBudget(plan);
  if (toPennies(plan.income) === 0)
    errors.income = 'Take home pay must be greater than zero.';
  if (budget.remaining < 0)
    errors.income = 'Your essential expenses exceed your income.';
  if (plan.step >= 2) {
    if (toPennies(plan.emergency) === null)
      errors.emergency = 'Enter a valid allocation.';
    else if (
      plan.emergencyMode === 'percentage' &&
      Number(plan.emergency) > 100
    )
      errors.emergency = 'Use a percentage from 0 to 100.';
    else if (budget.discretionary < 0)
      errors.emergency = 'Allocation exceeds your remaining income.';
  }
  if (plan.step >= 3) {
    if (!toPennies(plan.target))
      errors.target = 'Enter a positive target up to £1,000,000.';
    const parsed = new Date(`${plan.targetDate}T12:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(plan.targetDate) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== plan.targetDate ||
      plan.targetDate <= date
    )
      errors.targetDate = 'Choose a real future date.';
    if (plan.goalKind === 'custom' && !plan.goalName.trim())
      errors.goalName = 'Give your goal a name.';
    if (plan.goalName.length > 60)
      errors.goalName = 'Use at most 60 characters.';
  }
  return errors;
}

export function emptyPlan(): PlanInput {
  return {
    income: '',
    rent: '0',
    utilities: '0',
    groceries: '0',
    bills: '0',
    emergencyMode: 'amount',
    emergency: '0',
    goalKind: 'travel',
    goalName: '',
    target: '',
    targetDate: '',
    initialRule: 'round10',
    step: 1,
    complete: false,
  };
}
