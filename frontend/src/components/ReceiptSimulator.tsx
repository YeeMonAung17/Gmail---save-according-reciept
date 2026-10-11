import { useEffect, useRef, useState } from 'react';
import type { DashboardData, Merchant } from '../api/types';
import { Icon } from './Icon';
import { money } from '../lib/format';

interface Props {
  data: DashboardData;
  busy: boolean;
  run: (path: string, method: string, body: unknown) => Promise<boolean>;
}

export function ReceiptSimulator({ data, busy, run }: Props) {
  const [pending, setPending] = useState<{
    merchant: Merchant;
    messageId: string;
    stage: 'received' | 'review' | 'complete';
    replay: boolean;
  } | null>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const inboxHeading = useRef<HTMLHeadingElement>(null);
  const receipt = data.receipts.find(
    (item) => item.merchant === pending?.merchant,
  );
  const rule = data.rules.find((item) => item.merchant === pending?.merchant);
  const result = data.entries.find(
    (entry) => entry.receiptId === pending?.messageId,
  );
  const closed = data.demo && data.dayClosed;

  useEffect(() => {
    if (pending) stepHeading.current?.focus();
  }, [pending?.stage, pending?.messageId]);

  async function confirm() {
    if (!pending) return;
    const success = await run('/receipts/simulate', 'POST', {
      merchant: pending.merchant,
      messageId: pending.messageId,
    });
    if (success) setPending({ ...pending, stage: 'complete' });
  }

  function finish() {
    setPending(null);
    inboxHeading.current?.focus();
  }
  return (
    <section className="card" id="inbox" aria-labelledby="inbox-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">INBOX TO INTEREST</span>
          <h2 id="inbox-heading" ref={inboxHeading} tabIndex={-1}>
            Your receipts, working harder
          </h2>
        </div>
        <span className="tag">Mocked inbox</span>
      </div>
      <p className="section-intro">
        Receive a sample receipt, review your savings rule, then confirm the
        simulated saving into {data.goal.name}. Your balances change only after
        confirmation.
      </p>
      <div className="receipt-grid">
        {data.receipts.map((receipt) => {
          const rule = data.rules.find(
            (item) => item.merchant === receipt.merchant,
          )!;
          const last = data.entries.find(
            (entry) => entry.merchant === receipt.merchant,
          );
          return (
            <article className="receipt-card" key={receipt.merchant}>
              <div
                className={`merchant-logo ${receipt.merchant}`}
                aria-hidden="true"
              >
                {receipt.merchant === 'playstation'
                  ? 'PS'
                  : receipt.merchant === 'gym'
                    ? 'G'
                    : 'A'}
              </div>
              <h3>{receipt.name}</h3>
              <p className="receipt-amount">{money(receipt.amount)}</p>
              <p className="hint">
                {!rule.enabled
                  ? 'Savings paused'
                  : rule.strategy === 'percentage'
                    ? `${rule.percentage}% match`
                    : rule.strategy === 'round5'
                      ? 'Round up to £5'
                      : 'Round up to £10'}
                <br />
                {rule.essential
                  ? 'Purchase already in essentials'
                  : 'Discretionary purchase'}
              </p>
              <button
                className="button secondary full"
                disabled={busy || closed || pending !== null}
                onClick={() =>
                  setPending({
                    merchant: receipt.merchant,
                    messageId: crypto.randomUUID(),
                    stage: 'received',
                    replay: false,
                  })
                }
              >
                <Icon name="mail" size={17} />
                Receive receipt
                <span className="sr-only"> from {receipt.name}</span>
              </button>
              <details className="receipt-details">
                <summary>
                  View sample email
                  <span className="sr-only"> from {receipt.name}</span>
                </summary>
                <p>{receipt.sender}</p>
                <p>{receipt.subject}</p>
                <pre>{receipt.body}</pre>
              </details>
              {last?.receiptId && (
                <button
                  className="text-button replay"
                  disabled={busy || pending !== null}
                  onClick={() =>
                    setPending({
                      merchant: receipt.merchant,
                      messageId: last.receiptId!,
                      stage: 'received',
                      replay: true,
                    })
                  }
                >
                  Replay last receipt
                  <span className="sr-only">
                    {' '}
                    from {receipt.name}, to test duplicate protection
                  </span>
                </button>
              )}
            </article>
          );
        })}
      </div>
      {pending && receipt && rule && (
        <section
          className="receipt-journey"
          aria-labelledby="receipt-step-heading"
          aria-busy={busy}
        >
          <ol className="receipt-steps" aria-label="Receipt progress">
            {['Receive receipt', 'Review rule', 'Confirm saving'].map(
              (label, index) => (
                <li
                  key={label}
                  aria-current={
                    index ===
                    (pending.stage === 'received'
                      ? 0
                      : pending.stage === 'review'
                        ? 1
                        : 2)
                      ? 'step'
                      : undefined
                  }
                >
                  {index + 1}. {label}
                </li>
              ),
            )}
          </ol>
          <h3 id="receipt-step-heading" ref={stepHeading} tabIndex={-1}>
            {pending.stage === 'received'
              ? 'Step 1: Receipt received'
              : pending.stage === 'review'
                ? 'Step 2: Review your rule'
                : 'Step 3: Receipt processed'}
          </h3>
          <p>
            {receipt.name} · {money(receipt.amount)}
          </p>
          {pending.stage === 'received' && (
            <>
              <p className="hint">
                {pending.replay
                  ? 'This receipt was already processed. Reviewing it again will not create another saving.'
                  : 'Your receipt is ready. No purchase or saving has been recorded yet.'}
              </p>
              <p>{receipt.subject}</p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => setPending({ ...pending, stage: 'review' })}
              >
                Review savings rule
              </button>
            </>
          )}
          {pending.stage === 'review' && (
            <>
              <p>
                {!rule.enabled
                  ? 'Savings paused'
                  : rule.strategy === 'percentage'
                    ? `${rule.percentage}% match`
                    : rule.strategy === 'round5'
                      ? 'Round up to £5'
                      : 'Round up to £10'}
              </p>
              <p>
                {rule.essential
                  ? 'Purchase already included in essentials.'
                  : 'Purchase counts towards your discretionary budget.'}
              </p>
              <p>
                Calculated saving:{' '}
                <strong>{money(receipt.expectedSaving)}</strong> towards{' '}
                {data.goal.name}.
              </p>
              <p className="hint">
                {pending.replay
                  ? 'Confirm to check duplicate protection. Your balances will stay the same.'
                  : 'Confirm to record the purchase and apply this rule. Savings are skipped if there is insufficient budget.'}
              </p>
              <button
                className="button primary"
                disabled={busy || (closed && !pending.replay)}
                onClick={() => void confirm()}
              >
                {busy ? 'Processing receipt…' : 'Confirm saving'}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setPending({ ...pending, stage: 'received' })}
              >
                Back to receipt
              </button>
            </>
          )}
          {pending.stage === 'complete' && result && (
            <>
              <p role="status">
                {pending.replay
                  ? 'Receipt already processed. No duplicate transfer was created.'
                  : result.reason}
              </p>
              <p>
                {pending.replay ? 'Previously saved' : 'Saved to your goal'}:{' '}
                <strong>{money(result.saved)}</strong>
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={finish}
              >
                Receive another receipt
              </button>
            </>
          )}
          {pending.stage !== 'complete' && (
            <button className="text-button" disabled={busy} onClick={finish}>
              Cancel receipt
            </button>
          )}
        </section>
      )}
      {data.demo && data.dayClosed && (
        <p className="info-note">
          This demo day is closed. Advance the calendar to simulate a new
          purchase.
        </p>
      )}
    </section>
  );
}
