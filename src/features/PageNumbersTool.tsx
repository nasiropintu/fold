import { useEffect, useState } from 'react';
import { Binary, Download, RotateCcw } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { applyPageNumbers, downloadBytes, inspectPdf, PageNumberPosition } from '../lib/pdf';

export default function PageNumbersTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [position, setPosition] = useState<PageNumberPosition>('bottom-center');
  const [format, setFormat] = useState('Page {n} of {total}');
  const [skipFirstPage, setSkipFirstPage] = useState(false);
  const [fontSize, setFontSize] = useState(10);
  const [colorHex, setColorHex] = useState('#374151');
  const [margin, setMargin] = useState(25);
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
    setError('');
    setSuccess('');
  };

  const handleApply = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const result = await applyPageNumbers(file, {
        position,
        format,
        startPageNumber: 1,
        skipFirstPage,
        fontSize,
        colorHex,
        margin,
      });

      downloadBytes(result, `${file.name.replace(/\.pdf$/i, '')}-numbered.pdf`);
      setSuccess('Page numbers applied successfully! Download started.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add page numbers.');
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
        title={file ? file.name : 'Choose a PDF to number'}
        hint="Insert clean, professional page numbers into headers or footers."
      />

      {file && pageCount > 0 && (
        <section className="work-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">NUMBERING SETTINGS</span>
              <h2>{pageCount} {pageCount === 1 ? 'page' : 'pages'} ready to number</h2>
            </div>
            <button className="button button-quiet button-small" disabled={busy} onClick={reset}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="options-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 14 }}>
            <label className="form-field">
              <span>Position on Page</span>
              <select
                disabled={busy}
                value={position}
                onChange={(e) => setPosition(e.target.value as PageNumberPosition)}
              >
                <option value="bottom-center">Bottom Center (Standard Footer)</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-center">Top Center (Header)</option>
                <option value="top-right">Top Right (Header)</option>
                <option value="top-left">Top Left (Header)</option>
              </select>
            </label>

            <label className="form-field">
              <span>Number Format</span>
              <select
                disabled={busy}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="Page {n} of {total}">Page 1 of {pageCount} (Formal)</option>
                <option value="{n} / {total}">1 / {pageCount} (Compact)</option>
                <option value="{n}">1, 2, 3… (Numbers only)</option>
                <option value="Page {n}">Page 1, Page 2…</option>
                <option value="- {n} -">- 1 -, - 2 -…</option>
              </select>
              <small>Use &#123;n&#125; for current page, &#123;total&#125; for total pages.</small>
            </label>

            <label className="form-field">
              <span>Font Size ({fontSize} pt)</span>
              <input
                type="range"
                min="8"
                max="18"
                step="1"
                disabled={busy}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </label>

            <label className="form-field">
              <span>Number Color</span>
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
                  placeholder="#374151"
                  style={{ flex: 1 }}
                />
              </div>
            </label>

            <label className="form-field">
              <span>Edge Margin ({margin} pt)</span>
              <input
                type="range"
                min="12"
                max="60"
                step="2"
                disabled={busy}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
              />
            </label>

            <label className="form-field" style={{ justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                <input
                  type="checkbox"
                  id="skipFirst"
                  checked={skipFirstPage}
                  disabled={busy}
                  onChange={(e) => setSkipFirstPage(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="skipFirst" style={{ fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  Skip First Page (Cover / Title Page)
                </label>
              </div>
              <small>First page remains unnumbered; numbering starts on page 2.</small>
            </label>
          </div>

          {/* Sample Preview Box */}
          <div style={{
            marginTop: 18,
            padding: '12px 16px',
            background: '#f4f7f4',
            border: '1px solid #dbe6de',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#2a4b3d',
          }}>
            <span>Preview sample:</span>
            <strong>
              {format.replace('{n}', '1').replace('{total}', String(pageCount))}
            </strong>
          </div>

          <div className="button-row" style={{ marginTop: 22 }}>
            <span className="field-note">
              Numbers are applied directly to the document. The original file is unaffected.
            </span>
            <button className="button button-primary" disabled={busy} onClick={handleApply}>
              <Binary size={17} /> Add Page Numbers <Download size={15} />
            </button>
          </div>
        </section>
      )}

      <Feedback error={error} success={success} busy={busy} busyLabel="Adding page numbers to document…" />
    </>
  );
}
