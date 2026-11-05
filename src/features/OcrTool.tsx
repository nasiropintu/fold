import { useEffect, useState } from 'react';
import { Copy, Download, FileText, RotateCcw, ScanText, Check } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBlob, downloadBytes, inspectPdf, parsePageRanges } from '../lib/pdf';

const languages = [
  { code: 'eng', label: 'English' },
  { code: 'ben', label: 'Bengali' },
  { code: 'spa', label: 'Spanish' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'ara', label: 'Arabic' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'hin', label: 'Hindi' },
];

export default function OcrTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [lang, setLang] = useState('eng');
  const [pageRange, setPageRange] = useState('1-3');
  const [extractedText, setExtractedText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressVal, setProgressVal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(0); setExtractedText(''); setError(''); setSuccess('');
    if (file) {
      inspectPdf(file)
        .then((count) => {
          if (active) {
            setPageCount(count);
            setPageRange(`1-${Math.min(3, count)}`);
          }
        })
        .catch((err) => { if (active) setError(err.message); });
    }
    return () => { active = false; };
  }, [file]);

  const handleRunOcr = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setExtractedText('');
    setBusy(true);
    setProgressVal(0);
    setProgressStatus('Initializing Tesseract OCR WebAssembly engine…');

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      const pageIndices = parsePageRanges(pageRange, pageCount);
      if (pageIndices.length === 0) throw new Error('Please select at least one page to OCR.');

      const bytes = await file.arrayBuffer();
      const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;

      worker = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgressVal(Math.round(m.progress * 100));
          }
        },
      });

      let fullText = '';
      for (let i = 0; i < pageIndices.length; i += 1) {
        const pageNum = pageIndices[i] + 1;
        setProgressStatus(`Recognizing Page ${pageNum} (${i + 1}/${pageIndices.length})…`);
        const page = await pdfjsDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to prepare canvas context.');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const ret = await worker.recognize(canvas);
        fullText += `--- [PAGE ${pageNum}] ---\n\n${ret.data.text.trim()}\n\n`;

        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }

      await pdfjsDoc.destroy();
      setExtractedText(fullText.trim());
      setSuccess(`Successfully recognized ${pageIndices.length} pages of text!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR recognition failed.');
    } finally {
      if (worker) await worker.terminate();
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!extractedText || !file) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${file.name.replace(/\.pdf$/i, '')}-ocr.txt`);
  };

  const handleDownloadPdf = async () => {
    if (!extractedText || !file) return;
    try {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const lines = extractedText.split('\n');
      
      let page = doc.addPage([595, 842]); // A4
      let y = 800;

      for (const line of lines) {
        if (y < 50) {
          page = doc.addPage([595, 842]);
          y = 800;
        }
        const clean = line.substring(0, 90); // avoid page overflow
        page.drawText(clean, { x: 50, y, size: 10, font });
        y -= 14;
      }

      const pdfBytes = await doc.save();
      downloadBytes(pdfBytes, `${file.name.replace(/\.pdf$/i, '')}-searchable.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate PDF.');
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setExtractedText('');
    setError('');
    setSuccess('');
  };

  return (
    <>
      <FileDropzone
        accept="application/pdf,.pdf"
        disabled={busy}
        onInvalid={setError}
        onFiles={(selected) => setFile(selected[0])}
        title={file ? file.name : 'Choose a scanned PDF to OCR'}
        hint="Extract searchable text from scans and images using client-side machine vision."
      />

      {file && pageCount > 0 && (
        <section className="work-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">WASM OCR WORKBENCH</span>
              <h2>{pageCount} {pageCount === 1 ? 'page' : 'pages'} detected</h2>
            </div>
            <button className="button button-quiet button-small" disabled={busy} onClick={reset}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="options-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 14 }}>
            <label className="form-field">
              <span>OCR Language</span>
              <select disabled={busy} value={lang} onChange={(e) => setLang(e.target.value)}>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.code})
                  </option>
                ))}
              </select>
              <small>Tesseract language model runs 100% locally in your browser.</small>
            </label>

            <label className="form-field">
              <span>Pages to OCR</span>
              <input
                disabled={busy}
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1-3, 5"
              />
              <small>Processing fewer pages at a time is faster on mobile/low-power devices.</small>
            </label>
          </div>

          <div className="button-row" style={{ marginTop: 20 }}>
            <span className="field-note">
              No server calls. OCR computation happens completely in an in-memory Web Worker.
            </span>
            <button className="button button-primary" disabled={busy} onClick={handleRunOcr}>
              <ScanText size={16} /> Start Local OCR
            </button>
          </div>

          {/* Results section */}
          {extractedText && (
            <div style={{ marginTop: 24, borderTop: '1px solid #e1e7e2', paddingTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#273e35' }}>
                  RECOGNIZED TEXT OUTPUT
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="button button-outline button-small" onClick={handleCopy}>
                    {copied ? <Check size={13} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                  <button className="button button-outline button-small" onClick={handleDownloadTxt}>
                    <Download size={13} /> Save .TXT
                  </button>
                  <button className="button button-primary button-small" onClick={handleDownloadPdf}>
                    <FileText size={13} /> Export Clean PDF
                  </button>
                </div>
              </div>

              <textarea
                value={extractedText}
                readOnly
                rows={12}
                style={{
                  width: '100%',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #cbd6cf',
                  background: '#fcfdfc',
                  color: '#1a2e26',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
            </div>
          )}
        </section>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel={progressStatus || 'Recognizing text via Tesseract WASM…'}
        progress={progressVal > 0 ? progressVal : undefined}
      />
    </>
  );
}
