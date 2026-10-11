import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { addDays, today } from '../domain/dates';
import { calculateBudget, pennies, savingFor } from '../domain/money';
import { budgetUsage } from '../domain/budget';
import { goalNames } from '../domain/models';
import { activeStreak } from '../domain/streak';
import { parseReceipt, receiptFixtures } from '../receipts/fixtures';

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  get(id: string) {
    const state = this.database.read(id);
    const date = state.demoDate || today();
    if (!state.plan) return { onboarded: false, date };
    const budget = calculateBudget(state.plan);
    const savings = state.entries.reduce((sum, entry) => sum + entry.saved, 0);
    const target = pennies(state.plan.target);
    const evaluationDate = state.demoDate ? date : addDays(date, -1);
    return {
      onboarded: true,
      date,
      demo: state.demoDate !== null,
      budget,
      usage: budgetUsage(state.entries, date, budget),
      goal: {
        name:
          state.plan.goalKind === 'custom'
            ? state.plan.goalName
            : goalNames[state.plan.goalKind],
        kind: state.plan.goalKind,
        target,
        targetDate: state.plan.targetDate,
        saved: savings,
      },
      rules: state.rules,
      receipts: Object.entries(receiptFixtures).map(([merchant, receipt]) => {
        const amount = parseReceipt(receipt.body);
        const rule = state.rules.find((item) => item.merchant === merchant)!;
        return {
          merchant,
          ...receipt,
          amount,
          expectedSaving: savingFor(amount, rule),
        };
      }),
      entries: [...state.entries].reverse(),
      streak: activeStreak(state, date),
      boosts: state.boosts.length,
      rate: (2 + state.boosts.length / 100).toFixed(2),
      evaluationDate,
      dayClosed: state.days.some((day) => day.date === evaluationDate),
      days: [...state.days].reverse(),
    };
  }
}
