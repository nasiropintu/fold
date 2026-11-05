import { useEffect, useState } from 'react';
import { Download, FileOutput, RotateCcw } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBytes, exportSelectedPages, inspectPdf, parsePageRanges } from '../lib/pdf';

export default function SplitTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState('1-3');
  const [mode, setMode] = useState<'range' | 'pick'>('range');
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(0); setSelected([]); setError(''); setSuccess('');
    if (file) inspectPdf(file).then((count) => { if (active) { setPageCount(count); setRange(`1-${Math.min(3, count)}`); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not read this PDF.'); });
    return () => { active = false; };
  }, [file]);

  const reset = () => { setFile(null); setPageCount(0); setRange(''); setSelected([]); setError(''); setSuccess(''); };
  const togglePage = (pageNumber: number) => setSelected((current) => current.includes(pageNumber) ? current.filter((page) => page !== pageNumber) : [...current, pageNumber].sort((a, b) => a - b));
  const extract = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setBusy(true);
    try {
      const indices = mode === 'range' ? parsePageRanges(range, pageCount) : selected.map((page) => page - 1);
      const result = await exportSelectedPages(file, indices);
      downloadBytes(result, `${file.name.replace(/\.pdf$/i, '')}-pages.pdf`);
      setSuccess(`Exported ${indices.length} ${indices.length === 1 ? 'page' : 'pages'} to a new PDF. Download started.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not extract those pages.');
    } finally { setBusy(false); }
  };

  return <>
    <FileDropzone accept="application/pdf,.pdf" disabled={busy} onInvalid={setError} onFiles={(selectedFiles) => setFile(selectedFiles[0])} title={file ? file.name : 'Choose a PDF to split'} hint="Select a PDF, then choose pages by range or individually." />
    {file && pageCount > 0 && <section className="work-card">
      <div className="section-head"><div><span className="eyebrow">PAGE SELECTION</span><h2>{pageCount} pages found</h2></div><button className="button button-quiet button-small" disabled={busy} onClick={reset}><RotateCcw size={15} /> Reset</button></div>
      <div className="segmented" role="tablist" aria-label="Page selection method">
        <button className={mode === 'range' ? 'active' : ''} role="tab" aria-selected={mode === 'range'} disabled={busy} onClick={() => setMode('range')}>Page ranges</button>
        <button className={mode === 'pick' ? 'active' : ''} role="tab" aria-selected={mode === 'pick'} disabled={busy} onClick={() => setMode('pick')}>Pick pages</button>
      </div>
      {mode === 'range' ? <label className="form-field"><span>Pages to extract</span><input disabled={busy} value={range} onChange={(event) => setRange(event.target.value)} placeholder="For example: 1-3, 5, 8-10" /><small>Use commas between pages or ranges. The output keeps the selected pages in page order.</small></label> : <div className="page-pick-grid" aria-label="Select pages to extract">
        {Array.from({ length: pageCount }, (_, index) => <button type="button" key={index} disabled={busy} className={`page-chip${selected.includes(index + 1) ? ' selected' : ''}`} aria-pressed={selected.includes(index + 1)} onClick={() => togglePage(index + 1)}><span className="page-chip-check">{selected.includes(index + 1) ? '✓' : ''}</span>Page {index + 1}</button>)}
      </div>}
      <div className="button-row"><span className="field-note">Creates one new PDF. The original is unchanged.</span><button className="button button-primary" disabled={busy || (mode === 'pick' && selected.length === 0)} onClick={extract}><FileOutput size={17} /> Extract pages <Download size={15} /></button></div>
    </section>}
    <Feedback error={error} success={success} busy={busy} busyLabel="Extracting pages…" />
  </>;
}
