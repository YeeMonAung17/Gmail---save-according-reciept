import type { DashboardData } from '../api/types';
import { dateLabel } from '../lib/format';
import { Icon } from './Icon';

export function StreakCard({
  data,
  busy,
  run,
}: {
  data: DashboardData;
  busy: boolean;
  run: (path: string, method: string, body: unknown) => Promise<boolean>;
}) {
  const progress = data.streak === 0 ? 0 : ((data.streak - 1) % 10) + 1;
  return (
    <section className="card streak-card" aria-labelledby="streak-heading">
      <div className="section-heading">
        <span className="icon-tile warm">
          <Icon name="spark" />
        </span>
        <span className="tag">Simulated reward</span>
      </div>
      <h2 id="streak-heading">Consistency has its perks.</h2>
      <p className="section-intro">
        Ten consecutive confirmed days within budget. One little interest boost.
      </p>
      <div className="streak-count">
        <strong>{data.streak}</strong>
        <span>day streak</span>
      </div>
      <div className="streak-dots" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className={index < progress ? 'filled' : ''}>
            {index < progress ? <Icon name="check" size={13} /> : index + 1}
          </span>
        ))}
      </div>
      <p className="hint">
        {data.streak > 0 && data.streak % 10 === 0
          ? 'Boost earned. Your next ten day journey starts tomorrow.'
          : `${10 - (data.streak % 10)} more confirmed days to your next boost.`}
      </p>
      <div className="rate-row">
        <span>Illustrative interest rate</span>
        <strong>{data.rate}%</strong>
      </div>
      <p className="hint">
        Base demo rate 2.00% + {data.boosts} × 0.01 percentage points. No real
        interest is earned.
      </p>
      <div className="calendar-controls">
        <p>
          <Icon name="clock" size={17} />
          <strong>{data.demo ? 'Demo calendar' : 'Calendar day'}</strong> ·{' '}
          {dateLabel(data.date)}
        </p>
        <p className="day-confirm-label">
          Confirm that all spending for {dateLabel(data.evaluationDate)} is
          recorded before closing the day.
        </p>
        <button
          className="button primary full"
          disabled={busy || data.dayClosed}
          onClick={() => void run('/days/close', 'POST', {})}
        >
          {data.dayClosed ? 'Day confirmed' : 'Confirm spending & close day'}
        </button>
        {data.demo && (
          <button
            className="button secondary full"
            disabled={busy}
            onClick={() => void run('/demo/advance-day', 'POST', {})}
          >
            Advance demo by one day <Icon name="arrow" size={17} />
          </button>
        )}
        <p className="hint">
          Unconfirmed or over budget days break the streak.{' '}
          {data.demo
            ? 'Advancing changes only this session’s simulated date.'
            : 'Only completed days can be confirmed.'}
        </p>
      </div>
      {data.days.length > 0 && (
        <details className="day-history">
          <summary>Recent day confirmations</summary>
          <ul>
            {data.days.slice(0, 10).map((day) => (
              <li key={day.date}>
                <span>{dateLabel(day.date)}</span>
                <strong>{day.success ? 'Within budget' : 'Over budget'}</strong>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
