// Screenshot import (beta). tesseract.js is loaded only when someone imports an image, so the
// core journey never downloads it. OCR runs in a Web Worker in the browser; the image is not uploaded.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Tidies OCR output: unify quotes, collapse spaces, drop blank lines, re-join split price digits. */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .split('\n')
    .map((line) =>
      line
        .replace(/[ \t]+/g, ' ')
        // Large price digits are often split by OCR: "$1 0 usD" -> "$10 USD".
        .replace(/([$€£])\s?(\d) (\d)(?=\s|$)/g, '$1$2$3')
        .replace(/(\d)\s?(usd|eur|gbp)\b/gi, (_m, d: string, code: string) => `${d} ${code.toUpperCase()}`)
        .trim(),
    )
    .filter((line) => line.length > 0)
    .join('\n');
}

export async function readTextFromImage(file: Blob, onProgress?: (fraction: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return normalizeOcrText(data.text);
  } finally {
    await worker.terminate();
  }
}
