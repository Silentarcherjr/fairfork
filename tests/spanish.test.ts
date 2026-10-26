import { describe, it, expect } from 'vitest';
import { parseOffer } from '../src/lib/parseOffer';
import { calculateBillingTimeline } from '../src/lib/billing';
import type { Evidence, OfferTerms } from '../src/types/terms';

function allEvidence(t: OfferTerms): Evidence[] {
  const out: Evidence[] = [];
  const fields = [t.trialDays, t.price, t.billingPeriod, t.autoRenew, t.cancellation, t.refund, ...Object.values(t.features)];
  for (const f of fields) if (f.status === 'found') out.push(f.evidence);
  for (const c of t.pressureCues) out.push(c.evidence);
  return out;
}

function expectEvidenceExact(text: string, t: OfferTerms) {
  for (const e of allEvidence(t)) {
    expect(text.slice(e.start, e.end)).toBe(e.quote);
    expect(e.quote.length).toBeGreaterThan(0);
  }
}

const ES_OFFER =
  'CodePilot Max — ¡Empieza tu prueba GRATIS de 7 días hoy! Solo quedan 3 lugares a este precio. ' +
  'Funciona en VS Code. Después de siete días, tu plan se renueva automáticamente por $19,99 al mes hasta que lo canceles. ' +
  'Puedes cancelar cuando quieras. Los pagos no son reembolsables.';

describe('parseOffer — full Spanish offer', () => {
  const t = parseOffer(ES_OFFER);

  it('extracts the core terms', () => {
    expect(t.trialDays).toMatchObject({ status: 'found', value: 7, evidence: { quote: 'prueba GRATIS de 7 días' } });
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: 1999, currency: 'USD' }, evidence: { quote: '$19,99' } });
    expect(t.billingPeriod).toMatchObject({ status: 'found', value: 'month', evidence: { quote: 'al mes' } });
    expect(t.autoRenew).toMatchObject({ status: 'found', value: true, evidence: { quote: 'se renueva automáticamente' } });
  });

  it('extracts cancellation, refund and features', () => {
    expect(t.cancellation).toMatchObject({ status: 'found', value: 'Puedes cancelar cuando quieras.' });
    expect(t.refund).toMatchObject({ status: 'found', value: 'Los pagos no son reembolsables.' });
    expect(t.features.ide).toMatchObject({ status: 'found', value: true });
    expect(t.features.monthlyCancel).toMatchObject({ status: 'found', value: true, evidence: { quote: 'cancelar cuando quieras' } });
    expect(t.features.annualBilling.status).toBe('not_found');
  });

  it('finds the scarcity cue and nothing else', () => {
    expect(t.pressureCues).toHaveLength(1);
    expect(t.pressureCues[0]).toMatchObject({ kind: 'scarcity', evidence: { quote: 'Solo quedan 3 lugares' } });
  });

  it('every evidence slice equals its quote', () => {
    expectEvidenceExact(ES_OFFER, t);
  });

  it('feeds the billing calculator like the English example', () => {
    const tl = calculateBillingTimeline(t, '2026-10-26', 12);
    if (tl.status !== 'known') throw new Error('expected known');
    expect(tl.firstChargeDate).toBe('2026-11-02');
    expect(tl.totalMinor).toBe(23988);
  });
});

describe('parseOffer — Spanish trials', () => {
  it.each([
    ['prueba gratis de 7 días', 7],
    ['Prueba gratuita de siete días', 7],
    ['período de prueba de 14 días', 14],
    ['periodo de prueba de catorce dias', 14],
    ['7 días gratis', 7],
    ['los primeros 30 días gratis', 30],
    ['Disfruta quince días gratis', 15],
    ['Empieza gratis. Después de treinta días pagas.', 30],
    ['veintiuno días de prueba', 21],
  ])('%s → %i', (text, days) => {
    const t = parseOffer(text);
    expect(t.trialDays).toMatchObject({ status: 'found', value: days });
    expectEvidenceExact(text, t);
  });

  it('"Después de 7 días" without prueba/gratis is not a trial', () => {
    expect(parseOffer('Después de 7 días te cobramos $10 al mes.').trialDays.status).toBe('not_found');
  });

  it('no trial wording → not_found', () => {
    expect(parseOffer('Plan Pro: $12 al mes.').trialDays.status).toBe('not_found');
  });
});

describe('parseOffer — Spanish prices and periods', () => {
  it.each([
    ['Pro: 17 $ al mes', 1700, 'USD', 'month', 'al mes'],
    ['Pro: 17 US$ al mes', 1700, 'USD', 'month', 'al mes'],
    ['Plan: 19,99 € al mes', 1999, 'EUR', 'month', 'al mes'],
    ['US$19.99 por mes', 1999, 'USD', 'month', 'por mes'],
    ['19.99 USD mensuales', 1999, 'USD', 'month', 'mensuales'],
    ['USD 19.99 cada mes', 1999, 'USD', 'month', 'cada mes'],
    ['$9/mes', 900, 'USD', 'month', '/mes'],
    ['$240 al año', 24000, 'USD', 'year', 'al año'],
    ['$240 por año', 24000, 'USD', 'year', 'por año'],
    ['240 € anuales', 24000, 'EUR', 'year', 'anuales'],
    ['1.200 € al año', 120000, 'EUR', 'year', 'al año'],
    ['Plan anual: 200 US$ facturado anualmente', 20000, 'USD', 'year', 'facturado anualmente'],
  ])('%s', (text, minor, currency, period, periodQuote) => {
    const t = parseOffer(text);
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: minor, currency } });
    expect(t.billingPeriod).toMatchObject({ status: 'found', value: period, evidence: { quote: periodQuote } });
    expectEvidenceExact(text, t);
  });

  it('"Plan anual … facturado anualmente" marks annual billing', () => {
    const t = parseOffer('Plan anual: 200 US$ facturado anualmente');
    expect(t.features.annualBilling).toMatchObject({ status: 'found', value: true });
  });

  it('per-month price billed annually becomes the yearly charge', () => {
    const text = 'Pro: $16 al mes, facturado anualmente.';
    const t = parseOffer(text);
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: 19200, currency: 'USD' } });
    expect(t.billingPeriod).toMatchObject({ status: 'found', value: 'year' });
    expectEvidenceExact(text, t);
  });

  it('"$0 hoy" is not the plan price', () => {
    expect(parseOffer('Acceso completo por $0 hoy.').price.status).toBe('not_found');
    const t = parseOffer('Acceso completo por $0 hoy. Luego $10 al mes.');
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: 1000 } });
  });

  it('"gratis hoy" alone → no price', () => {
    expect(parseOffer('¡Empieza gratis hoy!').price.status).toBe('not_found');
  });
});

describe('parseOffer — Spanish renewal, cancellation, refund', () => {
  it.each([
    ['Tu plan se renueva automáticamente.', true],
    ['Incluye renovación automática.', true],
    ['El plan renueva automaticamente cada mes.', true],
    ['Este plan no se renueva.', false],
    ['Sin renovación automática.', false],
    ['No se renueva automáticamente.', false],
  ])('%s', (text, value) => {
    const t = parseOffer(text);
    expect(t.autoRenew).toMatchObject({ status: 'found', value });
    expectEvidenceExact(text, t);
  });

  it('cancellation sentences', () => {
    expect(parseOffer('Cancela en cualquier momento.').cancellation).toMatchObject({ status: 'found', value: 'Cancela en cualquier momento.' });
    expect(parseOffer('La cancelación es inmediata.').cancellation.status).toBe('found');
  });

  it('"cancela cuando quieras" + monthly → monthlyCancel', () => {
    expect(parseOffer('$10 al mes. Cancela cuando quieras.').features.monthlyCancel).toMatchObject({ status: 'found', value: true });
    expect(parseOffer('$100 al año. Cancela cuando quieras.').features.monthlyCancel.status).toBe('not_found');
  });

  it.each([
    'Reembolso completo en 30 días.',
    'El plan no es reembolsable.',
    'Garantía de devolución de 14 días.',
  ])('refund: %s', (text) => {
    expect(parseOffer(text).refund).toMatchObject({ status: 'found', value: text });
  });
});

describe('parseOffer — Spanish pressure cues', () => {
  it('detects scarcity and urgency with exact offsets', () => {
    const text =
      '¡Date prisa! Solo hoy. Sólo quedan cinco plazas. Quedan pocos cupos. Últimas plazas. ' +
      'Termina esta noche. Última oportunidad. Oferta por tiempo limitado.';
    const t = parseOffer(text);
    expect(t.pressureCues.map((c) => `${c.kind}:${c.evidence.quote}`)).toEqual([
      'urgency:Date prisa',
      'urgency:Solo hoy',
      'scarcity:Sólo quedan cinco plazas',
      'scarcity:Quedan pocos cupos',
      'scarcity:Últimas plazas',
      'urgency:Termina esta noche',
      'urgency:Última oportunidad',
      'urgency:Oferta por tiempo limitado',
    ]);
    expectEvidenceExact(text, t);
  });

  it('"Sin prisa, sin presión" → no cues', () => {
    const t = parseOffer('Sin prisa, sin presión. $10 al mes');
    expect(t.pressureCues).toEqual([]);
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: 1000 } });
  });

  it('neutral Spanish text → no cues', () => {
    expect(parseOffer('Un asistente de código por $10 al mes. Puedes cancelar desde la configuración.').pressureCues).toEqual([]);
  });
});
