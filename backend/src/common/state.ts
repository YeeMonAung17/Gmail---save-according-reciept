import { ConflictException } from '@nestjs/common';
import { SessionState } from '../domain/models';
import { DomainError } from '../domain/money';
import { today } from '../domain/dates';

export function requirePlan(state: SessionState) {
  if (!state.plan) throw new ConflictException('Complete onboarding first.');
  return state.plan;
}

export function openDate(state: SessionState): string {
  requirePlan(state);
  const date = state.demoDate || today();
  if (state.days.some((day) => day.date === date))
    throw new ConflictException(
      'This day is closed. Advance the demo calendar before adding spending.',
    );
  if (state.entries.length >= 5000)
    throw new DomainError(
      'This demo session has reached its transaction limit.',
    );
  return date;
}
