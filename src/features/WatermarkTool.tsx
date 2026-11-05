import { useEffect, useState } from 'react';
import { Download, RotateCcw, Stamp, Type, Image as ImageIcon } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { applyWatermark, downloadBytes, inspectPdf, WatermarkPosition } from '../lib/pdf';

export default function WatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [type, setType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fontSize, setFontSize] = useState(48);
  const [colorHex, setColorHex] = useState('#6b7280');
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<WatermarkPosition>('center');
  const [pageRange, setPageRange] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(0); setError(''); setSuccess('');
    if (file) {
      inspectPdf(file)
        .then((count) => { if (active) setPageCount(count); })
        .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not read this PDF.'); });
    }
    return () => { active = false; };
  }, [file]);

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setText('CONFIDENTIAL');
    setImageFile(null);
    setError('');
    setSuccess('');
  };

  const handleApply = async () => {
    if (!file) return;
    if (type === 'text' && !text.trim()) {
      setError('Please enter watermark text.');
      return;
    }
    if (type === 'image' && !imageFile) {
      setError('Please select an image file for the watermark.');
      return;
    }

    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const result = await applyWatermark(file, {
        type,
        text,
        imageFile: imageFile || undefined,
        fontSize,
        colorHex,
        opacity,
        rotation,
        position,
        pageRange,
      });

      downloadBytes(result, `${file.name.replace(/\.pdf$/i, '')}-watermarked.pdf`);
      setSuccess('Watermark applied successfully! Download started.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not apply watermark.');
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
        title={file ? file.name : 'Choose a PDF to watermark'}
        hint="Stamp customizable text or a brand logo onto every page or selected ranges."
      />

      {file && pageCount > 0 && (
        <section className="work-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">WATERMARK CONFIGURATION</span>
              <h2>{pageCount} {pageCount === 1 ? 'page' : 'pages'} ready</h2>
            </div>
            <button className="button button-quiet button-small" disabled={busy} onClick={reset}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="segmented" role="tablist" aria-label="Watermark type">
            <button
              className={type === 'text' ? 'active' : ''}
              role="tab"
              aria-selected={type === 'text'}
              disabled={busy}
              onClick={() => setType('text')}
            >
              <Type size={14} style={{ marginRight: 6, display: 'inline' }} />
              Text Watermark
            </button>
            <button
              className={type === 'image' ? 'active' : ''}
              role="tab"
              aria-selected={type === 'image'}
              disabled={busy}
              onClick={() => setType('image')}
            >
              <ImageIcon size={14} style={{ marginRight: 6, display: 'inline' }} />
              Image / Logo
            </button>
          </div>

          <div className="options-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {type === 'text' ? (
              <>
                <label className="form-field">
                  <span>Watermark text</span>
                  <input
                    disabled={busy}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL, DRAFT, COPY"
                  />
                </label>

                <label className="form-field">
                  <span>Text Color</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      disabled={busy}
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      style={{ width: 44, height: 38, padding: 2, cursor: 'pointer' }}
                    />
                    <input
                      disabled={busy}
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      placeholder="#6b7280"
                      style={{ flex: 1 }}
                    />
                  </div>
                </label>

                <label className="form-field">
                  <span>Font Size ({fontSize} pt)</span>
                  <input
                    type="range"
                    min="18"
                    max="96"
                    step="2"
                    disabled={busy}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                  />
                </label>

                <label className="form-field">
                  <span>Rotation Angle ({rotation}°)</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 45, 90, -45].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        className={`button button-small ${rotation === deg ? 'button-primary' : 'button-outline'}`}
                        disabled={busy}
                        onClick={() => setRotation(deg)}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </label>
              </>
            ) : (
              <label className="form-field" style={{ gridColumn: '1 / -1' }}>
                <span>Select Logo or Stamp Image (PNG / JPG)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                />
                <small>Transparent PNG images work best for clean watermarking.</small>
              </label>
            )}

            <label className="form-field">
              <span>Opacity ({Math.round(opacity * 100)}%)</span>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                disabled={busy}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
            </label>

            <label className="form-field">
              <span>Placement</span>
              <select
                disabled={busy}
                value={position}
                onChange={(e) => setPosition(e.target.value as WatermarkPosition)}
              >
                <option value="center">Center</option>
                <option value="tiled">Tiled Grid (Repeating)</option>
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </label>

            <label className="form-field" style={{ gridColumn: '1 / -1' }}>
              <span>Page Range (Optional)</span>
              <input
                disabled={busy}
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="Leave blank for all pages, or e.g. 1-3, 5"
              />
              <small>Default applies the watermark to every page in the document.</small>
            </label>
          </div>

          <div className="button-row" style={{ marginTop: 22 }}>
            <span className="field-note">
              Watermarks are rendered directly into the PDF vector layer. Original remains unchanged.
            </span>
            <button className="button button-primary" disabled={busy} onClick={handleApply}>
              <Stamp size={17} /> Apply Watermark <Download size={15} />
            </button>
          </div>
        </section>
      )}

      <Feedback error={error} success={success} busy={busy} busyLabel="Applying watermark to document…" />
    </>
  );
}
