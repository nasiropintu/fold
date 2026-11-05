import { useState } from 'react';
import { ArrowRight, Combine, RotateCcw } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import SortableFileList from '../components/SortableFileList';
import { downloadBytes, formatBytes, mergePdfs } from '../lib/pdf';

export default function MergeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reset = () => { setFiles([]); setError(''); setSuccess(''); };
  const merge = async () => {
    setError(''); setSuccess(''); setBusy(true);
    try {
      const result = await mergePdfs(files);
      downloadBytes(result, 'fold-merged.pdf');
      setSuccess(`${files.length} PDFs combined into one ${formatBytes(result.byteLength)} file. Download started.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong while merging the PDFs.');
    } finally { setBusy(false); }
  };

  return <>
    <FileDropzone accept="application/pdf,.pdf" multiple disabled={busy} onInvalid={setError} onFiles={(selected) => { setFiles((current) => [...current, ...selected]); setError(''); setSuccess(''); }} title="Drop PDFs to combine" hint="Add at least two PDFs. Your files stay in this browser." />
    {files.length > 0 && <section className="work-card">
      <div className="section-head"><div><span className="eyebrow">MERGE ORDER</span><h2>Arrange your files</h2></div><span className="muted-count">{files.length} files</span></div>
      <p className="section-hint">The first file becomes the first section of your combined PDF.</p>
      <SortableFileList files={files} onChange={setFiles} disabled={busy} />
      <div className="button-row"><button className="button button-quiet" disabled={busy} onClick={reset}><RotateCcw size={16} /> Reset</button><button className="button button-primary" disabled={files.length < 2 || busy} onClick={merge}><Combine size={17} /> Merge PDFs <ArrowRight size={16} /></button></div>
      {files.length === 1 && <p className="field-note">Add one more PDF to enable merging.</p>}
    </section>}
    <Feedback error={error} success={success} busy={busy} busyLabel="Merging your PDFs…" />
  </>;
}
