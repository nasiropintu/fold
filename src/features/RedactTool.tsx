import { useEffect, useRef, useState } from 'react';
import { Download, EyeOff, RotateCcw, ShieldAlert, Trash2, Undo2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBytes, inspectPdf, RedactionBox, redactPdfPages } from '../lib/pdf';

export default function RedactTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState(1);
  const [redactions, setRedactions] = useState<RedactionBox[]>([]);

  // Drag-to-redact state
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(0); setSelectedPage(1); setRedactions([]); setError(''); setSuccess('');
    if (file) {
      inspectPdf(file)
        .then((count) => { if (active) setPageCount(count); })
        .catch((err) => { if (active) setError(err.message); });
    }
    return () => { active = false; };
  }, [file]);

  // Render current page onto preview canvas
  useEffect(() => {
    if (!file || selectedPage < 1) return;
    let cancelled = false;

    async function renderPagePreview() {
      try {
        const bytes = await file!.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
        const page = await doc.getPage(selectedPage);
        const viewport = page.getViewport({ scale: 1.0 });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) {
          doc.destroy();
          return;
        }

        // Scale to ~500px container width
        const displayScale = Math.min(1.0, 520 / viewport.width);
        const scaledViewport = page.getViewport({ scale: displayScale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        }
        page.cleanup();
        await doc.destroy();
      } catch (err) {
        console.error('Render preview error:', err);
      }
    }

    renderPagePreview();
    return () => { cancelled = true; };
  }, [file, selectedPage]);

  // Mouse handlers for drawing redaction boxes
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDragStart({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const left = Math.min(dragStart.x, x);
    const top = Math.min(dragStart.y, y);
    const w = Math.abs(x - dragStart.x);
    const h = Math.abs(y - dragStart.y);

    setCurrentBox({ x: left, y: top, w, h });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !dragStart || !currentBox) return;
    setIsDrawing(false);

    const rect = e.currentTarget.getBoundingClientRect();
    // Only register box if wider than 5px
    if (currentBox.w > 6 && currentBox.h > 6) {
      const xRatio = currentBox.x / rect.width;
      const yRatio = currentBox.y / rect.height;
      const widthRatio = currentBox.w / rect.width;
      const heightRatio = currentBox.h / rect.height;

      const newBox: RedactionBox = {
        id: Math.random().toString(36).substring(2, 9),
        pageNumber: selectedPage,
        xRatio,
        yRatio,
        widthRatio,
        heightRatio,
      };

      setRedactions((prev) => [...prev, newBox]);
    }

    setDragStart(null);
    setCurrentBox(null);
  };

  const removeRedaction = (id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
  };

  const clearCurrentPageRedactions = () => {
    setRedactions((prev) => prev.filter((r) => r.pageNumber !== selectedPage));
  };

  const handleApplyRedactions = async () => {
    if (!file || redactions.length === 0) return;
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const sanitizedBytes = await redactPdfPages(file, redactions);
      downloadBytes(sanitizedBytes, `${file.name.replace(/\.pdf$/i, '')}-redacted.pdf`);
      setSuccess(`Applied ${redactions.length} redactions! Sanitized PDF downloaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sanitize document.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setRedactions([]);
    setError('');
    setSuccess('');
  };

  const currentPageRedactions = redactions.filter((r) => r.pageNumber === selectedPage);

  return (
    <>
      <FileDropzone
        accept="application/pdf,.pdf"
        disabled={busy}
        onInvalid={setError}
        onFiles={(selected) => setFile(selected[0])}
        title={file ? file.name : 'Choose a PDF to redact'}
        hint="Permanently black out and purge confidential text, account numbers, or personal data."
      />

      {file && pageCount > 0 && (
        <section className="work-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">DOCUMENT SANITIZATION</span>
              <h2>Page {selectedPage} of {pageCount}</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                disabled={busy}
                value={selectedPage}
                onChange={(e) => setSelectedPage(Number(e.target.value))}
                style={{ padding: '4px 8px', fontSize: 11, borderRadius: 5, border: '1px solid #c9d5cb' }}
              >
                {Array.from({ length: pageCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Redact Page {i + 1} ({redactions.filter((r) => r.pageNumber === i + 1).length} redactions)
                  </option>
                ))}
              </select>
              <button className="button button-quiet button-small" disabled={busy} onClick={reset}>
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff9ea',
            border: '1px solid #f2e3be',
            padding: '9px 13px',
            borderRadius: 7,
            fontSize: 10,
            color: '#856404',
            margin: '12px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} style={{ color: '#d97706' }} />
              <strong>True Redaction Guarantee:</strong> Redacted pages are flattened and re-rasterized. Underlying text vectors are completely eliminated.
            </div>
            {currentPageRedactions.length > 0 && (
              <button className="button button-quiet button-small" onClick={clearCurrentPageRedactions}>
                <Undo2 size={12} /> Clear Page Redactions
              </button>
            )}
          </div>

          {/* Interactive Redaction Canvas */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 10, color: '#687b71', marginBottom: 6, display: 'block' }}>
              Click and drag a box over any text you want to redact:
            </span>
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                position: 'relative',
                display: 'inline-block',
                cursor: 'crosshair',
                border: '1px solid #cbd5cf',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                userSelect: 'none',
              }}
            >
              <canvas ref={canvasRef} style={{ display: 'block' }} />

              {/* Render existing redactions for this page */}
              {currentPageRedactions.map((r) => (
                <div
                  key={r.id}
                  style={{
                    position: 'absolute',
                    left: `${r.xRatio * 100}%`,
                    top: `${r.yRatio * 100}%`,
                    width: `${r.widthRatio * 100}%`,
                    height: `${r.heightRatio * 100}%`,
                    background: '#000000',
                    boxShadow: '0 0 0 1px #ff4d4f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: 2,
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRedaction(r.id);
                    }}
                    title="Remove this redaction"
                    style={{
                      background: '#ef4444',
                      border: 0,
                      borderRadius: 3,
                      color: 'white',
                      width: 14,
                      height: 14,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              ))}

              {/* Render box currently being dragged */}
              {currentBox && (
                <div
                  style={{
                    position: 'absolute',
                    left: currentBox.x,
                    top: currentBox.y,
                    width: currentBox.w,
                    height: currentBox.h,
                    background: 'rgba(0, 0, 0, 0.75)',
                    border: '1px dashed #ef4444',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
          </div>

          <div className="button-row" style={{ marginTop: 24 }}>
            <span className="field-note">
              {redactions.length} {redactions.length === 1 ? 'redaction' : 'redactions'} queued across the document.
            </span>
            <button
              className="button button-primary"
              disabled={busy || redactions.length === 0}
              onClick={handleApplyRedactions}
            >
              <EyeOff size={16} /> Sanitize & Download <Download size={15} />
            </button>
          </div>
        </section>
      )}

      <Feedback error={error} success={success} busy={busy} busyLabel="Sanitizing document & burning redactions…" />
    </>
  );
}
