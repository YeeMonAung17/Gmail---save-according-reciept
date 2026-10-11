import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { openDate, requirePlan } from '../common/state';
import { DomainError, pennies } from '../domain/money';
import { Entry } from '../domain/models';
import { SpendingDto } from './spending.dto';

@Injectable()
export class SpendingService {
  constructor(private readonly database: DatabaseService) {}

  add(id: string, input: SpendingDto) {
    const amount = pennies(input.amount);
    const description = input.description.trim();
    if (amount === 0 || !description)
      throw new DomainError('Enter a positive amount and a description.');
    return this.database.update(id, (state) => {
      requirePlan(state);
      const existing = state.entries.find((entry) => entry.id === input.id);
      if (existing) {
        if (
          existing.source !== 'manual' ||
          existing.amount !== amount ||
          existing.description !== description
        )
          throw new ConflictException(
            'This request identifier was already used for different spending.',
          );
        return { message: 'Spending already recorded.', entry: existing };
      }
      const entry: Entry = {
        id: input.id,
        date: openDate(state),
        amount,
        description,
        saved: 0,
        essential: false,
        source: 'manual',
        status: 'recorded',
        reason: 'Discretionary spending recorded.',
      };
      state.entries.push(entry);
      return { message: 'Spending recorded.', entry };
    });
  }
}
