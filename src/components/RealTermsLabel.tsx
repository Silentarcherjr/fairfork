import type { RealTermsSource } from '../lib/realTerms';

export type RealTermsInfo = { provider: string; plan: string; verifiedAt: string; sources: RealTermsSource[] };

/** Label shown when the textarea holds verbatim quotes from a real plan's official pages. */
export function RealTermsLabel({ info }: { info: RealTermsInfo }) {
  return (
    <div className="real-label" id="real-terms-label">
      <p className="real-label__line">
        <span className="real-label__tag">Real terms</span> — verbatim quotes from {info.provider} official pages
        ({info.plan}), verified on {info.verifiedAt}
      </p>
      <ul className="real-label__sources" aria-label="Official sources">
        {info.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
