import { useEffect, useRef, useState } from 'react';
import type { ActionResponse, DashboardData } from '../api/types';
import { request } from '../api/client';
import { ActivityList } from '../components/ActivityList';
import { BudgetBreakdown } from '../components/BudgetBreakdown';
import { Icon } from '../components/Icon';
import { ReceiptSimulator } from '../components/ReceiptSimulator';
import { SavingsRules } from '../components/SavingsRules';
import { SpendingForm } from '../components/SpendingForm';
import { StreakCard } from '../components/StreakCard';
import { dateLabel, money } from '../lib/format';
import mascot from '../../../assets/logo-2-web.png';

export function Dashboard({ data, refresh }: { data: DashboardData; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const notification = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const progress = Math.min(100, data.goal.saved / data.goal.target * 100);
  useEffect(() => { heading.current?.focus(); }, []);

  async function run(path: string, method: string, body: unknown): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await request<ActionResponse>(path, method, body);
      setNotice(result.message);
      await refresh();
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong. Please try again.');
      notification.current?.scrollIntoView({ block: 'nearest' });
      return false;
    } finally { setBusy(false); lock.current = false; }
  }

  return <main id="main-content" tabIndex={-1} className="dashboard">
    <div className="dashboard-heading"><div><span className="eyebrow">A LITTLE PROGRESS, EVERY DAY</span><h1 ref={heading} tabIndex={-1}>Your money has a new rhythm.</h1><p>Take care of today. Make room for what comes next.</p></div><a className="button secondary" href="#inbox"><Icon name="mail" size={18} />Try the inbox simulator</a></div>
    <nav className="dashboard-nav" aria-label="Dashboard sections"><a href="#overview">Overview</a><a href="#inbox">Mock inbox</a><a href="#rules">Savings rules</a><span>GBP · {dateLabel(data.date)}</span></nav>
    <div ref={notification} className="notifications" aria-live="polite" aria-atomic="true">{notice && <p className="success-box"><Icon name="check" size={18} />{notice}</p>}</div>
    {error && <div role="alert" className="error-box">{error}</div>}
    <section id="overview" className="overview-grid" aria-label="Budget and savings overview">
      <article className="allowance-card"><div className="allowance-top"><span className="icon-tile"><Icon name="wallet" /></span><span>THIS WEEK</span></div><p>Safe to spend</p><strong className="allowance-amount">{money(data.usage.safeToSpend)}</strong><p className="allowance-description">A little breathing room, with your savings included.</p><div className="allowance-totals"><div><span>Weekly allowance</span><strong>{money(data.budget.weekly)}</strong></div><div><span>Spent this week</span><strong>{money(data.usage.spending)}</strong></div><div><span>Saved this week</span><strong>{money(data.usage.savings)}</strong></div></div><p className="allowance-note">Week of {dateLabel(data.usage.weekStart)}. Monthly budget remaining: {money(data.usage.monthlyRemaining)}.</p>{(data.usage.weeklyRemaining < 0 || data.usage.monthlyRemaining < 0) && <p className="budget-alert">Budget exceeded. Further automatic savings are paused.</p>}</article>
      <article className="card goal-card"><div className="section-heading"><span className="icon-tile mint"><Icon name={data.goal.kind} /></span><span className="tag">Goal Space · demo</span></div><p className="card-caption">YOUR NEXT CHAPTER</p><h2>{data.goal.name}</h2><div className="goal-amount"><strong>{money(data.goal.saved)}</strong><span>of {money(data.goal.target)}</span></div><progress className="goal-progress" max={data.goal.target} value={Math.min(data.goal.saved, data.goal.target)} aria-label={`${data.goal.name} savings progress`} /><div className="goal-meta"><span>{progress.toFixed(1)}% of your goal</span><span>By {dateLabel(data.goal.targetDate)}</span></div><div className="goal-illustration" aria-hidden="true"><img className="goal-mascot" src={mascot} alt="" width={512} height={512} /><span className="illustration-star star-one">✦</span><span className="illustration-star star-two">✧</span><span className="illustration-caption">Dream it. Save for it.</span></div></article>
      <article className="card emergency-card"><span className="icon-tile mint"><Icon name="shield" /></span><p className="card-caption">PEACE OF MIND FIRST</p><h2>Emergency Space</h2><strong className="emergency-amount">{money(data.budget.emergency)}<span>/ month</span></strong><p>Your planned monthly cushion for the unexpected.</p><div className="protected-label"><Icon name="check" size={16} />Allocated before discretionary spending</div><p className="hint">An allocation in your plan, not an actual bank balance or transfer.</p></article>
    </section>
    <div className="dashboard-columns"><div className="main-column"><ReceiptSimulator data={data} busy={busy} run={run} /><ActivityList entries={data.entries} /><SavingsRules rules={data.rules} busy={busy} run={run} /></div><aside className="side-column" aria-label="Your budget habits"><StreakCard data={data} busy={busy} run={run} /><SpendingForm busy={busy} closed={data.demo && data.dayClosed} run={run} /><section className="card"><span className="eyebrow">THE MONTHLY PICTURE</span><h2>Room for what matters</h2><BudgetBreakdown budget={data.budget} /><p className="hint">Weekly allowance = monthly discretionary budget × 12 ÷ 52. Weekly and calendar month limits both apply.</p></section></aside></div>
    <p className="dashboard-disclaimer">Hackathon demo. Inbox receipts, Engine Spaces, transfers and interest rewards are simulated. Your budget depends on the spending you record.</p>
  </main>;
}
