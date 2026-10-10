import { useRef } from 'react';
import type { DashboardData, Merchant } from '../api/types';
import { Icon } from './Icon';
import { money } from '../lib/format';

interface Props { data: DashboardData; busy: boolean; run: (path: string, method: string, body: unknown) => Promise<boolean>; }

export function ReceiptSimulator({ data, busy, run }: Props) {
  const pending = useRef<Partial<Record<Merchant, string>>>({});
  function simulate(merchant: Merchant) {
    const messageId = pending.current[merchant] || crypto.randomUUID();
    pending.current[merchant] = messageId;
    void run('/receipts/simulate', 'POST', { merchant, messageId }).then((success) => {
      if (success) delete pending.current[merchant];
    });
  }
  return <section className="card" id="inbox" aria-labelledby="inbox-heading">
    <div className="section-heading"><div><span className="eyebrow">INBOX TO INTEREST</span><h2 id="inbox-heading">Your receipts, working harder</h2></div><span className="tag">Mocked inbox</span></div>
    <p className="section-intro">Choose a sample receipt. We will apply your rule and record a simulated saving into {data.goal.name}.</p>
    <div className="receipt-grid">{data.receipts.map((receipt) => {
      const rule = data.rules.find((item) => item.merchant === receipt.merchant)!;
      const last = data.entries.find((entry) => entry.merchant === receipt.merchant);
      return <article className="receipt-card" key={receipt.merchant}>
        <div className={`merchant-logo ${receipt.merchant}`} aria-hidden="true">{receipt.merchant === 'playstation' ? 'PS' : receipt.merchant === 'gym' ? 'G' : 'A'}</div>
        <h3>{receipt.name}</h3><p className="receipt-amount">{money(receipt.amount)}</p>
        <p className="hint">{!rule.enabled ? 'Savings paused' : rule.strategy === 'percentage' ? `${rule.percentage}% match` : rule.strategy === 'round5' ? 'Round up to £5' : 'Round up to £10'}<br />{rule.essential ? 'Purchase already in essentials' : 'Discretionary purchase'}</p>
        <button className="button secondary full" disabled={busy || (data.demo && data.dayClosed)} onClick={() => simulate(receipt.merchant)}><Icon name="mail" size={17} />Simulate receipt<span className="sr-only"> from {receipt.name}</span></button>
        <details className="receipt-details"><summary>View sample email<span className="sr-only"> from {receipt.name}</span></summary><p>{receipt.sender}</p><p>{receipt.subject}</p><pre>{receipt.body}</pre></details>
        {last?.receiptId && <button className="text-button replay" disabled={busy} onClick={() => void run('/receipts/simulate', 'POST', { merchant: receipt.merchant, messageId: last.receiptId })}>Replay last receipt<span className="sr-only"> from {receipt.name}, to test duplicate protection</span></button>}
      </article>;
    })}</div>
    {data.demo && data.dayClosed && <p className="info-note">This demo day is closed. Advance the calendar to simulate a new purchase.</p>}
  </section>;
}
