import { MAX_INPUT_CHARS } from '../lib/parseOffer';
import { ImageImport } from './ImageImport';

type Props = {
  text: string;
  onTextChange: (text: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  isExample: boolean;
  onTryAnotherExample?: () => void;
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
}: Props) {
  const isEmpty = text.trim().length === 0;
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
      <textarea
        maxLength={MAX_INPUT_CHARS}
        id="offer-text"
        className="offer-input__textarea"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={7}
        spellCheck={false}
        placeholder="Paste the pricing or checkout text of a subscription offer…"
        aria-describedby={isExample ? 'example-tag offer-hint' : 'offer-hint'}
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
