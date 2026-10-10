export type Merchant = 'playstation' | 'gym' | 'adobe';
export type GoalKind = 'house' | 'car' | 'travel' | 'custom';

export interface PlanInput {
  income: string;
  rent: string;
  utilities: string;
  groceries: string;
  bills: string;
  emergencyMode: 'amount' | 'percentage';
  emergency: string;
  goalKind: GoalKind;
  goalName: string;
  target: string;
  targetDate: string;
  initialRule: 'round5' | 'round10' | 'percentage';
  step: number;
  complete: boolean;
}

export interface Budget {
  income: number;
  essentials: number;
  remaining: number;
  emergency: number;
  discretionary: number;
  weekly: number;
}

export interface SavingsRule {
  merchant: Merchant;
  enabled: boolean;
  strategy: 'round5' | 'round10' | 'percentage';
  percentage: number;
  essential: boolean;
}

export interface Entry {
  id: string;
  date: string;
  description: string;
  amount: number;
  saved: number;
  essential: boolean;
  source: 'receipt' | 'manual';
  merchant?: Merchant;
  receiptId?: string;
  strategy?: string;
  status: 'saved' | 'skipped' | 'recorded';
  reason: string;
}

export interface DayEvaluation {
  date: string;
  success: boolean;
  streak: number;
  weeklyCommitted: number;
  monthlyCommitted: number;
  weeklyLimit: number;
  monthlyLimit: number;
}

export interface SessionState {
  draft: PlanInput | null;
  plan: PlanInput | null;
  rules: SavingsRule[];
  entries: Entry[];
  days: DayEvaluation[];
  boosts: string[];
  demoDate: string | null;
}

export const goalNames: Record<GoalKind, string> = {
  house: 'House deposit', car: 'New car', travel: 'Holiday / travel', custom: 'Custom goal',
};
