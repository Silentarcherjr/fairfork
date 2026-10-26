import { useMemo, useState } from 'react';
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

  const analyze = () => {
    if (text.trim() === '') return;
    setAnalysis({ text, terms: parseOffer(text) });
  };
  const clear = () => {
    setText('');
    setIsExample(false);
    setAnalysis(null);
  };
  const loadSecondExample = () => {
    const next = text === SECOND_EXAMPLE_OFFER ? EXAMPLE_OFFER : SECOND_EXAMPLE_OFFER;
    setText(next);
    setIsExample(true);
    setAnalysis({ text: next, terms: parseOffer(next) });
  };

  const isStale = analysis !== null && analysis.text !== text;

  return (
    <div className="page">
      <a className="skip-link" href="#results">
        Skip to results
      </a>
      <header className="masthead">
        <p className="wordmark">
          Fair<span>Fork</span>
        </p>
        <h1 className="masthead__headline">What are you really agreeing to?</h1>
        <p className="masthead__tagline">Know the true cost. Find a better choice.</p>
      </header>

      <main>
        <section className="intake" aria-label="Offer input">
          <OfferInput
            text={text}
            onTextChange={(t) => {
              setText(t);
              setIsExample(false);
            }}
            startDate={startDate}
            onStartDateChange={(d) => setStartDate(d || todayISO())}
            onAnalyze={analyze}
            onClear={clear}
            isExample={isExample}
            onTryAnotherExample={loadSecondExample}
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
              <div className="analysis">
                <div className="analysis__cost">
                  <CostTimeline timeline={timeline} horizon={horizon} onHorizonChange={setHorizon} />
                </div>
                <div className="analysis__text">
                  <section className="card evidence-card" aria-label="Your offer text with highlights">
                    <EvidenceText text={analysis.text} terms={analysis.terms} />
                    <PressureCues cues={analysis.terms.pressureCues} />
                  </section>
                  <TermsCard terms={analysis.terms} />
                </div>
              </div>
            </>
          ) : (
            <div className="empty-results">
              <p className="empty-results__eyebrow">Results appear here</p>
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

          <div className="compare">
            <PreferencesPanel prefs={prefs} onChange={setPrefs} />
            <ComparisonBoard
              result={rankResult}
              alternatives={ALTERNATIVES}
              horizon={horizon}
              verifiedAt={CATALOG_VERIFIED_AT}
              offerTerms={terms}
            />
          </div>
        </div>
      </main>

      <AboutData verifiedAt={CATALOG_VERIFIED_AT} />
    </div>
  );
}
