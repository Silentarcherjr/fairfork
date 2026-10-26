import { useEffect, useMemo, useRef, useState } from 'react';
import type { Horizon } from './types/billing';
import type { Preferences } from './types/ranking';
import type { OfferTerms } from './types/terms';
import { EXAMPLE_OFFER, SECOND_EXAMPLE_OFFER } from './data/exampleOffer';
import { ALTERNATIVES, CATALOG_VERIFIED_AT } from './data/alternatives';
import { parseOffer } from './lib/parseOffer';
import { calculateBillingTimeline } from './lib/billing';
import { buildCandidates, rankOptions } from './lib/ranking';
import { todayISO } from './lib/dates';
import { OfferInput } from './components/OfferInput';
import { EvidenceText } from './components/EvidenceText';
import { TermsCard } from './components/TermsCard';
import { PressureCues } from './components/PressureCues';
import { CostTimeline, HorizonPicker } from './components/CostTimeline';
import { PreferencesPanel } from './components/PreferencesPanel';
import { ComparisonBoard } from './components/ComparisonBoard';
import { AboutData } from './components/AboutData';
import { VerdictStrip } from './components/VerdictStrip';
import { UnknownsLedger } from './components/UnknownsLedger';
import { collectUnknowns } from './lib/unknowns';
import { buildReceiptText } from './lib/receiptText';
import { realTermsChoices } from './lib/realTerms';
import type { RealTermsInfo } from './components/RealTermsLabel';

const INITIAL_PREFS: Preferences = {
  maxMonthlyBudgetMinor: null,
  mustHave: { ide: false, annualBilling: false, monthlyCancel: false },
};

type Analysis = { text: string; terms: OfferTerms };

export default function App() {
  const [text, setText] = useState(EXAMPLE_OFFER);
  const [isExample, setIsExample] = useState(true);
  const [startDate, setStartDate] = useState(() => todayISO());
  const [horizon, setHorizon] = useState<Horizon>(12);
  const [prefs, setPrefs] = useState<Preferences>(INITIAL_PREFS);
  // The text that was analyzed is kept alongside its terms so evidence offsets always match.
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  // Set while the textarea holds a real plan's verbatim catalog quotes.
  const [realInfo, setRealInfo] = useState<RealTermsInfo | null>(null);
  const realChoices = useMemo(() => realTermsChoices(ALTERNATIVES), []);
  const realOptions = useMemo(
    () => realChoices.map((c) => ({ id: c.alt.id, label: `${c.alt.provider} ${c.alt.plan}` })),
    [realChoices],
  );

  const terms = analysis?.terms ?? null;

  const timeline = useMemo(
    () => (terms ? calculateBillingTimeline(terms, startDate, horizon) : null),
    [terms, startDate, horizon],
  );
  const candidates = useMemo(
    () => buildCandidates(terms, timeline, ALTERNATIVES, startDate, horizon),
    [terms, timeline, startDate, horizon],
  );
  const rankResult = useMemo(() => rankOptions(candidates, prefs, horizon), [candidates, prefs, horizon]);

  // After an explicit Analyze, bring the verdict into view (instantly under reduced motion).
  const verdictRef = useRef<HTMLDivElement>(null);
  const [scrollRequest, setScrollRequest] = useState(0);
  useEffect(() => {
    if (scrollRequest === 0) return;
    const el = verdictRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    const reduce =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [scrollRequest]);

  const unknowns = useMemo(() => collectUnknowns(terms, ALTERNATIVES), [terms]);
  const receiptText = useMemo(
    () =>
      analysis
        ? buildReceiptText({
            terms,
            timeline,
            rankResult,
            horizon,
            startDate,
            verifiedAt: CATALOG_VERIFIED_AT,
            alternatives: ALTERNATIVES,
          })
        : '',
    [analysis, terms, timeline, rankResult, horizon, startDate],
  );

  const analyze = () => {
    if (text.trim() === '') return;
    setAnalysis({ text, terms: parseOffer(text) });
    setScrollRequest((n) => n + 1);
  };
  const clear = () => {
    setRealInfo(null);
    setText('');
    setIsExample(false);
    setAnalysis(null);
  };
  const loadSecondExample = () => {
    const next = text === SECOND_EXAMPLE_OFFER ? EXAMPLE_OFFER : SECOND_EXAMPLE_OFFER;
    setRealInfo(null);
    setText(next);
    setIsExample(true);
    setAnalysis({ text: next, terms: parseOffer(next) });
    setScrollRequest((n) => n + 1);
  };

  const tryRealTerms = (id: string) => {
    const choice = realChoices.find((c) => c.alt.id === id) ?? realChoices[0];
    if (!choice) return;
    const next = choice.realTerms.text;
    setText(next);
    setIsExample(false);
    setRealInfo({
      provider: choice.alt.provider,
      plan: choice.alt.plan,
      verifiedAt: choice.alt.verifiedAt,
      sources: choice.realTerms.sources,
    });
    setAnalysis({ text: next, terms: parseOffer(next) });
    setScrollRequest((n) => n + 1);
  };

  const isStale = analysis !== null && analysis.text !== text;

  return (
    <div className="page">
      <a className="skip-link" href="#results">
        Skip to results
      </a>
      <header className={`masthead${analysis ? ' masthead--compact' : ''}`}>
        <div className="masthead__copy">
          <p className="wordmark">
            Fair<span>Fork</span>
          </p>
          <h1 className="masthead__headline">What are you really agreeing to?</h1>
          <p className="masthead__tagline">Know the true cost. Find a better choice.</p>
          {!analysis && (
            <ol className="steps" aria-label="How it works">
              <li>
                <span className="steps__n">1</span>
                <span>
                  <span className="steps__key">Paste</span> an offer (or a screenshot)
                </span>
              </li>
              <li>
                <span className="steps__n">2</span>
                <span>
                  See the <span className="steps__key">receipt</span>
                </span>
              </li>
              <li>
                <span className="steps__n">3</span>
                <span>
                  Pick what <span className="steps__key">matters</span>
                </span>
              </li>
            </ol>
          )}
        </div>
        {!analysis && (
          <figure className="sample" aria-label="Annotated sample of a fictional offer">
            <figcaption className="sample__label">Example — fictional offer</figcaption>
            <p className="sample__text">
              Start your <span className="sample__mark">FREE 7-day trial</span> today!{' '}
              <span className="sample__pressure">Only 3 spots left.</span> Then $19.99 each month.
            </p>
            <p className="sample__note sample__note--marker">
              <span aria-hidden="true">→</span> = $239.88 in your first year
            </p>
            <p className="sample__note sample__note--red">
              <span aria-hidden="true">↑</span> pressure cue — not verified
            </p>
          </figure>
        )}
      </header>

      <main>
        <section className="intake" aria-label="Offer input">
          <OfferInput
            text={text}
            onTextChange={(t) => {
              setText(t);
              setIsExample(false);
              setRealInfo(null);
            }}
            startDate={startDate}
            onStartDateChange={(d) => setStartDate(d || todayISO())}
            onAnalyze={analyze}
            onClear={clear}
            isExample={isExample}
            onTryAnotherExample={loadSecondExample}
            realTermsOptions={realOptions}
            onTryRealTerms={tryRealTerms}
            realTerms={realInfo}
          />
        </section>

        <div id="results" tabIndex={-1} className="results-anchor">
          {analysis && timeline ? (
            <>
              {isStale && (
                <p className="stale-note" role="status">
                  You've edited the text since the last analysis. Click <strong>Analyze offer</strong> to update the
                  results.
                </p>
              )}
              <div className="results-top">
                <div ref={verdictRef} className="verdict-anchor">
                  <VerdictStrip
                    timeline={timeline}
                    result={rankResult}
                    horizon={horizon}
                    startDate={startDate}
                    receiptText={receiptText}
                  />
                </div>
                <div className="analysis__cost">
                  <CostTimeline timeline={timeline} horizon={horizon} onHorizonChange={setHorizon} startDate={startDate} />
                </div>
              </div>
              <div className="analysis">
                <section className="analysis__text evidence-card" aria-label="Your offer text with highlights">
                  <EvidenceText text={analysis.text} terms={analysis.terms} />
                  <PressureCues cues={analysis.terms.pressureCues} />
                </section>
                <div className="analysis__terms">
                  <TermsCard terms={analysis.terms} />
                </div>
              </div>
            </>
          ) : (
            <div className="empty-results">
              <p className="empty-results__title">
                Click <strong>Analyze offer</strong> to see the fine print, every charge date, and the true cost.
              </p>
              <p className="hint">
                The verified plans below are ready for comparison — your offer joins them once analyzed.
              </p>
              <div className="empty-results__horizon">
                <span className="field-label field-label--small">Compare costs over</span>
                <HorizonPicker horizon={horizon} onHorizonChange={setHorizon} />
              </div>
            </div>
          )}

          <div className="compare" id="comparison" tabIndex={-1}>
            <div className="compare__rail">
              <PreferencesPanel prefs={prefs} onChange={setPrefs} />
            </div>
            <ComparisonBoard
              result={rankResult}
              alternatives={ALTERNATIVES}
              horizon={horizon}
              verifiedAt={CATALOG_VERIFIED_AT}
              offerTerms={terms}
            />
          </div>

          <UnknownsLedger items={unknowns} analyzed={analysis !== null} />
        </div>
      </main>

      <AboutData verifiedAt={CATALOG_VERIFIED_AT} />
    </div>
  );
}
