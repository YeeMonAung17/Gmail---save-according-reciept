import type { Entry } from '../api/types';
import { dateLabel, money } from '../lib/format';
import { Icon } from './Icon';

export function ActivityList({ entries }: { entries: Entry[] }) {
  return (
    <section className="card" aria-labelledby="activity-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">EVERY LITTLE STEP</span>
          <h2 id="activity-heading">Recent activity</h2>
        </div>
        <span className="tag">Simulated ledger</span>
      </div>
      {!entries.length ? (
        <div className="empty-activity">
          <Icon name="mail" size={32} />
          <p>Your first little save is waiting.</p>
          <span>Simulate a receipt to see the journey from inbox to goal.</span>
        </div>
      ) : (
        <ul className="activity-list">
          {entries.slice(0, 30).map((entry) => (
            <li key={entry.id}>
              <span className="activity-icon">
                <Icon
                  name={entry.source === 'receipt' ? 'mail' : 'wallet'}
                  size={19}
                />
              </span>
              <div className="activity-description">
                <h3>{entry.description}</h3>
                <p>
                  {dateLabel(entry.date)} · {money(entry.amount)} purchase
                  {entry.essential ? ' · Included in essentials' : ''}
                </p>
                <p>
                  {entry.strategy && `${entry.strategy} · `}
                  {entry.reason}
                </p>
              </div>
              <div className="activity-result">
                <strong>
                  {entry.saved > 0
                    ? `+${money(entry.saved)}`
                    : money(entry.amount)}
                </strong>
                <span className={`status-label ${entry.status}`}>
                  {entry.status === 'saved'
                    ? 'Saved to goal'
                    : entry.status === 'skipped'
                      ? 'Saving skipped'
                      : 'Spending recorded'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {entries.length > 30 && (
        <p className="hint">
          Showing your most recent 30 transactions. All transactions remain
          included in budget calculations.
        </p>
      )}
    </section>
  );
}
