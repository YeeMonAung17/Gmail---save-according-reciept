import { useRef, useState } from 'react';
import { Field } from './Field';
import { toPennies } from '../lib/forms';

export function SpendingForm({ busy, closed, run }: { busy: boolean; closed: boolean; run: (path: string, method: string, body: unknown) => Promise<boolean> }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pending = useRef<{ id: string; amount: string; description: string } | null>(null);
  return <section className="card" aria-labelledby="spending-heading"><span className="eyebrow">KEEP THE FULL PICTURE</span><h2 id="spending-heading">Record your spending</h2><p className="section-intro">Add discretionary purchases that are not already represented by an inbox receipt.</p>
    <form noValidate onSubmit={(event) => {
      event.preventDefault();
      const issues: Record<string, string> = {};
      if (!toPennies(amount)) issues.amount = 'Enter a positive amount up to £1,000,000.';
      if (!description.trim()) issues.description = 'Add a short description.';
      setErrors(issues);
      if (Object.keys(issues).length) { document.getElementById(`spending-${Object.keys(issues)[0]}`)?.focus(); return; }
      if (!pending.current || pending.current.amount !== amount || pending.current.description !== description) pending.current = { id: crypto.randomUUID(), amount, description };
      void run('/spending', 'POST', pending.current).then((success) => { if (success) { setAmount(''); setDescription(''); pending.current = null; } });
    }}>
      <Field id="spending-amount" label="Amount" prefix="£" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} error={errors.amount} />
      <Field id="spending-description" label="Description" placeholder="e.g. Lunch with a friend" maxLength={80} value={description} onChange={(event) => setDescription(event.target.value)} error={errors.description} />
      <button className="button primary" disabled={busy || closed}>Record spending</button>
      {closed && <p className="hint">Advance the demo calendar to record spending on a new day.</p>}
    </form>
  </section>;
}
