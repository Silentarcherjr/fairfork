import type { PressureCue } from '../types/terms';

type Props = { cues: PressureCue[] };

export function PressureCues({ cues }: Props) {
  if (cues.length === 0) {
    return <p className="pressure-none">No pressure cues detected in the text.</p>;
  }
  return (
    <section className="pressure" aria-labelledby="pressure-heading">
      <h3 id="pressure-heading" className="pressure__title">
        Potential pressure cues
      </h3>
      <ul className="pressure__list">
        {cues.map((cue, i) => (
          <li key={`${cue.evidence.start}-${i}`} className="pressure__item">
            <span className="pressure__kind">
              {cue.kind === 'scarcity' ? 'Scarcity' : 'Urgency'} · Potential pressure cue — not verified
            </span>
            <blockquote className="clip clip--pressure">
              <span className="clip__label">from your text</span>
              <span className="clip__quote">“{cue.evidence.quote}”</span>
            </blockquote>
          </li>
        ))}
      </ul>
      <p className="hint">
        Phrases like these are often used to rush a decision. FairFork cannot check whether they are true.
      </p>
    </section>
  );
}
