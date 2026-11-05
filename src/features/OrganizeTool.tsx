import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Download, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { usePdfPreview } from '../components/usePdfPreview';
import { downloadBytes, exportOrganizedPdf, PageArrangement } from '../lib/pdf';

export default function OrganizeTool() {
  const [file, setFile] = useState<File | null>(null);
  const { pages, loading: previewLoading, error: previewError } = usePdfPreview(file);
  const [arrangement, setArrangement] = useState<PageArrangement[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { setArrangement([]); setError(''); setSuccess(''); }, [file]);
  useEffect(() => { if (pages.length && arrangement.length === 0) setArrangement(pages.map((page) => ({ originalIndex: page.pageNumber - 1, rotation: 0 }))); }, [pages, arrangement.length]);
  const reset = () => { setFile(null); setArrangement([]); setError(''); setSuccess(''); };
  const move = (index: number, delta: number) => setArrangement((current) => {
    const target = index + delta;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const remove = (index: number) => {
    if (arrangement.length <= 1) { setError('A PDF must keep at least one page.'); return; }
    setArrangement((current) => current.filter((_, currentIndex) => currentIndex !== index)); setError('');
  };
  const rotate = (index: number, delta: number) => setArrangement((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, rotation: (item.rotation + delta + 360) % 360 } : item));
  const save = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setBusy(true);
    try {
      const output = await exportOrganizedPdf(file, arrangement);
      downloadBytes(output, `${file.name.replace(/\.pdf$/i, '')}-organized.pdf`);
      setSuccess(`Saved ${arrangement.length} pages in the new order. Download started.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the organized PDF.'); }
    finally { setBusy(false); }
  };
  const previewByNumber = new Map(pages.map((page) => [page.pageNumber - 1, page.thumbnail]));

  return <>
    <FileDropzone accept="application/pdf,.pdf" disabled={busy} onInvalid={setError} onFiles={(selected) => setFile(selected[0])} title={file ? file.name : 'Choose a PDF to organize'} hint="Page previews are created locally in your browser." />
    {file && <section className="work-card">
      <div className="section-head"><div><span className="eyebrow">PAGE ARRANGEMENT</span><h2>Reorder, rotate or remove pages</h2></div><span className="muted-count">{arrangement.length} kept</span></div>
      {previewLoading && <p className="inline-status">Preparing page previews…</p>}
      {previewError && <p className="inline-error">{previewError}</p>}
      {!previewLoading && arrangement.length > 0 && <div className="organize-grid">
        {arrangement.map((item, index) => <article className="organize-page" key={`${item.originalIndex}-${index}`}>
          <div className="thumb-wrap"><img src={previewByNumber.get(item.originalIndex)} alt={`Preview of original page ${item.originalIndex + 1}`} style={{ transform: `rotate(${item.rotation}deg)` }} /><span className="thumb-order">{String(index + 1).padStart(2, '0')}</span></div>
          <div className="organize-page-label"><strong>Page {item.originalIndex + 1}</strong><span>Position {index + 1}</span></div>
          <div className="organize-actions">
            <button className="icon-button" aria-label={`Move page ${item.originalIndex + 1} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
            <button className="icon-button" aria-label={`Move page ${item.originalIndex + 1} down`} disabled={busy || index === arrangement.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
            <button className="icon-button" aria-label={`Rotate page ${item.originalIndex + 1} counterclockwise`} disabled={busy} onClick={() => rotate(index, -90)}><RotateCcw size={15} /></button>
            <button className="icon-button" aria-label={`Rotate page ${item.originalIndex + 1} clockwise`} disabled={busy} onClick={() => rotate(index, 90)}><RotateCw size={15} /></button>
            <button className="icon-button danger-icon" aria-label={`Delete page ${item.originalIndex + 1}`} disabled={busy} onClick={() => remove(index)}><Trash2 size={15} /></button>
          </div>
        </article>)}
      </div>}
      <div className="button-row"><button className="button button-quiet" disabled={busy} onClick={reset}><RotateCcw size={16} /> Reset</button><button className="button button-primary" disabled={busy || previewLoading || arrangement.length === 0} onClick={save}><Download size={17} /> Export organized PDF</button></div>
    </section>}
    <Feedback error={error} success={success} busy={busy} busyLabel="Saving your page changes…" />
  </>;
}
