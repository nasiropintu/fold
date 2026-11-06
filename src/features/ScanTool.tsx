import { useEffect, useRef, useState } from 'react';
import { Camera, Download, RotateCcw, Trash2, Sliders, CheckCircle, VideoOff } from 'lucide-react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import Feedback from '../components/Feedback';
import { downloadBytes } from '../lib/pdf';

type ScanFilter = 'bw' | 'grayscale' | 'color';

export default function ScanTool() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ScanFilter>('bw');
  const [snappedPages, setSnappedPages] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const startCamera = async () => {
    setCameraError(null);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support camera capture via getUserMedia.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera permission denied or device not found.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const applyCanvasFilter = (ctx: CanvasRenderingContext2D, width: number, height: number, mode: ScanFilter) => {
    if (mode === 'color') return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Luminance formula
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (mode === 'grayscale') {
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      } else if (mode === 'bw') {
        // High contrast document threshold
        const threshold = 135;
        const v = gray > threshold ? 255 : 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    applyCanvasFilter(ctx, canvas.width, canvas.height, filter);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setSnappedPages((prev) => [...prev, dataUrl]);
    setSuccess(`Captured Page ${snappedPages.length + 1}!`);
  };

  const removePage = (index: number) => {
    setSnappedPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompilePdf = async () => {
    if (snappedPages.length === 0) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setProgressVal(15);

    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < snappedPages.length; i++) {
        const dataUrl = snappedPages[i];
        const base64Data = dataUrl.split(',')[1];
        const binary = atob(base64Data);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

        const img = await pdfDoc.embedJpg(bytes);
        const [a4Width, a4Height] = PageSizes.A4;
        const page = pdfDoc.addPage([a4Width, a4Height]);

        // Fit image nicely into A4 page with 25pt margins
        const maxW = a4Width - 50;
        const maxH = a4Height - 50;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;

        page.drawImage(img, {
          x: (a4Width - drawW) / 2,
          y: (a4Height - drawH) / 2,
          width: drawW,
          height: drawH,
        });

        setProgressVal(15 + Math.round(((i + 1) / snappedPages.length) * 80));
      }

      const pdfBytes = await pdfDoc.save();
      setProgressVal(100);

      setResultBytes(pdfBytes);
      setSuccess(`Compiled ${snappedPages.length} scanned page(s) into PDF!`);
      downloadBytes(pdfBytes, `scanned-document-${Date.now()}.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compile scanned PDF.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setSnappedPages([]);
    setResultBytes(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <Camera size={12} />
          <span>PHASE 4 · HARDWARE SCANNING</span>
        </div>
        <h2>Scan to PDF</h2>
        <p>Use your webcam or phone camera to snap physical paper documents, enhance with contrast filters, and compile into a multi-page PDF.</p>
      </div>

      <div className="tool-card-box">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 300px', gap: 24 }}>
          {/* Camera Viewport */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                maxHeight: 420,
                background: '#121d23',
                borderRadius: 11,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #233b47',
              }}
            >
              {cameraActive ? (
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: 400,
                    objectFit: 'contain',
                    transform: 'scaleX(1)',
                  }}
                  playsInline
                  muted
                />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#90a49b' }}>
                  <VideoOff size={36} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <p style={{ margin: 0, fontSize: 13 }}>{cameraError || 'Camera is currently inactive.'}</p>
                  <button className="primary-action-btn" onClick={startCamera} style={{ marginTop: 14 }}>
                    Start Camera
                  </button>
                </div>
              )}

              {cameraActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(15, 23, 42, 0.75)',
                    padding: '3px 8px',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#fff',
                    fontSize: 11,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                  LIVE
                </div>
              )}
            </div>

            {/* Filter and Snap Controls */}
            {cameraActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Sliders size={15} color="#557567" />
                  <select
                    className="select-input"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as ScanFilter)}
                    style={{ height: 36, fontSize: 13 }}
                  >
                    <option value="bw">High-Contrast B&W Document</option>
                    <option value="grayscale">Grayscale</option>
                    <option value="color">Full Color</option>
                  </select>
                </div>

                <button
                  className="primary-action-btn"
                  onClick={handleSnap}
                  style={{ padding: '0 20px', height: 38 }}
                >
                  <Camera size={16} />
                  <span>Snap Page</span>
                </button>
              </div>
            )}
          </div>

          {/* Snapped Stack Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5ebe4', paddingLeft: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label className="tool-label" style={{ margin: 0 }}>
                Scanned Pages ({snappedPages.length})
              </label>
              {snappedPages.length > 0 && (
                <button className="text-button" onClick={resetAll} style={{ fontSize: 11 }}>
                  <RotateCcw size={12} /> Clear all
                </button>
              )}
            </div>

            {snappedPages.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  border: '1.5px dashed #cbd6ce',
                  borderRadius: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  textAlign: 'center',
                  color: '#7f9389',
                  fontSize: 13,
                }}
              >
                No pages snapped yet. Align your document and click "Snap Page".
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: 10,
                  maxHeight: 330,
                  overflowY: 'auto',
                  padding: 2,
                }}
              >
                {snappedPages.map((src, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      border: '1px solid #cfd8d1',
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: '#fff',
                    }}
                  >
                    <img src={src} alt={`Page ${i + 1}`} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: 10,
                        padding: '1px 5px',
                        borderRadius: 3,
                      }}
                    >
                      P{i + 1}
                    </span>
                    <button
                      className="icon-button"
                      onClick={() => removePage(i)}
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        background: 'rgba(255,255,255,0.85)',
                        width: 22,
                        height: 22,
                        color: '#ef4444',
                      }}
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button
                className="primary-action-btn"
                onClick={handleCompilePdf}
                disabled={busy || snappedPages.length === 0}
                style={{ width: '100%' }}
              >
                <CheckCircle size={16} />
                <span>{busy ? 'Compiling PDF…' : `Compile ${snappedPages.length} Page(s) to PDF`}</span>
              </button>

              {resultBytes && (
                <button
                  className="secondary-action-btn"
                  onClick={() => downloadBytes(resultBytes, 'scanned-document.pdf')}
                  style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                >
                  <Download size={15} />
                  <span>Download Scanned PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel="Embedding page frames and generating PDF document…"
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
