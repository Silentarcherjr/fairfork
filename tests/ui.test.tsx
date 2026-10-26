// Agent D — adversarial QA: the rendered App via @testing-library/react.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../src/App';
import { EXAMPLE_OFFER } from '../src/data/exampleOffer';

const START = '2026-11-01';

function renderApp() {
  return render(<App />);
}

function typeOffer(text: string) {
  fireEvent.change(screen.getByLabelText('Paste the offer text'), { target: { value: text } });
}

function setStart(date: string) {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: date } });
}

function analyze() {
  fireEvent.click(screen.getByRole('button', { name: 'Analyze offer' }));
}

function analyzeText(text: string, start = START) {
  const utils = renderApp();
  typeOffer(text);
  setStart(start);
  analyze();
  return utils;
}

const costSection = (c: HTMLElement) => c.querySelector('section.cost') as HTMLElement;
const bestFitTitle = (c: HTMLElement) => c.querySelector('.board__list--best .option__title')?.textContent ?? null;
const userCard = (c: HTMLElement) => c.querySelector('article.option--offer') as HTMLElement | null;
const setMustHave = (label: string, checked: boolean) => {
  const box = screen.getByRole('checkbox', { name: label }) as HTMLInputElement;
  if (box.checked !== checked) fireEvent.click(box);
};
const setBudget = (v: string) => fireEvent.change(screen.getByLabelText('Monthly budget (USD)'), { target: { value: v } });

describe('first use and states', () => {
  it('shows the headline, the fictional-example label and the invitation to analyze', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What are you really agreeing to?');
    expect(screen.getByText('Example — fictional offer, not a real provider')).toBeInTheDocument();
    expect((screen.getByLabelText('Paste the offer text') as HTMLTextAreaElement).value).toBe(EXAMPLE_OFFER);
    expect(screen.getAllByText(/Analyze offer/).length).toBeGreaterThan(1);
  });

  it('empty / whitespace input: "Paste an offer to analyze", Analyze is disabled and nothing renders', () => {
    const { container } = renderApp();
    typeOffer('   \n  ');
    expect(screen.getByText('Paste an offer to analyze')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze offer' })).toBeDisabled();
    fireEvent.submit(container.querySelector('form')!);
    expect(costSection(container)).toBeNull();
  });

  it('Clear empties the text and results immediately', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    expect(costSection(container)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect((screen.getByLabelText('Paste the offer text') as HTMLTextAreaElement).value).toBe('');
    expect(costSection(container)).toBeNull();
    expect(userCard(container)).toBeNull();
  });

  it('nothing recognizable: every term "Not found", cost Unknown, alternatives still listed', () => {
    const { container } = analyzeText('hello world, this is just some words');
    const missing = container.querySelectorAll('.terms-row__missing');
    expect(missing.length).toBe(container.querySelectorAll('.terms-row').length);
    expect(costSection(container)).toHaveTextContent(/Unknown\s*—\s*price not found/i);
    expect(container.querySelectorAll('article.option:not(.option--offer)').length).toBeGreaterThanOrEqual(3);
  });
});

describe('true cost', () => {
  it('7-day trial, $19.99/month, renews → first charge Nov 8 with the explicit assumption', () => {
    const { container } = analyzeText('7-day trial, then $19.99/month, renews automatically');
    const cost = costSection(container);
    expect(within(cost).getByText('First charge').parentElement).toHaveTextContent('Nov 8, 2026');
    expect(cost).toHaveTextContent("assuming you don't cancel");
    expect(cost).toHaveTextContent("Assuming you don't cancel before each charge.");
    expect(cost.querySelector('.cost__total')).toHaveTextContent('$239.88');
    expect(cost.querySelectorAll('.charges__item')).toHaveLength(12);
  });

  it('horizon buttons update the total and charge list instantly, with aria-pressed', () => {
    const { container } = analyzeText('7-day trial, then $19.99/month, renews automatically');
    const cost = costSection(container);
    const btn3 = within(cost).getByRole('button', { name: '3 months' });
    fireEvent.click(btn3);
    expect(btn3).toHaveAttribute('aria-pressed', 'true');
    expect(within(cost).getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'false');
    expect(cost.querySelector('.cost__total')).toHaveTextContent('$59.97');
    expect(cost.querySelectorAll('.charges__item')).toHaveLength(3);
    fireEvent.click(within(cost).getByRole('button', { name: '1 month' }));
    expect(cost.querySelector('.cost__total')).toHaveTextContent('$19.99');
  });

  it('changing $19.99 → $29.99 and re-analyzing changes every total (cost + Your offer card)', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    expect(costSection(container).querySelector('.cost__total')).toHaveTextContent('$239.88');
    expect(userCard(container)!.querySelector('.option__horizon')).toHaveTextContent('$239.88');
    typeOffer(EXAMPLE_OFFER.replace('$19.99', '$29.99'));
    expect(screen.getByText(/edited the text since the last analysis/)).toBeInTheDocument();
    analyze();
    expect(costSection(container).querySelector('.cost__total')).toHaveTextContent('$359.88');
    expect(userCard(container)!.querySelector('.option__horizon')).toHaveTextContent('$359.88');
    expect(userCard(container)!.querySelector('.option__price')).toHaveTextContent('$29.99');
    expect(container.textContent).not.toContain('$239.88');
  });

  it('no price → "Unknown — price not found", never "$0.00" in the cost section or Your offer card', () => {
    const { container } = analyzeText('Start your 7-day free trial. Renews automatically. Get it for $0 today.');
    const cost = costSection(container);
    expect(cost).toHaveTextContent(/Unknown\s*—\s*price not found/i);
    expect(cost.textContent).not.toMatch(/\$0(\.00)?\b/);
    const card = userCard(container)!;
    expect(card.textContent).not.toContain('$0.00');
    expect(card.querySelector('.option__horizon')).toHaveTextContent('Unknown');
    expect(card.querySelector('.option__price')).toHaveTextContent('Unknown');
  });

  it('no trial → no 7-day default: trial "Not found", first charge on the start date', () => {
    const { container } = analyzeText('$19.99/month, renews automatically.');
    const trialRow = [...container.querySelectorAll('.terms-row')].find((r) => r.querySelector('dt')?.textContent === 'Free trial')!;
    expect(trialRow).toHaveTextContent('Not found in the text');
    const cost = costSection(container);
    expect(within(cost).getByText('First charge').parentElement).toHaveTextContent('Nov 1, 2026');
    expect(cost).toHaveTextContent('No trial found in the text');
    expect(container.textContent).not.toMatch(/7[- ]day|7 days/);
  });

  it('€9/month shows euro amounts; a USD budget sends it to "Can\'t confirm", not cheaper than USD plans', () => {
    const { container } = analyzeText('€9/month, renews automatically.');
    expect(costSection(container).querySelector('.cost__total')).toHaveTextContent('€108.00');
    expect(costSection(container).textContent).not.toContain('$');
    setBudget('50');
    const card = userCard(container)!;
    expect(card.querySelector('.badge')).toHaveTextContent("Can't confirm");
    expect(card).toHaveTextContent(/not comparable.*EUR/i);
    expect(bestFitTitle(container)).not.toBe('Your offer');
  });

  it('a yearly offer is labeled as annual upfront, not as a monthly price', () => {
    const { container } = analyzeText('$240 per year, renews automatically.');
    expect(costSection(container).querySelectorAll('.charges__item')).toHaveLength(1);
    expect(userCard(container)!.querySelector('.option__price')).toHaveTextContent(/billed \$240\.00 upfront/);
    expect(userCard(container)!.querySelector('.option__price')).toHaveTextContent('/mo equivalent');
  });
});

describe('fine print, highlights and pressure cues', () => {
  it('every rendered <mark> text exists literally in the input, and each found term quote is highlighted', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    const marks = [...container.querySelectorAll('mark')];
    expect(marks.length).toBeGreaterThan(3);
    for (const m of marks) expect(EXAMPLE_OFFER).toContain(m.textContent!);
    expect(container.querySelector('.evidence-text__body')!.textContent).toBe(EXAMPLE_OFFER);
    const markText = marks.map((m) => m.textContent).join('\u0000');
    for (const q of container.querySelectorAll('.terms-card .clip__quote')) {
      const quote = q.textContent!.replace(/^“|”$/g, '');
      expect(EXAMPLE_OFFER).toContain(quote);
      expect(markText.includes(quote) || marks.some((m) => m.textContent!.includes(quote))).toBe(true);
    }
  });

  it('"only 3 left" is labeled as an unverified pressure cue; no "lie"/"scam"/"fraud" anywhere', () => {
    const { container } = analyzeText('Pro plan $10/month. Only 3 left at this price!');
    expect(screen.getByText(/Potential pressure cue — not verified/)).toBeInTheDocument();
    expect(container.querySelector('mark.ev-mark--pressure')).toHaveTextContent('Only 3 left');
    expect(document.body.textContent).not.toMatch(/\b(lie|lies|lying|liar|scam\w*|fraud\w*)\b/i);
    for (const el of document.body.querySelectorAll('[title],[aria-label]')) {
      const s = `${el.getAttribute('title') ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
      expect(s).not.toMatch(/\b(lie|scam|fraud)\w*\b/i);
    }
  });

  it('neutral text → "No pressure cues detected", no pressure highlights', () => {
    const { container } = analyzeText('Pro plan $10/month. Works in VS Code. Cancel anytime.');
    expect(screen.getByText('No pressure cues detected in the text.')).toBeInTheDocument();
    expect(container.querySelector('.ev-mark--pressure')).toBeNull();
    expect(container.querySelector('.pressure__item')).toBeNull();
  });

  it('pasted HTML/script is rendered as inert text: no img/script elements are created', () => {
    const payload = '<img src=x onerror=alert(1)><script>alert(1)</script> $10/month';
    const before = document.querySelectorAll('img, script').length;
    const { container } = analyzeText(payload);
    expect(document.querySelectorAll('img, script').length).toBe(before);
    expect(container.querySelector('img, script, iframe')).toBeNull();
    expect(container.querySelector('.evidence-text__body')!.textContent).toBe(payload);
    expect(container.innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('comparison board', () => {
  it('every catalog card links to an https official page and shows "Verified on"', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    const cards = [...container.querySelectorAll('article.option:not(.option--offer)')];
    expect(cards.length).toBeGreaterThanOrEqual(4); // 3 plans, Claude has monthly + annual
    const titles = cards.map((c) => c.querySelector('.option__title')!.textContent).join(' | ');
    for (const name of ['Copilot Pro', 'Claude Pro', 'Devin']) expect(titles).toContain(name);
    for (const card of cards) {
      const official = within(card as HTMLElement).getByRole('link', { name: /Official pricing page/ });
      expect(official.getAttribute('href')).toMatch(/^https:\/\//);
      expect(official).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(card).toHaveTextContent('Verified on 2026-10-26');
      for (const a of card.querySelectorAll('a')) expect(a.getAttribute('href')).toMatch(/^https:\/\//);
    }
  });

  it('labels the section "Curated catalog, verified on …" and never claims "live"', () => {
    renderApp();
    expect(screen.getByText(/Curated catalog, verified on 2026-10-26/)).toBeInTheDocument();
    const text = document.body.textContent!;
    expect(text).not.toMatch(/(?<!not a )\blive\s+(search|prices?|pricing|data|results?|feed)\b/i);
    // Any other "live" must be the negation "not a live …".
    for (const m of text.matchAll(/\blive\b/gi)) {
      expect(text.slice(Math.max(0, m.index! - 6), m.index)).toMatch(/not a $/i);
    }
  });

  it('annual price shows "upfront" and a labeled per-month equivalent', () => {
    const { container } = renderApp();
    const annual = [...container.querySelectorAll('article.option')].find((a) =>
      a.querySelector('.option__title')!.textContent!.includes('Claude Pro — annual'),
    )!;
    const price = annual.querySelector('.option__price')!;
    expect(price).toHaveTextContent('billed $200.00 upfront');
    expect(price).toHaveTextContent('$16.67/mo equivalent');
    expect(price).toHaveTextContent('≈ $16.67/mo');
  });

  it('features use three distinct looks; your offer says "not stated in the pasted text"', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    expect(container.querySelector('.feat--yes')).not.toBeNull();
    expect(container.querySelector('.feat--no')).not.toBeNull();
    expect(container.querySelector('.feat--unverified')).not.toBeNull();
    expect(userCard(container)).toHaveTextContent('Not verified (not stated in the pasted text)');
    expect(userCard(container)).toHaveTextContent('according to the pasted text');
  });

  it('conflicting official refund sources are shown with both links', () => {
    renderApp();
    const conflict = screen.getAllByText('Conflicting sources')[0].closest('dd')!;
    expect(within(conflict).getAllByRole('link')).toHaveLength(2);
  });

  it('toggling must-haves changes the Best fit (annual → Claude Pro annual; IDE → Copilot Pro)', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    setMustHave('Annual billing', true);
    expect(bestFitTitle(container)).toBe('Anthropic Claude Pro — annual');
    expect(container.querySelector('.board__list--best .badge')).toHaveTextContent('Best fit');
    expect(container.querySelector('.board__list--best')).toHaveTextContent('Lowest cost over 12 months among options that meet: Annual billing');
    setMustHave('Annual billing', false);
    setMustHave('IDE integration', true);
    expect(bestFitTitle(container)).toBe('GitHub Copilot Pro — monthly');
    // Devin's IDE support is unverified → Can't confirm with an explicit reason.
    expect(screen.getAllByText("We couldn't verify IDE integration").length).toBeGreaterThan(0);
  });

  it('impossible budget ($1) → "No option meets all your requirements" and no Best fit badge', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    setBudget('1');
    expect(screen.getByText('No option meets all your requirements')).toBeInTheDocument();
    expect(container.querySelector('.board__list--best')).toBeNull();
    expect(container.querySelector('.badge--best')).toBeNull();
    expect(screen.queryByText('Best fit')).toBeNull();
    for (const card of container.querySelectorAll('article.option')) {
      expect(card.querySelector('.option__reasons li')).not.toBeNull();
    }
  });
});

describe('accessibility and boundaries', () => {
  it('every element with a React event handler is a native control or focusable', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    const NATIVE = new Set(['BUTTON', 'INPUT', 'A', 'TEXTAREA', 'SELECT', 'FORM', 'SUMMARY']);
    const HANDLERS = ['onClick', 'onKeyDown', 'onKeyUp', 'onMouseDown', 'onChange', 'onInput', 'onSubmit', 'onPointerDown'];
    let checked = 0;
    for (const el of container.querySelectorAll('*')) {
      const key = Object.keys(el).find((k) => k.startsWith('__reactProps$'));
      if (!key) continue;
      const props = (el as unknown as Record<string, Record<string, unknown>>)[key];
      if (!HANDLERS.some((h) => typeof props[h] === 'function')) continue;
      checked++;
      const ok = NATIVE.has(el.tagName) || (el as HTMLElement).tabIndex >= 0;
      expect(ok, `${el.tagName}.${el.className} has a handler but is not keyboard-reachable`).toBe(true);
    }
    expect(checked).toBeGreaterThan(5);
    expect(container.querySelector('[onclick]')).toBeNull();
    // Buttons are real buttons with a type; links have an href.
    for (const b of container.querySelectorAll('button')) expect(b.getAttribute('type')).toMatch(/^(button|submit)$/);
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href')).toBeTruthy();
  });

  it('horizon buttons expose aria-pressed (exactly one pressed per group)', () => {
    const { container } = analyzeText(EXAMPLE_OFFER);
    const groups = container.querySelectorAll('[role="group"][aria-label="Cost horizon"]');
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      const btns = [...g.querySelectorAll('button')];
      expect(btns).toHaveLength(4);
      for (const b of btns) expect(b).toHaveAttribute('aria-pressed');
      expect(btns.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    }
  });

  it('every form control has an accessible name', () => {
    renderApp();
    for (const el of document.querySelectorAll('input, textarea, button, select')) {
      const id = el.getAttribute('id');
      const hasLabel =
        (id && document.querySelector(`label[for="${id}"]`)) ||
        el.closest('label') ||
        el.getAttribute('aria-label') ||
        (el.tagName === 'BUTTON' && el.textContent!.trim());
      expect(hasLabel, el.outerHTML).toBeTruthy();
    }
  });

  describe('no login, works offline', () => {
    const realFetch = globalThis.fetch;
    let fetchSpy: ReturnType<typeof vi.fn>;
    let xhrSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      fetchSpy = vi.fn(() => Promise.reject(new Error('offline')));
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
      xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    });
    afterEach(() => {
      globalThis.fetch = realFetch;
      xhrSpy.mockRestore();
    });

    it('renders, analyzes and re-ranks with no network calls and no sign-in', () => {
      const { container } = analyzeText(EXAMPLE_OFFER);
      setMustHave('Annual billing', true);
      setBudget('25');
      fireEvent.click(within(costSection(container)).getByRole('button', { name: '6 months' }));
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(document.body.textContent).not.toMatch(/\b(sign in|log in|login|sign up|password)\b/i);
      expect(container.querySelector('input[type="password"], input[type="email"]')).toBeNull();
    });
  });
});
