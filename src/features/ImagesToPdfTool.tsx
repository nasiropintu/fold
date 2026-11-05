import { useState } from 'react';
import { Download, ImagePlus, RotateCcw } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import SortableFileList from '../components/SortableFileList';
import { downloadBytes, imagesToPdf, PageOrientation, PageSizing } from '../lib/pdf';

export default function ImagesToPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [sizing, setSizing] = useState<PageSizing>('fit');
  const [orientation, setOrientation] = useState<PageOrientation>('auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const reset = () => { setFiles([]); setError(''); setSuccess(''); };
  const convert = async () => {
    setError(''); setSuccess(''); setBusy(true);
    try {
      const output = await imagesToPdf(files, sizing, orientation);
      downloadBytes(output, 'fold-images.pdf');
      setSuccess(`${files.length} images converted into a ${((output.byteLength / 1024 / 1024).toFixed(2))} MB PDF. Download started.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not convert these images.'); }
    finally { setBusy(false); }
  };
  return <>
    <FileDropzone accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple disabled={busy} onInvalid={setError} onFiles={(selected) => { setFiles((current) => [...current, ...selected]); setError(''); setSuccess(''); }} title="Drop JPG or PNG images" hint="Up to 50 images · 30 MB each · 40 megapixels each. Reorder them before conversion." />
    {files.length > 0 && <section className="work-card">
      <div className="section-head"><div><span className="eyebrow">IMAGE ORDER</span><h2>Arrange your pages</h2></div><span className="muted-count">{files.length} images</span></div>
      <SortableFileList files={files} onChange={setFiles} image disabled={busy} />
      <div className="options-grid">
        <label className="form-field"><span>Page size</span><select disabled={busy} value={sizing} onChange={(event) => setSizing(event.target.value as PageSizing)}><option value="fit">Fit to image</option><option value="a4">A4</option></select><small>Fit keeps each image's proportions on its own page.</small></label>
        <label className="form-field"><span>Orientation</span><select disabled={busy} value={orientation} onChange={(event) => setOrientation(event.target.value as PageOrientation)}><option value="auto">Match image</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select><small>Images are centered and scaled without stretching.</small></label>
      </div>
      <div className="button-row"><button className="button button-quiet" disabled={busy} onClick={reset}><RotateCcw size={16} /> Reset</button><button className="button button-primary" disabled={busy} onClick={convert}><ImagePlus size={17} /> Make PDF <Download size={15} /></button></div>
    </section>}
    <Feedback error={error} success={success} busy={busy} busyLabel="Building your image PDF…" />
  </>;
}
