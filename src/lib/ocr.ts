// Screenshot import (beta). tesseract.js is loaded only when someone imports an image, so the
// core journey never downloads it. OCR runs in a Web Worker in the browser; the image is not uploaded.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Tidies OCR output without changing its words: unify quotes, collapse runs of spaces, drop blank lines. */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
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
