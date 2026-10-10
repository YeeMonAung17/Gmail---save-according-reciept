import { addDays, weekStart } from './dates';
import { Budget, Entry } from './models';

export function committed(entry: Entry): number {
  return (entry.essential ? 0 : entry.amount) + entry.saved;
}

export function budgetUsage(entries: Entry[], date: string, budget: Budget) {
  const start = weekStart(date);
  const end = addDays(start, 7);
  const weeklyEntries = entries.filter((entry) => entry.date >= start && entry.date < end);
  const monthlyEntries = entries.filter((entry) => entry.date.slice(0, 7) === date.slice(0, 7));
  const spending = weeklyEntries.reduce((sum, entry) => sum + (entry.essential ? 0 : entry.amount), 0);
  const savings = weeklyEntries.reduce((sum, entry) => sum + entry.saved, 0);
  const weeklyCommitted = spending + savings;
  const monthlyCommitted = monthlyEntries.reduce((sum, entry) => sum + committed(entry), 0);
  return {
    weekStart: start, spending, savings, weeklyCommitted, monthlyCommitted,
    weeklyRemaining: budget.weekly - weeklyCommitted,
    monthlyRemaining: budget.discretionary - monthlyCommitted,
    safeToSpend: Math.max(0, Math.min(budget.weekly - weeklyCommitted, budget.discretionary - monthlyCommitted)),
  };
}
