import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { addDays, today } from '../domain/dates';
import { evaluateDay } from '../domain/streak';
import { requirePlan } from '../common/state';

@Injectable()
export class StreaksService {
  constructor(private readonly database: DatabaseService) {}
  close(id: string) {
    return this.database.update(id, (state) => {
      requirePlan(state);
      const day = evaluateDay(state, state.demoDate || addDays(today(), -1));
      return {
        message: day.success
          ? `Day confirmed. Your streak is ${day.streak} days.${day.streak % 10 === 0 ? ' You earned a simulated 0.01 percentage point boost!' : ''}`
          : 'Day confirmed. Budget exceeded, so your streak has restarted.',
        day,
      };
    });
  }

  advance(id: string) {
    return this.database.update(id, (state) => {
      requirePlan(state);
      if (!state.demoDate || process.env.DEMO_ENABLED === 'false')
        throw new ForbiddenException('The demo calendar is disabled.');
      state.demoDate = addDays(state.demoDate, 1);
      return {
        message: `Demo calendar advanced to ${state.demoDate}.`,
        date: state.demoDate,
      };
    });
  }
}
