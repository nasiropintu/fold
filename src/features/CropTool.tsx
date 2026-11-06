import { useEffect, useRef, useState, useCallback } from 'react';
import { Crop, RotateCw, RotateCcw, Download, Scissors } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBytes, inspectPdf, parsePageRanges } from '../lib/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function CropTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [pageRange, setPageRange] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);

  // Rotation
  const [rotationAngle, setRotationAngle] = useState(0);

  // Margins in % (0 - 40%)
  const [marginTop, setMarginTop] = useState(0);
  const [marginBottom, setMarginBottom] = useState(0);
  const [marginLeft, setMarginLeft] = useState(0);
  const [marginRight, setMarginRight] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageImage, setPageImage] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const renderCurrentPage = useCallback(async (f: File, pNum: number) => {
    try {
      const buffer = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const page = await doc.getPage(pNum);
      const viewport = page.getViewport({ scale: 1.2 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        setPageImage(canvas.toDataURL('image/png'));
      }
      page.cleanup();
      await doc.destroy();
    } catch (e) {
      console.warn('Preview render failed:', e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setPageCount(0);
    setResultBytes(null);
    setError('');
    setSuccess('');
    if (file) {
      inspectPdf(file)
        .then((count) => {
          if (active) {
            setPageCount(count);
            setActivePage(1);
            setPageRange(`1-${count}`);
            renderCurrentPage(file, 1);
          }
        })
        .catch((err) => {
          if (active) setError(err.message || 'Could not inspect PDF.');
        });
    }
    return () => {
      active = false;
    };
  }, [file, renderCurrentPage]);

  // Draw crop box overlay on canvas
  useEffect(() => {
    if (!pageImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = pageImage;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original page
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Crop coordinates
      const cropX = (marginLeft / 100) * canvas.width;
      const cropY = (marginTop / 100) * canvas.height;
      const cropW = canvas.width - cropX - (marginRight / 100) * canvas.width;
      const cropH = canvas.height - cropY - (marginBottom / 100) * canvas.height;

      // Shaded darkened area outside crop box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, 0, canvas.width, cropY); // top
      ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - (cropY + cropH)); // bottom
      ctx.fillRect(0, cropY, cropX, cropH); // left
      ctx.fillRect(cropX + cropW, cropY, canvas.width - (cropX + cropW), cropH); // right

      // Border around crop box
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cropX, cropY, cropW, cropH);
      ctx.setLineDash([]);
    };
  }, [pageImage, marginTop, marginBottom, marginLeft, marginRight]);

  const handleRotate = (angleDelta: number) => {
    setRotationAngle((prev) => (prev + angleDelta) % 360);
  };

  const applyPreset = (preset: 'none' | 'trim-light' | 'trim-heavy') => {
    if (preset === 'none') {
      setMarginTop(0);
      setMarginBottom(0);
      setMarginLeft(0);
      setMarginRight(0);
    } else if (preset === 'trim-light') {
      setMarginTop(5);
      setMarginBottom(5);
      setMarginLeft(5);
      setMarginRight(5);
    } else if (preset === 'trim-heavy') {
      setMarginTop(10);
      setMarginBottom(10);
      setMarginLeft(10);
      setMarginRight(10);
    }
  };

  const handleApply = async () => {
    if (!file || pageCount < 1) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setProgressVal(20);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const total = pdfDoc.getPageCount();

      const targetIndices = applyToAll
        ? Array.from({ length: total }, (_, i) => i)
        : parsePageRanges(pageRange || '1', total);

      setProgressVal(50);

      for (const idx of targetIndices) {
        const page = pdfDoc.getPage(idx);
        const { width, height } = page.getSize();

        // 1. Rotation
        if (rotationAngle !== 0) {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + rotationAngle) % 360));
        }

        // 2. Crop
        const cutLeft = (marginLeft / 100) * width;
        const cutRight = (marginRight / 100) * width;
        const cutTop = (marginTop / 100) * height;
        const cutBottom = (marginBottom / 100) * height;

        const newX = cutLeft;
        const newY = cutBottom;
        const newW = Math.max(20, width - cutLeft - cutRight);
        const newH = Math.max(20, height - cutTop - cutBottom);

        page.setCropBox(newX, newY, newW, newH);
        page.setMediaBox(newX, newY, newW, newH);
      }

      setProgressVal(85);
      const outputBytes = await pdfDoc.save();
      setProgressVal(100);

      setResultBytes(outputBytes);
      setSuccess(`Applied rotate (${rotationAngle}°) & margin crops to ${targetIndices.length} page(s)!`);

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      downloadBytes(outputBytes, `${nameWithoutExt}-cropped.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to crop/rotate PDF.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    downloadBytes(resultBytes, `${nameWithoutExt}-cropped.pdf`);
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setPageImage(null);
    setResultBytes(null);
    setRotationAngle(0);
    applyPreset('none');
    setError('');
    setSuccess('');
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <Scissors size={12} />
          <span>PHASE 4 · VISUAL PRECISION</span>
        </div>
        <h2>Rotate & Crop PDF</h2>
        <p>Trim margins, crop page boxes, and adjust document orientation with vector precision and real-time visual preview.</p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={(files) => files[0] && setFile(files[0])}
          title="Drop your PDF here to crop & rotate"
          hint="Trim borders, remove unwanted margins, and rotate pages"
        />
      ) : (
        <div className="tool-card-box">
          <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{file.name}</strong>
              <span className="subtext" style={{ marginLeft: 8 }}>({pageCount} pages)</span>
            </div>
            <button className="text-button" onClick={reset} disabled={busy}>
              <RotateCcw size={14} /> Change file
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 340px', gap: 24, marginTop: 20 }}>
            {/* Visual Canvas Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  background: '#1e2e38',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  maxHeight: 460,
                  overflow: 'hidden',
                  border: '1px solid #324754',
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 420,
                    objectFit: 'contain',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    borderRadius: 4,
                  }}
                />
              </div>

              {pageCount > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <span className="subtext">Preview Page:</span>
                  <select
                    className="select-input"
                    style={{ width: 110, height: 32, padding: '0 8px', fontSize: 13 }}
                    value={activePage}
                    onChange={(e) => {
                      const p = parseInt(e.target.value, 10);
                      setActivePage(p);
                      renderCurrentPage(file, p);
                    }}
                  >
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>Page {p}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Rotation Controls */}
              <div>
                <label className="tool-label">Orientation Adjustment</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="secondary-action-btn"
                    onClick={() => handleRotate(90)}
                    disabled={busy}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <RotateCw size={14} /> +90°
                  </button>
                  <button
                    className="secondary-action-btn"
                    onClick={() => handleRotate(180)}
                    disabled={busy}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    180° Flip
                  </button>
                  <button
                    className="secondary-action-btn"
                    onClick={() => handleRotate(270)}
                    disabled={busy}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <RotateCcw size={14} /> -90°
                  </button>
                </div>
                {rotationAngle !== 0 && (
                  <span className="subtext" style={{ color: '#10b981', display: 'block', marginTop: 4 }}>
                    Pending rotation: {rotationAngle}° clockwise
                  </span>
                )}
              </div>

              {/* Crop Margin Sliders */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="tool-label" style={{ margin: 0 }}>Margin Trimming</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="text-button" style={{ fontSize: 11 }} onClick={() => applyPreset('trim-light')}>
                      Light (5%)
                    </button>
                    <button className="text-button" style={{ fontSize: 11 }} onClick={() => applyPreset('trim-heavy')}>
                      Header/Footer (10%)
                    </button>
                    <button className="text-button" style={{ fontSize: 11 }} onClick={() => applyPreset('none')}>
                      Reset
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <span className="subtext">Top: {marginTop}%</span>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      value={marginTop}
                      onChange={(e) => setMarginTop(parseInt(e.target.value, 10))}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <span className="subtext">Bottom: {marginBottom}%</span>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      value={marginBottom}
                      onChange={(e) => setMarginBottom(parseInt(e.target.value, 10))}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <span className="subtext">Left: {marginLeft}%</span>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      value={marginLeft}
                      onChange={(e) => setMarginLeft(parseInt(e.target.value, 10))}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <span className="subtext">Right: {marginRight}%</span>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      value={marginRight}
                      onChange={(e) => setMarginRight(parseInt(e.target.value, 10))}
                      disabled={busy}
                    />
                  </div>
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="tool-label">Apply Scope</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="scope"
                      checked={applyToAll}
                      onChange={() => setApplyToAll(true)}
                    />
                    <span>All {pageCount} pages</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="scope"
                      checked={!applyToAll}
                      onChange={() => setApplyToAll(false)}
                    />
                    <span>Specific page range</span>
                  </label>
                </div>

                {!applyToAll && (
                  <input
                    type="text"
                    className="text-input"
                    style={{ marginTop: 8 }}
                    placeholder="e.g. 1-3, 5"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                  />
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  className="primary-action-btn"
                  onClick={handleApply}
                  disabled={busy || (rotationAngle === 0 && marginTop === 0 && marginBottom === 0 && marginLeft === 0 && marginRight === 0)}
                  style={{ flex: 1 }}
                >
                  <Crop size={16} />
                  <span>{busy ? 'Processing…' : 'Apply Crop & Rotate'}</span>
                </button>

                {resultBytes && (
                  <button className="secondary-action-btn" onClick={handleDownload}>
                    <Download size={16} />
                    <span>Download</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel="Adjusting vector CropBox and orientation…"
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
