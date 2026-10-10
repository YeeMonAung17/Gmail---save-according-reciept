import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { openDate, requirePlan } from '../common/state';
import { budgetUsage } from '../domain/budget';
import { Entry } from '../domain/models';
import { calculateBudget, savingFor } from '../domain/money';
import { parseReceipt, receiptFixtures } from './fixtures';
import { ReceiptDto } from './receipts.dto';

@Injectable()
export class ReceiptsService {
  constructor(private readonly database: DatabaseService) {}

  simulate(id: string, input: ReceiptDto) {
    return this.database.update(id, (state) => {
      const plan = requirePlan(state);
      const existing = state.entries.find((entry) => entry.receiptId === input.messageId);
      if (existing) {
        if (existing.merchant !== input.merchant) throw new ConflictException('This message identifier belongs to a different receipt.');
        return { message: 'Receipt already processed. No duplicate transfer was created.', duplicate: true, entry: existing };
      }
      const date = openDate(state);
      const fixture = receiptFixtures[input.merchant];
      const amount = parseReceipt(fixture.body);
      const rule = state.rules.find((item) => item.merchant === input.merchant)!;
      const desiredSaving = savingFor(amount, rule);
      const usage = budgetUsage(state.entries, date, calculateBudget(plan));
      const purchaseCost = rule.essential ? 0 : amount;
      const available = Math.min(usage.weeklyRemaining, usage.monthlyRemaining) - purchaseCost;
      const saved = available >= desiredSaving ? desiredSaving : 0;
      let reason = 'Savings transferred to your goal Space.';
      if (!rule.enabled) reason = 'Saving is paused for this merchant.';
      else if (desiredSaving === 0) reason = 'This rule produces no additional savings for this receipt.';
      else if (saved === 0) reason = 'Purchase recorded. Savings skipped to protect your available budget.';
      const entry: Entry = { id: randomUUID(), receiptId: input.messageId, merchant: input.merchant, date, description: fixture.name, amount, saved, essential: rule.essential, source: 'receipt', strategy: rule.strategy === 'percentage' ? `${rule.percentage}% match` : rule.strategy === 'round5' ? 'Round up to £5' : 'Round up to £10', status: saved > 0 ? 'saved' : 'skipped', reason };
      state.entries.push(entry);
      return { message: reason, duplicate: false, entry };
    });
  }
}
