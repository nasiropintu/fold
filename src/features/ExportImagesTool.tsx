import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Image as ImageIcon, RotateCcw } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { usePdfPreview } from '../components/usePdfPreview';
import { downloadBlob, exportPagesAsZip, MAX_EXPORT_IMAGE_PAGES } from '../lib/pdf';

export default function ExportImagesTool() {
  const [file, setFile] = useState<File | null>(null);
  const { pages, loading, error: previewError } = usePdfPreview(file);
  const [selected, setSelected] = useState<number[]>([]);
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const abortController = useRef<AbortController | null>(null);
  useEffect(() => { setSelected([]); setError(''); setSuccess(''); }, [file]);
  const allSelected = pages.length > 0 && selected.length === pages.length;
  const selectedSorted = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const toggle = (pageNumber: number) => {
    if (selected.includes(pageNumber)) {
      setSelected((current) => current.filter((number) => number !== pageNumber));
      setError('');
      return;
    }
    if (selected.length >= MAX_EXPORT_IMAGE_PAGES) {
      setError(`Choose up to ${MAX_EXPORT_IMAGE_PAGES} pages per export.`);
      return;
    }
    setSelected((current) => [...current, pageNumber]);
    setError('');
  };
  const reset = () => { setFile(null); setSelected([]); setError(''); setSuccess(''); setProgress(undefined); };
  const exportSelected = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setBusy(true); setProgress(0);
    const controller = new AbortController();
    abortController.current = controller;
    try {
      const zip = await exportPagesAsZip(file, selectedSorted, format, setProgress, controller.signal);
      downloadBlob(zip, `${file.name.replace(/\.pdf$/i, '')}-pages-${format}.zip`);
      setSuccess(`${selected.length} page images saved in a ZIP file. Download started.`);
    } catch (cause) { setError(controller.signal.aborted ? 'Export cancelled. No file was downloaded.' : cause instanceof Error ? cause.message : 'Could not export these pages.'); }
    finally { abortController.current = null; setBusy(false); }
  };
  return <>
    <FileDropzone accept="application/pdf,.pdf" disabled={busy} onInvalid={setError} onFiles={(selectedFiles) => setFile(selectedFiles[0])} title={file ? file.name : 'Choose a PDF to turn into images'} hint="Select individual pages. Images are created locally and packed into a ZIP." />
    {file && <section className="work-card">
      <div className="section-head"><div><span className="eyebrow">PAGE IMAGES</span><h2>Select the pages to export</h2></div>{pages.length > 0 && <span className="muted-count">{selected.length} of {pages.length} selected</span>}</div>
      {previewError && <p className="inline-error">{previewError}</p>}
      {loading && <p className="inline-status">Loading page previews…</p>}
      {pages.length > 0 && <>
        <div className="selection-toolbar"><button className="button button-quiet button-small" disabled={busy} onClick={() => setSelected(allSelected ? [] : pages.slice(0, MAX_EXPORT_IMAGE_PAGES).map((page) => page.pageNumber))}>{allSelected ? 'Clear selection' : pages.length > MAX_EXPORT_IMAGE_PAGES ? `Select first ${MAX_EXPORT_IMAGE_PAGES} pages` : 'Select all pages'}</button><span>Up to {MAX_EXPORT_IMAGE_PAGES} pages per export</span></div>
        <div className="export-grid">{pages.map((page) => <button type="button" key={page.pageNumber} disabled={busy} className={`export-page${selected.includes(page.pageNumber) ? ' selected' : ''}`} aria-pressed={selected.includes(page.pageNumber)} onClick={() => toggle(page.pageNumber)}><span className="export-check">{selected.includes(page.pageNumber) ? '✓' : ''}</span><img src={page.thumbnail} alt={`Preview of page ${page.pageNumber}`} /><span>Page {page.pageNumber}</span></button>)}</div>
        <div className="export-controls"><label className="form-field format-field"><span>Image format</span><select disabled={busy} value={format} onChange={(event) => setFormat(event.target.value as 'jpg' | 'png')}><option value="jpg">JPG</option><option value="png">PNG</option></select></label><div className="button-row"><button className="button button-quiet" disabled={busy} onClick={reset}><RotateCcw size={16} /> Reset</button><button className="button button-primary" disabled={busy || selected.length === 0} onClick={exportSelected}><ImageIcon size={17} /> Export {selected.length || ''} pages <Download size={15} /></button></div></div>
      </>}
    </section>}
    <Feedback error={error} success={success} busy={busy} progress={progress} busyLabel="Rendering page images…" onCancel={() => abortController.current?.abort()} />
  </>;
}
