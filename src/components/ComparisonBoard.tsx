import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
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

const FLIP_MS = 250;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : true;
}

/**
 * FLIP: remember where each card was (relative to the board, so page scrolling doesn't matter),
 * and after a re-rank slide each card from its old spot to its new one.
 */
function useFlip(rootRef: RefObject<HTMLElement>, trigger: unknown) {
  const prev = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const origin = root.getBoundingClientRect();
    const nodes = root.querySelectorAll<HTMLElement>('[data-flip-id]');
    const next = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => {
      // Measure without any in-flight transform.
      n.style.transition = 'none';
      n.style.transform = '';
      const r = n.getBoundingClientRect();
      next.set(n.dataset.flipId!, { x: r.left - origin.left, y: r.top - origin.top });
    });
    if (!prefersReducedMotion() && prev.current.size > 0) {
      nodes.forEach((n) => {
        const before = prev.current.get(n.dataset.flipId!);
        const after = next.get(n.dataset.flipId!);
        if (!before || !after) return;
        const dx = before.x - after.x;
        const dy = before.y - after.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        n.style.transform = `translate(${dx}px, ${dy}px)`;
        void n.offsetWidth; // commit the inverted position
        n.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.2, 0, 0, 1)`;
        n.style.transform = '';
      });
    }
    prev.current = next;
  }, [rootRef, trigger]);
}

export function ComparisonBoard({ result, alternatives, horizon, verifiedAt, offerTerms }: Props) {
  const byId = new Map(alternatives.map((a) => [a.id, a]));
  const date = verifiedAt ?? alternatives[0]?.verifiedAt;
  const others = result.qualified.filter((c) => c.id !== result.bestFit?.id);
  const rootRef = useRef<HTMLElement>(null);
  useFlip(rootRef, result);

  // Briefly highlight the badge when a different option becomes Best fit.
  const bestId = result.bestFit?.id ?? null;
  const lastBest = useRef<string | null | undefined>(undefined);
  const [crownedId, setCrownedId] = useState<string | null>(null);
  useEffect(() => {
    const previous = lastBest.current;
    lastBest.current = bestId;
    if (previous === undefined || previous === bestId || bestId === null) return;
    setCrownedId(bestId);
    const t = window.setTimeout(() => setCrownedId(null), 1200);
    return () => window.clearTimeout(t);
  }, [bestId]);

  const card = (c: RankedCandidate, variant: OptionVariant) => (
    <li key={c.id} data-flip-id={c.id} className="board__item">
      <OptionCard
        candidate={c}
        alternative={c.alternativeId ? byId.get(c.alternativeId) : undefined}
        horizon={horizon}
        variant={variant}
        offerTerms={c.isUserOffer ? offerTerms : undefined}
        crowned={variant === 'best' && c.id === crownedId}
      />
    </li>
  );

  return (
    <section className="board" aria-labelledby="board-heading" ref={rootRef}>
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

      {result.qualified.length > 0 && (
        <div className="board__group board__group--qualified">
          <h3 className="sr-only">Meets your needs</h3>
          <ul className={`board__list${result.bestFit ? ' board__list--best' : ''}`}>
            {result.bestFit && card(result.bestFit, 'best')}
            {others.map((c) => card(c, 'qualified'))}
          </ul>
        </div>
      )}

      {result.cantConfirm.length > 0 && (
        <div className="board__group board__group--muted">
          <h3 className="group-title group-title--unverified">Can't confirm</h3>
          <p className="group-sub">We couldn't verify everything you asked for — these are never crowned best fit.</p>
          <ul className="board__list">{result.cantConfirm.map((c) => card(c, 'cantConfirm'))}</ul>
        </div>
      )}

      {result.excluded.length > 0 && (
        <div className="board__group board__group--muted">
          <h3 className="group-title group-title--excluded">Doesn't meet your needs</h3>
          <ul className="board__list">{result.excluded.map((c) => card(c, 'excluded'))}</ul>
        </div>
      )}
    </section>
  );
}
