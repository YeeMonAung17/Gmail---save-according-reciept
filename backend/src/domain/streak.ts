import { addDays } from './dates';
import { budgetUsage } from './budget';
import { DayEvaluation, SessionState } from './models';
import { calculateBudget, DomainError } from './money';

export function evaluateDay(state: SessionState, date: string): DayEvaluation {
  if (!state.plan) throw new DomainError('Complete onboarding first.');
  const previous = state.days.at(-1);
  if (previous && previous.date >= date)
    throw new DomainError('This day has already been confirmed.');
  const budget = calculateBudget(state.plan);
  const usage = budgetUsage(
    state.entries.filter((entry) => entry.date <= date),
    date,
    budget,
  );
  const success =
    usage.weeklyCommitted <= budget.weekly &&
    usage.monthlyCommitted <= budget.discretionary;
  const consecutive = previous?.date === addDays(date, -1) && previous.success;
  const streak = success ? (consecutive ? previous.streak + 1 : 1) : 0;
  const result = {
    date,
    success,
    streak,
    weeklyCommitted: usage.weeklyCommitted,
    monthlyCommitted: usage.monthlyCommitted,
    weeklyLimit: budget.weekly,
    monthlyLimit: budget.discretionary,
  };
  state.days.push(result);
  if (streak > 0 && streak % 10 === 0) state.boosts.push(date);
  return result;
}

export function activeStreak(state: SessionState, currentDate: string): number {
  const last = state.days.at(-1);
  return last && last.date >= addDays(currentDate, -1) ? last.streak : 0;
}
