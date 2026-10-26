import type { ReactNode } from 'react';
import type { Alternative, PriceOption, Sourced } from '../types/alternatives';
import type { Horizon } from '../types/billing';
import type { FeatureValue, RankedCandidate } from '../types/ranking';
import type { OfferTerms } from '../types/terms';
import { FEATURE_KEYS, FEATURE_LABELS } from '../types/terms';
import { formatMoney } from '../lib/money';
import { horizonLabel } from './format';

export type OptionVariant = 'best' | 'qualified' | 'cantConfirm' | 'excluded';

type Props = {
  candidate: RankedCandidate;
  alternative?: Alternative;
  horizon: Horizon;
  variant: OptionVariant;
  /** Terms parsed from the pasted text; used for the "Your offer" card. */
  offerTerms?: OfferTerms | null;
};

const BADGE: Record<OptionVariant, string> = {
  best: 'Best fit',
  qualified: 'Meets your needs',
  cantConfirm: "Can't confirm",
  excluded: "Doesn't meet your needs",
};

function FeatureState({ value, isUserOffer }: { value: FeatureValue; isUserOffer: boolean }) {
  if (value === 'yes')
    return (
      <span className="feat feat--yes">
        <span aria-hidden="true">✓</span> Yes
      </span>
    );
  if (value === 'no')
    return (
      <span className="feat feat--no">
        <span aria-hidden="true">✕</span> <s>No</s>
      </span>
    );
  return (
    <span className="feat feat--unverified">
      <span aria-hidden="true">?</span> Not verified
      {isUserOffer ? ' (not stated in the pasted text)' : ''}
    </span>
  );
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="source-link">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function priceFor(candidate: RankedCandidate, alternative?: Alternative): PriceOption | undefined {
  if (!alternative || !candidate.period) return undefined;
  return alternative.prices.find((p) => p.period === candidate.period);
}

function BillingBasis({
  candidate,
  alternative,
  offerTerms,
}: {
  candidate: RankedCandidate;
  alternative?: Alternative;
  offerTerms?: OfferTerms | null;
}) {
  const currency = candidate.currency ?? 'USD';
  const monthly = candidate.effectiveMonthlyMinor;
  let billedMinor: number | null = null;
  const option = priceFor(candidate, alternative);
  if (option) billedMinor = option.amountMinor;
  else if (candidate.isUserOffer && offerTerms?.price.status === 'found') billedMinor = offerTerms.price.value.amountMinor;

  if (candidate.period === 'year') {
    const billed = billedMinor ?? (monthly !== null ? monthly * 12 : null);
    return (
      <p className="option__price">
        <span className="option__big">{monthly !== null ? formatMoney(monthly, currency) : 'Unknown'}</span>
        <span className="option__unit">/mo equivalent</span>
        <span className="option__basis">
          {billed !== null
            ? `Annual plan — billed ${formatMoney(billed, currency)} upfront (≈ ${
                monthly !== null ? formatMoney(monthly, currency) : '?'
              }/mo)`
            : 'Annual plan — upfront amount unknown'}
        </span>
      </p>
    );
  }
  if (candidate.period === 'month') {
    return (
      <p className="option__price">
        <span className="option__big">{monthly !== null ? formatMoney(monthly, currency) : 'Unknown'}</span>
        <span className="option__unit">/mo</span>
        <span className="option__basis">Monthly plan — billed every month</span>
      </p>
    );
  }
  return (
    <p className="option__price">
      <span className="option__big option__big--unknown">
        {monthly !== null ? formatMoney(monthly, currency) : 'Unknown'}
      </span>
      <span className="option__basis">Billing period not found</span>
    </p>
  );
}

function SourcedTerm({ label, term }: { label: string; term: Sourced<string> | 'unknown' }) {
  return (
    <div className="option__term">
      <dt>{label}</dt>
      {term === 'unknown' ? (
        <dd className="muted">Not verified</dd>
      ) : (
        <dd>
          {term.value} <SourceLink href={term.sourceUrl}>source</SourceLink>
        </dd>
      )}
    </div>
  );
}

export function OptionCard({ candidate, alternative, horizon, variant, offerTerms }: Props) {
  const currency = candidate.currency ?? 'USD';
  const titleId = `opt-${candidate.id}`;
  const refund = alternative?.refund;

  return (
    <article className={`option option--${variant}${candidate.isUserOffer ? ' option--offer' : ''}`} aria-labelledby={titleId}>
      <header className="option__head">
        <span className={`badge badge--${variant}`}>{BADGE[variant]}</span>
        <h3 id={titleId} className="option__title">
          {candidate.label}
        </h3>
        {candidate.isUserOffer && <p className="option__according">according to the pasted text</p>}
      </header>

      <BillingBasis candidate={candidate} alternative={alternative} offerTerms={offerTerms} />

      <p className="option__horizon">
        <span>Cost over {horizonLabel(horizon)}</span>
        <strong>{candidate.horizonCostMinor !== null ? formatMoney(candidate.horizonCostMinor, currency) : 'Unknown'}</strong>
      </p>

      <ul className="option__features" aria-label="Features">
        {FEATURE_KEYS.map((k) => (
          <li key={k}>
            <span className="option__feature-label">{FEATURE_LABELS[k]}</span>
            <FeatureState value={candidate.features[k]} isUserOffer={candidate.isUserOffer} />
          </li>
        ))}
      </ul>

      {candidate.reasons.length > 0 && (
        <ul className="option__reasons" aria-label="Why it is placed here">
          {candidate.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      <details className="option__details">
        <summary>Terms &amp; sources</summary>
        <dl className="option__terms">
          {alternative ? (
            <>
              <SourcedTerm label="Cancellation" term={alternative.cancellation} />
              <div className="option__term">
                <dt>Refund</dt>
                {refund === undefined || refund === 'unknown' ? (
                  <dd className="muted">Not verified</dd>
                ) : refund.conflict ? (
                  <dd>
                    <span className="conflict">Conflicting sources</span>
                    <span className="conflict__item">
                      {refund.value} <SourceLink href={refund.sourceUrl}>source 1</SourceLink>
                    </span>
                    <span className="conflict__item">
                      {refund.conflict.value} <SourceLink href={refund.conflict.sourceUrl}>source 2</SourceLink>
                    </span>
                  </dd>
                ) : (
                  <dd>
                    {refund.value} <SourceLink href={refund.sourceUrl}>source</SourceLink>
                  </dd>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="option__term">
                <dt>Cancellation</dt>
                <dd className={offerTerms?.cancellation.status === 'found' ? '' : 'muted'}>
                  {offerTerms?.cancellation.status === 'found'
                    ? `“${offerTerms.cancellation.evidence.quote}”`
                    : 'Not found in the text'}
                </dd>
              </div>
              <div className="option__term">
                <dt>Refund</dt>
                <dd className={offerTerms?.refund.status === 'found' ? '' : 'muted'}>
                  {offerTerms?.refund.status === 'found' ? `“${offerTerms.refund.evidence.quote}”` : 'Not found in the text'}
                </dd>
              </div>
            </>
          )}
        </dl>
        {alternative && alternative.caveats.length > 0 && (
          <ul className="option__caveats">
            {alternative.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </details>

      {candidate.assumptions.length > 0 && (
        <ul className="option__assumptions" aria-label="Assumptions">
          {candidate.assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      )}

      {alternative && (
        <footer className="option__foot">
          <SourceLink href={priceFor(candidate, alternative)?.sourceUrl ?? alternative.officialUrl}>
            Official pricing page
          </SourceLink>
          <span className="option__verified">Verified on {alternative.verifiedAt}</span>
        </footer>
      )}
    </article>
  );
}
