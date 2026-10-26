import { useEffect, useRef, useState } from 'react';
import type { UnknownItem } from '../lib/unknowns';
import { groupUnknowns, questionFor } from '../lib/unknowns';
import { copyText } from './clipboard';

/** The provider question for one unknown, with its own copy button and live feedback. */
function AskQuestion({ item }: { item: UnknownItem }) {
  const question = questionFor(item);
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onCopy = async () => {
    const ok = await copyText(question);
    window.clearTimeout(timer.current);
    setState(ok ? 'copied' : 'failed');
    timer.current = window.setTimeout(() => setState('idle'), ok ? 2000 : 4000);
  };
  return (
    <div className="ask">
      <q className="ask__q">{question}</q>
      <span className="ask__actions">
        <button
          type="button"
          className="ask__btn"
          onClick={() => void onCopy()}
          aria-label={`Copy question about ${item.fact} for ${item.option}`}
        >
          Copy question
        </button>
        <span className="ask__status" aria-live="polite">
          {state === 'copied' && 'Copied ✓'}
          {state === 'failed' && 'Couldn’t copy — select the question instead'}
        </span>
      </span>
    </div>
  );
}

type Props = { items: UnknownItem[]; analyzed: boolean };

function SourceLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** "What nobody told you": every fact that is not stated (your offer) or not verified (catalog plans). */
export function UnknownsLedger({ items, analyzed }: Props) {
  const groups = groupUnknowns(items);
  const n = items.length;
  const k = groups.length;

  return (
    <section className="ledger" aria-labelledby="ledger-heading">
      <header className="ledger__head">
        <h2 id="ledger-heading" className="section-title">
          What nobody told you
        </h2>
        <p className="ledger__kicker">Ask before you pay — each gap comes with a question to send the provider.</p>
        <p className="ledger__count">
          {n === 0
            ? 'Every fact we compare was stated or verified.'
            : `${n} ${n === 1 ? 'thing' : 'things'} no one told you — across ${k} ${k === 1 ? 'option' : 'options'}`}
        </p>
        <p className="section-sub">
          {analyzed
            ? 'Facts your pasted text doesn’t state, or that we couldn’t verify on official pages. Unknown isn’t the same as “no”.'
            : 'Facts we couldn’t verify on official pages. Analyze an offer to add what its text leaves out.'}
        </p>
      </header>

      {n > 0 && (
        <div className="ledger__groups">
          {groups.map((g) => (
            <div className="ledger__group" key={g.option}>
              <h3 className="ledger__option">{g.option}</h3>
              <ul className="ledger__list">
                {g.items.map((it) => (
                  <li key={`${it.fact}-${it.detail}`} className="ledger__item">
                    <span className="ledger__mark" aria-hidden="true">
                      ?
                    </span>
                    <span className="ledger__fact">{it.fact}</span>
                    <span className="ledger__detail">
                      {it.detail}
                      {it.conflictUrl && it.sourceUrl ? (
                        <>
                          {' '}
                          (<SourceLink href={it.sourceUrl}>source 1</SourceLink>,{' '}
                          <SourceLink href={it.conflictUrl}>source 2</SourceLink>)
                        </>
                      ) : null}
                    </span>
                    <AskQuestion item={it} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
