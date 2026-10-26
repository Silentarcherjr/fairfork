import type { Alternative } from '../types/alternatives';
import type { Horizon } from '../types/billing';
import type { RankResult, RankedCandidate } from '../types/ranking';
import type { OfferTerms } from '../types/terms';
import { OptionCard, type OptionVariant } from './OptionCard';
import { horizonLabel } from './format';

type Props = {
  result: RankResult;
  alternatives: Alternative[];
  horizon: Horizon;
  verifiedAt?: string;
  offerTerms?: OfferTerms | null;
};

export function ComparisonBoard({ result, alternatives, horizon, verifiedAt, offerTerms }: Props) {
  const byId = new Map(alternatives.map((a) => [a.id, a]));
  const date = verifiedAt ?? alternatives[0]?.verifiedAt;
  const others = result.qualified.filter((c) => c.id !== result.bestFit?.id);

  const card = (c: RankedCandidate, variant: OptionVariant) => (
    <li key={c.id}>
      <OptionCard
        candidate={c}
        alternative={c.alternativeId ? byId.get(c.alternativeId) : undefined}
        horizon={horizon}
        variant={variant}
        offerTerms={c.isUserOffer ? offerTerms : undefined}
      />
    </li>
  );

  return (
    <section className="board" aria-labelledby="board-heading">
      <header className="board__head">
        <h2 id="board-heading" className="section-title">
          Your offer vs. verified plans
        </h2>
        <p className="board__catalog">
          Curated catalog{date ? `, verified on ${date}` : ''} · costs over {horizonLabel(horizon)}
        </p>
      </header>

      {result.noneQualifies && (
        <div className="none-qualifies" role="status">
          <p className="none-qualifies__title">No option meets all your requirements</p>
          <p>Each option below says which requirement ruled it out. Try relaxing a must-have or your budget.</p>
        </div>
      )}

      {result.bestFit && (
        <div className="board__best">
          <ul className="board__list board__list--best">{card(result.bestFit, 'best')}</ul>
        </div>
      )}

      {others.length > 0 && (
        <div className="board__group">
          <h3 className="group-title">Also meets your needs</h3>
          <ul className="board__list">{others.map((c) => card(c, 'qualified'))}</ul>
        </div>
      )}

      {result.cantConfirm.length > 0 && (
        <div className="board__group">
          <h3 className="group-title group-title--unverified">Can't confirm</h3>
          <p className="group-sub">We couldn't verify everything you asked for — these are never crowned best fit.</p>
          <ul className="board__list">{result.cantConfirm.map((c) => card(c, 'cantConfirm'))}</ul>
        </div>
      )}

      {result.excluded.length > 0 && (
        <div className="board__group">
          <h3 className="group-title group-title--excluded">Doesn't meet your needs</h3>
          <ul className="board__list">{result.excluded.map((c) => card(c, 'excluded'))}</ul>
        </div>
      )}
    </section>
  );
}
