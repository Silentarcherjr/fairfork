import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { normalizeOcrText } from '../src/lib/ocr';

vi.mock('../src/lib/ocr', async (orig) => {
  const actual = await orig<typeof import('../src/lib/ocr')>();
  return {
    ...actual,
    readTextFromImage: vi.fn(async () => 'Acme AI: 7-day free trial, then $12/month. Renews automatically.'),
  };
});

function pickFile(file: File) {
  const input = document.querySelector('input[type=file]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe('Screenshot import (beta)', () => {
  it('fills the text box for review without analyzing it', async () => {
    render(<App />);
    pickFile(new File(['x'], 'offer.png', { type: 'image/png' }));
    await waitFor(() =>
      expect((screen.getByLabelText(/paste the offer text/i) as HTMLTextAreaElement).value).toMatch(/\$12\/month/),
    );
    expect(screen.getByText(/check it against the screenshot before analyzing/i)).toBeInTheDocument();
    expect(screen.queryByText(/fictional offer, not a real provider/i)).not.toBeInTheDocument();
    expect(screen.queryByText('$144.00')).not.toBeInTheDocument();
  });

  it('rejects non-images and keeps the existing text', async () => {
    render(<App />);
    const before = (screen.getByLabelText(/paste the offer text/i) as HTMLTextAreaElement).value;
    pickFile(new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText(/not an image/i)).toBeInTheDocument();
    expect((screen.getByLabelText(/paste the offer text/i) as HTMLTextAreaElement).value).toBe(before);
  });

  it('re-joins price digits split by OCR', () => {
    expect(normalizeOcrText('$1 0 usD\nper user / month')).toBe('$10 USD\nper user / month');
  });

  it('normalizes OCR text without changing words', () => {
    expect(normalizeOcrText('  Only   3 spots   left\n\n “FREE” trial ’ok’ ')).toBe('Only 3 spots left\n"FREE" trial \'ok\'');
  });
});
