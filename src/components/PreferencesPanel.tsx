import { useEffect, useState } from 'react';
import type { Preferences } from '../types/ranking';
import { FEATURE_KEYS, FEATURE_LABELS } from '../types/terms';

type Props = { prefs: Preferences; onChange: (prefs: Preferences) => void };

function toDollars(minor: number | null): string {
  return minor === null ? '' : (minor / 100).toFixed(2).replace(/\.00$/, '');
}

export function PreferencesPanel({ prefs, onChange }: Props) {
  const [budgetText, setBudgetText] = useState(toDollars(prefs.maxMonthlyBudgetMinor));
  const [invalid, setInvalid] = useState(false);

  // Keep the field in sync if preferences are reset from outside.
  useEffect(() => {
    if (prefs.maxMonthlyBudgetMinor === null && budgetText.trim() !== '' && !invalid) setBudgetText('');
  }, [prefs.maxMonthlyBudgetMinor]);

  const handleBudget = (value: string) => {
    setBudgetText(value);
    const trimmed = value.trim();
    if (trimmed === '') {
      setInvalid(false);
      onChange({ ...prefs, maxMonthlyBudgetMinor: null });
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      setInvalid(true);
      onChange({ ...prefs, maxMonthlyBudgetMinor: null });
      return;
    }
    setInvalid(false);
    onChange({ ...prefs, maxMonthlyBudgetMinor: Math.round(n * 100) });
  };

  return (
    <section className="card prefs" aria-labelledby="prefs-heading">
      <h2 id="prefs-heading" className="section-title">
        What matters to you
      </h2>
      <div className="prefs__grid">
        <div className="prefs__budget">
          <label htmlFor="budget" className="field-label field-label--small">
            Monthly budget (USD)
          </label>
          <div className="money-input">
            <span aria-hidden="true">$</span>
            <input
              id="budget"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="No limit"
              value={budgetText}
              onChange={(e) => handleBudget(e.target.value)}
              aria-invalid={invalid}
              aria-describedby="budget-hint"
            />
            <span className="money-input__suffix">/mo</span>
          </div>
          <p id="budget-hint" className="hint">
            {invalid ? 'Enter a positive amount, or leave empty for no budget.' : 'Leave empty for no budget.'}
          </p>
        </div>
        <fieldset className="prefs__musts">
          <legend className="field-label field-label--small">Must-haves</legend>
          {FEATURE_KEYS.map((k) => (
            <label key={k} className="check">
              <input
                type="checkbox"
                checked={prefs.mustHave[k]}
                onChange={(e) => onChange({ ...prefs, mustHave: { ...prefs.mustHave, [k]: e.target.checked } })}
              />
              <span>{FEATURE_LABELS[k]}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </section>
  );
}
