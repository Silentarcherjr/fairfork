import { useRef, useState } from 'react';
import { MAX_IMAGE_BYTES, readTextFromImage } from '../lib/ocr';

type Props = { onText: (text: string) => void };

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; progress: number }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export function ImageImport({ onText }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const reading = status.kind === 'reading';

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus({ kind: 'error', message: 'That file is not an image. Try a PNG or JPG screenshot.' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setStatus({ kind: 'error', message: 'That image is larger than 10 MB. Try a smaller screenshot.' });
      return;
    }
    setStatus({ kind: 'reading', progress: 0 });
    try {
      const text = await readTextFromImage(file, (p) => setStatus({ kind: 'reading', progress: p }));
      if (text.length === 0) {
        setStatus({ kind: 'error', message: "We couldn't find any text in that image. Your text was left as it was." });
        return;
      }
      onText(text);
      setStatus({ kind: 'done' });
    } catch {
      setStatus({
        kind: 'error',
        message: "We couldn't read that image (the reader needs an internet connection the first time). Your text was left as it was.",
      });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="image-import">
      <label className={`btn btn--ghost image-import__button${reading ? ' is-busy' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={reading}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        Import from screenshot <span className="tag tag--beta">beta</span>
      </label>
      <p className="hint image-import__status" aria-live="polite">
        {status.kind === 'reading' && `Reading text from the image… ${Math.round(status.progress * 100)}%`}
        {status.kind === 'done' &&
          'Text read from an image — check it against the screenshot before analyzing; OCR can misread. The image stayed in your browser.'}
        {status.kind === 'error' && <span className="image-import__error">{status.message}</span>}
      </p>
    </div>
  );
}
