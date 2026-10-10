import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, request } from '../api/client';
import type { ActionResponse, GoalKind, PlanInput } from '../api/types';
import { BudgetBreakdown } from '../components/BudgetBreakdown';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { emptyPlan, previewBudget, validateStep } from '../lib/forms';
import { goalNames, money } from '../lib/format';

const steps = ['Your financial baseline', 'Your emergency cushion', 'Something to save for', 'The bigger picture', 'Your weekly engine'];
const subtitles = [
  'A good plan starts with knowing what is coming in and what needs to go out.',
  'A little peace of mind first. Set aside part of your remaining income for unexpected expenses.',
  'Give those small savings a purpose. What would you love to make happen?',
  'Every pound has a place. Here is how your monthly budget comes together.',
  'Small steps, on repeat. Your receipts can help your goal grow while you stay on track.',
];

export function Onboarding({ date, onComplete }: { date: string; onComplete: () => Promise<void> }) {
  const [plan, setPlan] = useState<PlanInput>(emptyPlan);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const budget = previewBudget(plan);

  async function load() {
    setLoading(true); setError('');
    try {
      const saved = await request<{ draft: PlanInput | null; complete: boolean }>('/onboarding');
      if (saved.complete) { await onComplete(); return; }
      if (saved.draft) setPlan({ ...saved.draft, step: Math.min(saved.draft.step + 1, 5) });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Setup could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (!loading) heading.current?.focus(); }, [plan.step, loading]);

  function update<K extends keyof PlanInput>(key: K, value: PlanInput[K]) { setPlan((current) => ({ ...current, [key]: value })); }

  async function next(event: FormEvent) {
    event.preventDefault();
    const issues = validateStep(plan, date);
    setErrors(issues); setError('');
    if (Object.keys(issues).length) {
      setError('Please check the highlighted fields.');
      document.getElementById(Object.keys(issues)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      await request<ActionResponse>('/onboarding', 'PUT', { ...plan, complete: plan.step === 5 });
      if (plan.step === 5) await onComplete();
      else update('step', plan.step + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your progress could not be saved.');
      if (failure instanceof ApiError) {
        setErrors(failure.fields);
        document.getElementById(Object.keys(failure.fields)[0])?.focus();
      }
    } finally { setBusy(false); }
  }

  function example() {
    const targetDate = `${Number(date.slice(0, 4)) + 1}-${date.slice(5, 10) === '02-29' ? '02-28' : date.slice(5, 10)}`;
    setPlan({ ...emptyPlan(), income: '3200', rent: '950', utilities: '150', groceries: '250', bills: '150', emergency: '200', target: '2000', targetDate });
    setErrors({}); setError('');
  }

  function amountField(key: 'income' | 'rent' | 'utilities' | 'groceries' | 'bills' | 'target', label: string, hint?: string) {
    return <Field id={key} label={label} prefix="£" inputMode="decimal" value={plan[key]} onChange={(event) => update(key, event.target.value)} error={errors[key]} hint={hint} autoComplete="off" />;
  }

  if (loading) return <main id="main-content" tabIndex={-1} className="loading-state" aria-busy="true"><p role="status">Loading your setup…</p></main>;

  return <main id="main-content" tabIndex={-1} className="onboarding-layout">
    <aside className="onboarding-story" aria-label="Your setup journey">
      <span className="eyebrow">YOUR MONEY, WITH A LITTLE MOMENTUM</span>
      <h1>Little by little.<br /><span>Closer to your dream.</span></h1>
      <p>Turn your everyday receipts into something to look forward to. First, let us build a budget that works for you.</p>
      <ol className="step-list">{steps.map((step, index) => <li key={step} className={index + 1 === plan.step ? 'active' : index + 1 < plan.step ? 'finished' : ''} aria-current={index + 1 === plan.step ? 'step' : undefined}><span className="step-number">{index + 1 < plan.step ? <Icon name="check" size={16} /> : index + 1}</span><span>{step}</span></li>)}</ol>
      <div className="story-note"><Icon name="shield" /><p>Essentials first. Emergency cushion next.<br />Your dreams, with room to breathe.</p></div>
    </aside>
    <section className="setup-card" aria-labelledby="step-heading">
      <div className="step-caption"><span>STEP {plan.step} OF 5</span><span>Financial setup</span></div>
      <h2 id="step-heading" ref={heading} tabIndex={-1}>{steps[plan.step - 1]}</h2>
      <p className="section-intro">{subtitles[plan.step - 1]}</p>
      {error && <div className="error-box" role="alert"><strong>{error}</strong>{Object.keys(errors).length > 0 && <ul>{Object.entries(errors).map(([field, message]) => <li key={field}><a href={`#${field}`}>{message}</a></li>)}</ul>}<button type="button" className="text-button" onClick={() => void load()}>Reload saved setup</button></div>}
      <form onSubmit={(event) => void next(event)} noValidate aria-busy={busy}>
        {plan.step === 1 && <>
          <button type="button" className="example-button" onClick={example}>Try an example budget <Icon name="arrow" size={16} /></button>
          {amountField('income', 'Monthly take home pay', 'Your monthly pay after tax.')}
          <div className="form-divider"><span>Your monthly essentials</span></div>
          <div className="field-grid">{amountField('rent', 'Rent or mortgage')}{amountField('utilities', 'Utilities')}{amountField('groceries', 'Groceries')}{amountField('bills', 'Other fixed bills')}</div>
          <div className="inline-total"><span>Remaining after essentials</span><strong>{money(budget.remaining)}</strong></div>
        </>}
        {plan.step === 2 && <>
          <div className="remaining-card"><span>Remaining monthly income</span><strong>{money(budget.remaining)}</strong></div>
          <fieldset className="choice-group"><legend>How would you like to allocate?</legend><div className="segmented">{(['amount', 'percentage'] as const).map((mode) => <label key={mode} className={plan.emergencyMode === mode ? 'selected' : ''}><input type="radio" name="emergency-mode" value={mode} checked={plan.emergencyMode === mode} onChange={() => update('emergencyMode', mode)} />{mode === 'amount' ? 'Fixed amount' : 'Percentage'}</label>)}</div></fieldset>
          <Field id="emergency" label={plan.emergencyMode === 'amount' ? 'Monthly emergency allocation' : 'Percentage of remaining income'} prefix={plan.emergencyMode === 'amount' ? '£' : '%'} inputMode="decimal" value={plan.emergency} onChange={(event) => update('emergency', event.target.value)} error={errors.emergency} hint="This is a monthly budget allocation, not an existing bank balance." />
          <div className="info-note"><Icon name="shield" /><p>Your emergency Space comes first. You will have <strong>{money(budget.discretionary)}</strong> left for weekly spending and small savings.</p></div>
        </>}
        {plan.step === 3 && <>
          <fieldset className="goal-options"><legend>Choose your goal</legend><div className="goal-grid">{(Object.keys(goalNames) as GoalKind[]).map((kind) => <label key={kind} className={`goal-option ${plan.goalKind === kind ? 'selected' : ''}`}><input type="radio" name="goal-kind" value={kind} checked={plan.goalKind === kind} onChange={() => update('goalKind', kind)} /><Icon name={kind} size={25} /><span>{goalNames[kind]}</span></label>)}</div></fieldset>
          {plan.goalKind === 'custom' && <Field id="goalName" label="What are you saving for?" placeholder="e.g. A custom gaming PC" maxLength={60} value={plan.goalName} onChange={(event) => update('goalName', event.target.value)} error={errors.goalName} />}
          <div className="field-grid">{amountField('target', 'Target amount')}<Field id="targetDate" label="Target date" type="date" min={date} value={plan.targetDate} onChange={(event) => update('targetDate', event.target.value)} error={errors.targetDate} /></div>
          {plan.targetDate > date && (Number(plan.target) > 0) && <p className="hint">To reach your target, you would need roughly {money(Math.ceil((Number(plan.target) * 100) / Math.max(1, (new Date(plan.targetDate).getTime() - new Date(date).getTime()) / (30.4375 * 86400000))))} per month. Receipt savings are a contribution, not a promise to reach the target.</p>}
        </>}
        {plan.step === 4 && <>
          <BudgetBreakdown budget={budget} />
          <div className="remaining-card"><span>Monthly room for spending & saving</span><strong>{money(budget.discretionary)}</strong></div>
          <p className="hint">Your receipts and automatic savings both use this budget. Essentials already included above will not be counted twice.</p>
          {budget.discretionary === 0 && <p className="info-note">Your essentials and emergency allocation use your full income. Automatic savings will be skipped until budget is available.</p>}
        </>}
        {plan.step === 5 && <>
          <div className="weekly-preview"><span>Your indicative weekly allowance</span><strong>{money(budget.weekly)}</strong><p>Monthly discretionary budget × 12 ÷ 52. Both weekly and monthly limits apply.</p></div>
          <label className="select-label" htmlFor="initialRule">PlayStation savings rule</label><select id="initialRule" value={plan.initialRule} onChange={(event) => update('initialRule', event.target.value as PlanInput['initialRule'])}><option value="round10">Round up to the nearest £10</option><option value="round5">Round up to the nearest £5</option><option value="percentage">Match 10% of the receipt</option></select>
          <p className="hint">Gym starts with a 10% match and Adobe with a £5 round up. You can change every rule on the dashboard.</p>
          <div className="info-note"><Icon name="spark" /><p><strong>Ten days. A little extra reward.</strong><br />Confirm ten consecutive days within budget to earn a simulated 0.01 percentage point interest boost. Spending and savings both count.</p></div>
        </>}
        <div className="form-actions">{plan.step > 1 ? <button type="button" className="button secondary" disabled={busy} onClick={() => { update('step', plan.step - 1); setErrors({}); setError(''); }}>Back</button> : <span className="hint">Progress saves when you continue.</span>}<button type="submit" className="button primary" disabled={busy}>{busy ? 'Saving…' : plan.step === 5 ? 'Start my savings journey' : 'Continue'}{!busy && <Icon name="arrow" size={18} />}</button></div>
      </form>
      <p className="demo-footnote">Mocked inbox. Simulated money. No bank or Gmail connection.</p>
    </section>
  </main>;
}
