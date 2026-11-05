import { useEffect, useRef, useState } from 'react';
import { Download, Eraser, PenTool, RotateCcw, Type, Upload, Check, Move } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { applySignature, downloadBytes, inspectPdf } from '../lib/pdf';

export default function SignTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState(1);
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Signature drawing pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#111827');
  const [typedName, setTypedName] = useState('Nasir Pintu');
  const [uploadedSigUrl, setUploadedSigUrl] = useState<string | null>(null);

  // Placement coordinates (percentages 0..1)
  const [posX, setPosX] = useState(0.65); // 65% from left
  const [posY, setPosY] = useState(0.80); // 80% from top
  const [sigScale, setSigScale] = useState(0.25); // 25% of page width

  // Preview canvas of the current PDF page
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Inspect page count on file upload
  useEffect(() => {
    let active = true;
    setPageCount(0); setSelectedPage(1); setError(''); setSuccess('');
    if (file) {
      inspectPdf(file)
        .then((count) => { if (active) setPageCount(count); })
        .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not read this PDF.'); });
    }
    return () => { active = false; };
  }, [file]);

  // Render current PDF page preview onto pageCanvasRef
  useEffect(() => {
    if (!file || selectedPage < 1) return;
    let cancelled = false;

    async function renderPreview() {
      try {
        const bytes = await file!.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
        const page = await doc.getPage(selectedPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = pageCanvasRef.current;
        if (!canvas || cancelled) {
          doc.destroy();
          return;
        }

        // Limit preview canvas width to container size (~480px)
        const displayScale = Math.min(1.0, 480 / viewport.width);
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
        console.error('Page render error:', err);
      }
    }

    renderPreview();
    return () => { cancelled = true; };
  }, [file, selectedPage]);

  // Handle drawing pad events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Convert current signature to PNG bytes
  const getSignaturePngBytes = async (): Promise<Uint8Array> => {
    if (sigMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) throw new Error('Please draw your signature first.');
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    }

    if (sigMode === 'type') {
      if (!typedName.trim()) throw new Error('Please type your signature.');
      // Render cursive text to an offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('Failed to create signature canvas.');
      ctx.font = 'italic 52px "Brush Script MT", "Caveat", "Dancing Script", cursive';
      ctx.fillStyle = penColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 20, 60);

      const dataUrl = offscreen.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    }

    if (sigMode === 'upload') {
      if (!uploadedSigUrl) throw new Error('Please upload a signature image.');
      const res = await fetch(uploadedSigUrl);
      const arrayBuf = await res.arrayBuffer();
      return new Uint8Array(arrayBuf);
    }

    throw new Error('No signature available.');
  };

  // Click on PDF preview to reposition signature
  const handlePagePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    // Center signature around click point, clamped
    const newX = Math.max(0, Math.min(1 - sigScale, clickX - sigScale / 2));
    const newY = Math.max(0, Math.min(0.9, clickY - 0.05));
    setPosX(newX);
    setPosY(newY);
  };

  const handleSignDocument = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const sigPngBytes = await getSignaturePngBytes();
      const signedBytes = await applySignature(file, sigPngBytes, {
        pageNumber: selectedPage,
        xRatio: posX,
        yRatio: posY,
        widthRatio: sigScale,
        heightRatio: sigScale * 0.35, // typical signature aspect ratio 1:3
      });

      downloadBytes(signedBytes, `${file.name.replace(/\.pdf$/i, '')}-signed.pdf`);
      setSuccess(`Signed page ${selectedPage} successfully! Download started.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign this PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FileDropzone
        accept="application/pdf,.pdf"
        disabled={busy}
        onInvalid={setError}
        onFiles={(selectedFiles) => setFile(selectedFiles[0])}
        title={file ? file.name : 'Choose a PDF to sign'}
        hint="Create a handwritten or typed signature and stamp it onto any page."
      />

      {file && pageCount > 0 && (
        <section className="work-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">DIGITAL SIGNATURE WORKBENCH</span>
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
                    Sign Page {i + 1}
                  </option>
                ))}
              </select>
              <button
                className="button button-quiet button-small"
                disabled={busy}
                onClick={() => { setFile(null); setPageCount(0); }}
              >
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(300px, 1.2fr)', gap: 20, marginTop: 16 }}>
            {/* Left: Signature Creation Pad */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="segmented" role="tablist">
                <button
                  className={sigMode === 'draw' ? 'active' : ''}
                  disabled={busy}
                  onClick={() => setSigMode('draw')}
                >
                  <PenTool size={13} style={{ display: 'inline', marginRight: 4 }} /> Draw
                </button>
                <button
                  className={sigMode === 'type' ? 'active' : ''}
                  disabled={busy}
                  onClick={() => setSigMode('type')}
                >
                  <Type size={13} style={{ display: 'inline', marginRight: 4 }} /> Type
                </button>
                <button
                  className={sigMode === 'upload' ? 'active' : ''}
                  disabled={busy}
                  onClick={() => setSigMode('upload')}
                >
                  <Upload size={13} style={{ display: 'inline', marginRight: 4 }} /> Upload
                </button>
              </div>

              {sigMode === 'draw' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{
                    border: '1px solid #d4dfd6',
                    borderRadius: 8,
                    background: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <canvas
                      ref={canvasRef}
                      width={340}
                      height={150}
                      style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div style={{ position: 'absolute', bottom: 6, left: 10, fontSize: 9, color: '#9bb0a5', pointerEvents: 'none' }}>
                      Sign with mouse or touch
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#687e73' }}>Ink:</span>
                      {['#111827', '#1e40af', '#0f766e'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setPenColor(color)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: color,
                            border: penColor === color ? '2px solid #528c77' : '1px solid #cbd6cf',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                    <button className="button button-quiet button-small" onClick={clearDrawing}>
                      <Eraser size={13} /> Clear
                    </button>
                  </div>
                </div>
              )}

              {sigMode === 'type' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="form-field">
                    <span>Your Full Name</span>
                    <input
                      value={typedName}
                      disabled={busy}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Type name here…"
                    />
                  </label>
                  <div style={{
                    height: 100,
                    border: '1px solid #d4dfd6',
                    borderRadius: 8,
                    background: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: '"Brush Script MT", "Caveat", "Dancing Script", cursive',
                    fontSize: 34,
                    color: penColor,
                    fontStyle: 'italic',
                  }}>
                    {typedName || 'Signature Preview'}
                  </div>
                </div>
              )}

              {sigMode === 'upload' && (
                <label className="form-field">
                  <span>Upload Signature Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    disabled={busy}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setUploadedSigUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <small>PNG images with transparent backgrounds look best.</small>
                </label>
              )}

              {/* Signature Scale slider */}
              <label className="form-field" style={{ marginTop: 8 }}>
                <span>Signature Size ({Math.round(sigScale * 100)}% of page)</span>
                <input
                  type="range"
                  min="0.10"
                  max="0.50"
                  step="0.02"
                  value={sigScale}
                  disabled={busy}
                  onChange={(e) => setSigScale(Number(e.target.value))}
                />
              </label>
            </div>

            {/* Right: PDF Page Preview with Placement Overlay */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#4b6b5d', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Move size={12} />
                <span>CLICK ANYWHERE ON THE PAGE TO POSITION SIGNATURE</span>
              </div>
              
              <div
                onClick={handlePagePreviewClick}
                style={{
                  position: 'relative',
                  border: '1px solid #cbd6cf',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'crosshair',
                  background: '#eaede8',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  width: 'max-content',
                  maxWidth: '100%',
                  margin: '0 auto',
                }}
              >
                <canvas ref={pageCanvasRef} style={{ display: 'block' }} />

                {/* Stamped visual indicator badge */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${posX * 100}%`,
                    top: `${posY * 100}%`,
                    width: `${sigScale * 100}%`,
                    padding: '4px 6px',
                    border: '2px dashed #16a34a',
                    background: 'rgba(240, 253, 244, 0.75)',
                    borderRadius: 4,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#15803d',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <PenTool size={11} />
                  <span>Signature Stamp</span>
                </div>
              </div>
              <small style={{ display: 'block', textAlign: 'center', marginTop: 6, color: '#82958a', fontSize: 9 }}>
                Tip: Click on the document where you want your signature stamped.
              </small>
            </div>
          </div>

          <div className="button-row" style={{ marginTop: 24 }}>
            <span className="field-note">
              Signature will be embedded into page {selectedPage}. Original file is never uploaded.
            </span>
            <button className="button button-primary" disabled={busy} onClick={handleSignDocument}>
              <Check size={16} /> Sign Document & Save <Download size={15} />
            </button>
          </div>
        </section>
      )}

      <Feedback error={error} success={success} busy={busy} busyLabel="Applying signature to document…" />
    </>
  );
}
