import { useEffect, useRef, useState } from 'react';
import { Download, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pixelmatch from 'pixelmatch';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { inspectPdf } from '../lib/pdf';

export default function CompareTool() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [pagesA, setPagesA] = useState(0);
  const [pagesB, setPagesB] = useState(0);
  const [selectedPage, setSelectedPage] = useState(1);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'diff'>('side-by-side');

  // Canvases
  const canvasARef = useRef<HTMLCanvasElement | null>(null);
  const canvasBRef = useRef<HTMLCanvasElement | null>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement | null>(null);

  const [diffStats, setDiffStats] = useState<{ diffPixels: number; totalPixels: number; percent: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Inspect page counts
  useEffect(() => {
    if (fileA) {
      inspectPdf(fileA).then(setPagesA).catch((err) => setError(err.message));
    } else {
      setPagesA(0);
    }
  }, [fileA]);

  useEffect(() => {
    if (fileB) {
      inspectPdf(fileB).then(setPagesB).catch((err) => setError(err.message));
    } else {
      setPagesB(0);
    }
  }, [fileB]);

  const maxPages = Math.max(pagesA, pagesB);

  // Render comparison whenever selectedPage, fileA, or fileB changes
  useEffect(() => {
    if (!fileA || !fileB || selectedPage < 1) return;
    let cancelled = false;

    async function runVisualDiff() {
      setBusy(true);
      setError('');
      setDiffStats(null);

      try {
        const bytesA = await fileA!.arrayBuffer();
        const bytesB = await fileB!.arrayBuffer();

        const docA = await pdfjsLib.getDocument({ data: new Uint8Array(bytesA) }).promise;
        const docB = await pdfjsLib.getDocument({ data: new Uint8Array(bytesB) }).promise;

        const pageA = selectedPage <= docA.numPages ? await docA.getPage(selectedPage) : null;
        const pageB = selectedPage <= docB.numPages ? await docB.getPage(selectedPage) : null;

        if (cancelled) {
          docA.destroy();
          docB.destroy();
          return;
        }

        const targetWidth = 420;
        let viewportA = pageA?.getViewport({ scale: 1 });
        let viewportB = pageB?.getViewport({ scale: 1 });

        const scaleA = viewportA ? targetWidth / viewportA.width : 1;
        const scaleB = viewportB ? targetWidth / viewportB.width : 1;

        viewportA = pageA?.getViewport({ scale: scaleA });
        viewportB = pageB?.getViewport({ scale: scaleB });

        const width = Math.max(viewportA?.width || 0, viewportB?.width || 0, 100);
        const height = Math.max(viewportA?.height || 0, viewportB?.height || 0, 100);

        // Prepare Canvas A
        const canvasA = canvasARef.current;
        const canvasB = canvasBRef.current;
        const canvasDiff = canvasDiffRef.current;

        if (!canvasA || !canvasB || !canvasDiff) return;

        canvasA.width = width;
        canvasA.height = height;
        canvasB.width = width;
        canvasB.height = height;
        canvasDiff.width = width;
        canvasDiff.height = height;

        const ctxA = canvasA.getContext('2d', { willReadFrequently: true });
        const ctxB = canvasB.getContext('2d', { willReadFrequently: true });
        const ctxDiff = canvasDiff.getContext('2d', { willReadFrequently: true });

        if (!ctxA || !ctxB || !ctxDiff) return;

        // Fill white
        ctxA.fillStyle = '#ffffff';
        ctxA.fillRect(0, 0, width, height);
        ctxB.fillStyle = '#ffffff';
        ctxB.fillRect(0, 0, width, height);

        if (pageA && viewportA) {
          await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise;
          pageA.cleanup();
        }
        if (pageB && viewportB) {
          await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise;
          pageB.cleanup();
        }

        await docA.destroy();
        await docB.destroy();

        if (cancelled) return;

        // Run pixelmatch
        const imgDataA = ctxA.getImageData(0, 0, width, height);
        const imgDataB = ctxB.getImageData(0, 0, width, height);
        const diffImgData = ctxDiff.createImageData(width, height);

        const diffPixels = pixelmatch(
          imgDataA.data,
          imgDataB.data,
          diffImgData.data,
          width,
          height,
          {
            threshold: 0.1,
            diffColor: [239, 68, 68], // Red for changes
            aaColor: [245, 158, 11], // Amber for anti-aliased edges
            diffColorAlt: [59, 130, 246],
          }
        );

        ctxDiff.putImageData(diffImgData, 0, 0);

        const totalPixels = width * height;
        const percent = Number(((diffPixels / totalPixels) * 100).toFixed(2));
        setDiffStats({ diffPixels, totalPixels, percent });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Comparison failed.');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    runVisualDiff();
    return () => { cancelled = true; };
  }, [fileA, fileB, selectedPage]);

  const downloadDiff = () => {
    const canvas = canvasDiffRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-page-${selectedPage}.png`;
    a.click();
  };

  const reset = () => {
    setFileA(null);
    setFileB(null);
    setPagesA(0);
    setPagesB(0);
    setSelectedPage(1);
    setDiffStats(null);
    setError('');
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <FileDropzone
          accept="application/pdf,.pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={(selected) => setFileA(selected[0])}
          title={fileA ? fileA.name : 'Choose Document A (Original)'}
          hint={fileA ? `${pagesA} pages loaded` : 'Select the baseline PDF version.'}
        />
        <FileDropzone
          accept="application/pdf,.pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={(selected) => setFileB(selected[0])}
          title={fileB ? fileB.name : 'Choose Document B (Revision)'}
          hint={fileB ? `${pagesB} pages loaded` : 'Select the revised or modified PDF.'}
        />
      </div>

      {fileA && fileB && maxPages > 0 && (
        <section className="work-card" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">VISUAL COMPARISON WORKBENCH</span>
              <h2>Page {selectedPage} of {maxPages}</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                disabled={busy}
                value={selectedPage}
                onChange={(e) => setSelectedPage(Number(e.target.value))}
                style={{ padding: '4px 8px', fontSize: 11, borderRadius: 5, border: '1px solid #c9d5cb' }}
              >
                {Array.from({ length: maxPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Compare Page {i + 1}
                  </option>
                ))}
              </select>
              <button className="button button-quiet button-small" disabled={busy} onClick={reset}>
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>

          {/* Diff stats banner */}
          {diffStats && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 8,
              background: diffStats.diffPixels > 0 ? '#fff8f6' : '#f0f9f3',
              border: `1px solid ${diffStats.diffPixels > 0 ? '#fdd8d2' : '#d2ebd9'}`,
              margin: '14px 0',
              fontSize: 11,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {diffStats.diffPixels > 0 ? (
                  <AlertTriangle size={15} style={{ color: '#e53e3e' }} />
                ) : (
                  <CheckCircle2 size={15} style={{ color: '#2f855a' }} />
                )}
                <span style={{ color: diffStats.diffPixels > 0 ? '#9b2c2c' : '#22543d' }}>
                  {diffStats.diffPixels > 0 ? (
                    <strong>{diffStats.percent}% differences detected ({diffStats.diffPixels.toLocaleString()} altered pixels)</strong>
                  ) : (
                    <strong>Pages are visually identical! (0% difference)</strong>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className={`button button-small ${viewMode === 'side-by-side' ? 'button-primary' : 'button-outline'}`}
                  onClick={() => setViewMode('side-by-side')}
                >
                  Side by Side
                </button>
                <button
                  className={`button button-small ${viewMode === 'diff' ? 'button-primary' : 'button-outline'}`}
                  onClick={() => setViewMode('diff')}
                >
                  Diff Overlay
                </button>
              </div>
            </div>
          )}

          {/* Render Canvases */}
          {viewMode === 'side-by-side' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4b6558', display: 'block', marginBottom: 6 }}>
                  DOCUMENT A: {fileA.name}
                </span>
                <div style={{ border: '1px solid #d4ded7', borderRadius: 8, overflow: 'hidden', background: '#fff', display: 'inline-block' }}>
                  <canvas ref={canvasARef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4b6558', display: 'block', marginBottom: 6 }}>
                  DOCUMENT B: {fileB.name}
                </span>
                <div style={{ border: '1px solid #d4ded7', borderRadius: 8, overflow: 'hidden', background: '#fff', display: 'inline-block' }}>
                  <canvas ref={canvasBRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#e53e3e', display: 'block', marginBottom: 6 }}>
                DIFFERENCE HEATMAP (RED = ALTERATIONS)
              </span>
              <div style={{ border: '1px solid #d4ded7', borderRadius: 8, overflow: 'hidden', background: '#fff', display: 'inline-block' }}>
                <canvas ref={canvasDiffRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
          )}

          {/* Hidden reference for diff canvas when side-by-side is active */}
          <canvas ref={canvasDiffRef} style={{ display: viewMode === 'diff' ? 'block' : 'none' }} />

          <div className="button-row" style={{ marginTop: 22 }}>
            <span className="field-note">
              Pixelmatch difference engine processes comparisons 100% locally.
            </span>
            <button className="button button-outline" onClick={downloadDiff}>
              <Download size={14} /> Download Page Diff Image
            </button>
          </div>
        </section>
      )}

      <Feedback error={error} busy={busy} busyLabel="Comparing documents pixel by pixel…" />
    </>
  );
}
