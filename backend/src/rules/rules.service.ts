import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { requirePlan } from '../common/state';
import { SavingsRule } from '../domain/models';
import { DomainError } from '../domain/money';

@Injectable()
export class RulesService {
  constructor(private readonly database: DatabaseService) {}
  get(id: string) {
    const state = this.database.read(id);
    requirePlan(state);
    return { rules: state.rules };
  }

  save(id: string, rules: SavingsRule[]) {
    if (new Set(rules.map((rule) => rule.merchant)).size !== 3)
      throw new DomainError('Provide one rule for each demo merchant.');
    return this.database.update(id, (state) => {
      requirePlan(state);
      state.rules = rules.map((rule) => ({ ...rule }));
      return { message: 'Savings rules saved.', rules: state.rules };
    });
  }
}
