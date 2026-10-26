import { MAX_INPUT_CHARS } from '../lib/parseOffer';
import { useState } from 'react';
import { ImageImport } from './ImageImport';
import { RealTermsLabel, type RealTermsInfo } from './RealTermsLabel';

type Props = {
  text: string;
  onTextChange: (text: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  isExample: boolean;
  onTryAnotherExample?: () => void;
  /** Plans that can be loaded as verbatim real terms (id + visible label). */
  realTermsOptions?: { id: string; label: string }[];
  onTryRealTerms?: (id: string) => void;
  /** Set while the text is a real plan's verbatim quotes. */
  realTerms?: RealTermsInfo | null;
};

export function OfferInput({
  text,
  onTextChange,
  startDate,
  onStartDateChange,
  onAnalyze,
  onClear,
  isExample,
  onTryAnotherExample,
  realTermsOptions = [],
  onTryRealTerms,
  realTerms = null,
}: Props) {
  const isEmpty = text.trim().length === 0;
  // Default to a plan that isn't already the cheapest, so the first comparison shows a real difference.
  const [realId, setRealId] = useState(
    (realTermsOptions.find((o) => o.id === 'devin-pro') ?? realTermsOptions[0])?.id ?? '',
  );
  const selectedReal = realTermsOptions.some((o) => o.id === realId) ? realId : realTermsOptions[0]?.id ?? '';
  const describedBy = [isExample ? 'example-tag' : '', realTerms ? 'real-terms-label' : '', 'offer-hint'].filter(Boolean).join(' ');
  return (
    <form
      className="offer-input"
      aria-label="Offer to analyze"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isEmpty) onAnalyze();
      }}
    >
      <div className="offer-input__label-row">
        <label htmlFor="offer-text" className="field-label">
          Paste the offer text
        </label>
        {isExample && (
          <span className="tag tag--example" id="example-tag">
            Example — fictional offer, not a real provider
          </span>
        )}
      </div>
      {realTerms && <RealTermsLabel info={realTerms} />}
      <textarea
        maxLength={MAX_INPUT_CHARS}
        id="offer-text"
        className="offer-input__textarea"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={7}
        spellCheck={false}
        placeholder="Paste the pricing or checkout text of a subscription offer…"
        aria-describedby={describedBy}
      />
      <div className="offer-input__controls">
        <div className="offer-input__date">
          <label htmlFor="start-date" className="field-label field-label--small">
            Start date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
        <div className="offer-input__buttons">
          <button type="submit" className="btn btn--primary" disabled={isEmpty}>
            Analyze offer
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClear} disabled={isEmpty}>
            Clear
          </button>
          {onTryAnotherExample && (
            <button type="button" className="btn btn--link" onClick={onTryAnotherExample}>
              Try another example
            </button>
          )}
          {onTryRealTerms && realTermsOptions.length > 0 && (
            <span className="real-try">
              <label htmlFor="real-terms-plan" className="sr-only">
                Real terms from
              </label>
              <select id="real-terms-plan" value={selectedReal} onChange={(e) => setRealId(e.target.value)}>
                {realTermsOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn--ghost real-try__btn" onClick={() => onTryRealTerms(selectedReal)}>
                Try real terms
              </button>
            </span>
          )}
        </div>
      </div>
      <ImageImport onText={onTextChange} />
      <p id="offer-hint" className="hint" aria-live="polite">
        {isEmpty
          ? 'Paste an offer to analyze'
          : 'Analyzed only in your browser — nothing you paste is stored or sent anywhere.'}
      </p>
    </form>
  );
}
