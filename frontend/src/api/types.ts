export type Merchant = 'playstation' | 'gym' | 'adobe';
export type Strategy = 'round5' | 'round10' | 'percentage';
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
  initialRule: Strategy;
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
export interface Rule {
  merchant: Merchant;
  enabled: boolean;
  strategy: Strategy;
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
export interface Day {
  date: string;
  success: boolean;
  streak: number;
}
export interface DashboardData {
  onboarded: true;
  date: string;
  demo: boolean;
  budget: Budget;
  usage: {
    weekStart: string;
    spending: number;
    savings: number;
    weeklyCommitted: number;
    monthlyCommitted: number;
    weeklyRemaining: number;
    monthlyRemaining: number;
    safeToSpend: number;
  };
  goal: {
    name: string;
    kind: GoalKind;
    target: number;
    targetDate: string;
    saved: number;
  };
  rules: Rule[];
  entries: Entry[];
  streak: number;
  boosts: number;
  rate: string;
  evaluationDate: string;
  dayClosed: boolean;
  days: Day[];
  receipts: {
    merchant: Merchant;
    name: string;
    sender: string;
    subject: string;
    body: string;
    amount: number;
    expectedSaving: number;
  }[];
}
export type DashboardResponse =
  DashboardData | { onboarded: false; date: string };
export interface ActionResponse {
  message: string;
}
