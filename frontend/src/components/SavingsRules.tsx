import { useEffect, useState } from 'react';
import type { Rule } from '../api/types';
import { merchantNames } from '../lib/format';

export function SavingsRules({
  rules,
  busy,
  run,
}: {
  rules: Rule[];
  busy: boolean;
  run: (path: string, method: string, body: unknown) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(rules);
  useEffect(() => {
    setDraft(rules);
  }, [rules]);
  function update(index: number, change: Partial<Rule>) {
    setDraft((current) =>
      current.map((rule, row) =>
        row === index ? { ...rule, ...change } : rule,
      ),
    );
  }
  return (
    <section className="card" id="rules" aria-labelledby="rules-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ON YOUR TERMS</span>
          <h2 id="rules-heading">Small savings, your rules</h2>
        </div>
      </div>
      <p className="section-intro">
        Choose how each receipt contributes. All savings go to your active goal
        Space.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run('/rules', 'PUT', { rules: draft });
        }}
      >
        <div className="rules-list">
          {draft.map((rule, index) => (
            <fieldset className="rule-row" key={rule.merchant}>
              <legend>{merchantNames[rule.merchant]}</legend>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(event) =>
                    update(index, { enabled: event.target.checked })
                  }
                />
                Enable savings
              </label>
              <div className="field-grid">
                <div>
                  <label htmlFor={`${rule.merchant}-strategy`}>
                    Saving strategy
                  </label>
                  <select
                    id={`${rule.merchant}-strategy`}
                    value={rule.strategy}
                    onChange={(event) =>
                      update(index, {
                        strategy: event.target.value as Rule['strategy'],
                      })
                    }
                  >
                    <option value="round10">Round up to £10</option>
                    <option value="round5">Round up to £5</option>
                    <option value="percentage">Percentage match</option>
                  </select>
                </div>
                {rule.strategy === 'percentage' && (
                  <div>
                    <label htmlFor={`${rule.merchant}-percentage`}>
                      Percentage match
                    </label>
                    <input
                      id={`${rule.merchant}-percentage`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      required
                      value={rule.percentage}
                      onChange={(event) =>
                        update(index, {
                          percentage: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                )}
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={rule.essential}
                  onChange={(event) =>
                    update(index, { essential: event.target.checked })
                  }
                />
                Purchase already included in my monthly essentials
              </label>
            </fieldset>
          ))}
        </div>
        <p className="hint">
          Marking a receipt as essential avoids counting its purchase twice. Its
          savings transfer still uses your discretionary budget.
        </p>
        <button className="button primary" disabled={busy} type="submit">
          Save rules
        </button>
      </form>
    </section>
  );
}
