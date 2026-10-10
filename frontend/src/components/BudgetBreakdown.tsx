import type { Budget } from '../api/types';
import { money } from '../lib/format';

export function BudgetBreakdown({ budget }: { budget: Budget }) {
  const rows = [
    { label: 'Essential expenses', amount: budget.essentials, colour: 'essential' },
    { label: 'Emergency allocation', amount: budget.emergency, colour: 'emergency' },
    { label: 'Discretionary budget', amount: budget.discretionary, colour: 'discretionary' },
  ];
  return <div className="budget-breakdown">
    <div className="budget-bar" aria-hidden="true">{rows.map((row) => <span key={row.label} className={row.colour} style={{ width: `${budget.income > 0 ? Math.max(0, row.amount) / budget.income * 100 : 0}%` }} />)}</div>
    <dl className="breakdown-list"><div><dt>Monthly take home pay</dt><dd>{money(budget.income)}</dd></div>{rows.map((row) => <div key={row.label}><dt><span aria-hidden="true" className={`legend-dot ${row.colour}`} />{row.label}</dt><dd>{money(row.amount)}</dd></div>)}</dl>
  </div>;
}
