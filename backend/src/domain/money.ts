import { Budget, PlanInput, SavingsRule } from './models';

export class DomainError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function pennies(value: string): number {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value))
    throw new DomainError(
      'Enter a valid amount with at most two decimal places.',
    );
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (amount > 100_000_000)
    throw new DomainError('Amounts must not exceed £1,000,000.');
  return amount;
}

export function calculateBudget(plan: PlanInput): Budget {
  const income = pennies(plan.income);
  const essentials = [
    plan.rent,
    plan.utilities,
    plan.groceries,
    plan.bills,
  ].reduce((sum, amount) => sum + pennies(amount), 0);
  const remaining = income - essentials;
  const emergency =
    plan.emergencyMode === 'percentage'
      ? Math.round((remaining * pennies(plan.emergency)) / 10_000)
      : pennies(plan.emergency);
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

export function savingFor(amount: number, rule: SavingsRule): number {
  if (!rule.enabled) return 0;
  if (rule.strategy === 'percentage')
    return Math.round((amount * rule.percentage) / 100);
  const increment = rule.strategy === 'round5' ? 500 : 1000;
  return (increment - (amount % increment)) % increment;
}
