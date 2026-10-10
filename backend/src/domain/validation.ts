import { validDate } from './dates';
import { PlanInput } from './models';
import { calculateBudget, DomainError, pennies } from './money';

export function validatePlan(plan: PlanInput, date: string): void {
  const errors: Record<string, string> = {};
  for (const field of ['income', 'rent', 'utilities', 'groceries', 'bills'] as const) {
    try { pennies(plan[field]); } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      errors[field] = error.message;
    }
  }
  if (Object.keys(errors).length) throw new DomainError('Check your financial amounts.', errors);
  if (pennies(plan.income) === 0) errors.income = 'Take home pay must be greater than zero.';
  const baseline = calculateBudget({ ...plan, emergencyMode: 'amount', emergency: '0' });
  if (baseline.remaining < 0) errors.income = 'Your essential expenses exceed your income.';
  if (plan.step >= 2 || plan.complete) {
    try {
      const emergency = pennies(plan.emergency);
      if (plan.emergencyMode === 'percentage' && emergency > 10_000) errors.emergency = 'Use a percentage between 0 and 100.';
      if (calculateBudget(plan).discretionary < 0) errors.emergency = 'Emergency allocation exceeds remaining income.';
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      errors.emergency = error.message;
    }
  }
  if (plan.step >= 3 || plan.complete) {
    try { if (pennies(plan.target) === 0) errors.target = 'The goal target must be greater than zero.'; }
    catch (error) {
      if (!(error instanceof DomainError)) throw error;
      errors.target = error.message;
    }
    if (!validDate(plan.targetDate) || plan.targetDate <= date) errors.targetDate = 'Choose a real future date.';
    if (plan.goalKind === 'custom' && !plan.goalName.trim()) errors.goalName = 'Give your custom goal a name.';
  }
  if (Object.keys(errors).length) throw new DomainError('Check the highlighted fields.', errors);
}
