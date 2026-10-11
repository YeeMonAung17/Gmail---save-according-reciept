import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { today } from '../domain/dates';
import { validatePlan } from '../domain/validation';
import { PlanInput } from '../domain/models';

@Injectable()
export class OnboardingService {
  constructor(private readonly database: DatabaseService) {}

  get(id: string) {
    const state = this.database.read(id);
    return {
      draft: state.draft,
      complete: Boolean(state.plan),
      date: state.demoDate || today(),
    };
  }

  save(id: string, input: PlanInput) {
    return this.database.update(id, (state) => {
      if (state.plan)
        throw new ConflictException(
          'Your plan is already set. Savings rules can still be changed.',
        );
      validatePlan(input, state.demoDate || today());
      state.draft = { ...input, goalName: input.goalName.trim() };
      if (input.complete) {
        state.plan = state.draft;
        state.rules = [
          {
            merchant: 'playstation',
            enabled: true,
            strategy: input.initialRule,
            percentage: 10,
            essential: false,
          },
          {
            merchant: 'gym',
            enabled: true,
            strategy: 'percentage',
            percentage: 10,
            essential: false,
          },
          {
            merchant: 'adobe',
            enabled: true,
            strategy: 'round5',
            percentage: 10,
            essential: false,
          },
        ];
      }
      return {
        message: input.complete
          ? 'Your savings journey is ready.'
          : 'Progress saved.',
        complete: input.complete,
      };
    });
  }
}
