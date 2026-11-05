import { useRef, useState } from 'react';
import { Download, FileDown, RotateCcw, Sparkles } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { compressPdfRasterized, downloadBytes, formatBytes } from '../lib/pdf';

type Preset = 'smaller' | 'balanced' | 'sharper';
const settings: Record<Preset, { label: string; detail: string; dpi: number; quality: number }> = {
  smaller: { label: 'Smaller file', detail: '72 DPI · most compact', dpi: 72, quality: 0.5 },
  balanced: { label: 'Balanced', detail: '110 DPI · everyday use', dpi: 110, quality: 0.68 },
  sharper: { label: 'Sharper', detail: '150 DPI · more detail', dpi: 150, quality: 0.82 },
};

export default function CompressTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<Preset>('balanced');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [outputSize, setOutputSize] = useState<number>();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const abortController = useRef<AbortController | null>(null);
  const reset = () => { setFile(null); setOutputSize(undefined); setProgress(undefined); setError(''); setSuccess(''); };
  const compress = async () => {
    if (!file) return;
    setError(''); setSuccess(''); setOutputSize(undefined); setProgress(0); setBusy(true);
    const controller = new AbortController();
    abortController.current = controller;
    try {
      const selected = settings[preset];
      const output = await compressPdfRasterized(file, selected.dpi, selected.quality, setProgress, controller.signal);
      setOutputSize(output.byteLength);
      const difference = file.size - output.byteLength;
      const change = Math.round((Math.abs(difference) / file.size) * 100);
      setSuccess(difference > 0 ? `File size reduced by ${change}% (${formatBytes(file.size)} → ${formatBytes(output.byteLength)}).` : difference < 0 ? `This PDF did not shrink at the selected quality (${formatBytes(file.size)} → ${formatBytes(output.byteLength)}). You can still download the rasterized copy.` : `File size stayed the same at ${formatBytes(output.byteLength)}.`);
      downloadBytes(output, `${file.name.replace(/\.pdf$/i, '')}-compressed.pdf`);
    } catch (cause) { setError(controller.signal.aborted ? 'Compression cancelled. No file was downloaded.' : cause instanceof Error ? cause.message : 'Could not compress this PDF.'); }
    finally { abortController.current = null; setBusy(false); }
  };
  return <>
    <FileDropzone accept="application/pdf,.pdf" disabled={busy} onInvalid={setError} onFiles={(selected) => { setFile(selected[0]); setOutputSize(undefined); setError(''); setSuccess(''); }} title={file ? file.name : 'Choose a PDF to compress'} hint="Compression runs here in your browser. No file upload." />
    {file && <section className="work-card">
      <div className="section-head"><div><span className="eyebrow">COMPRESSION</span><h2>Choose a quality preset</h2></div><span className="size-pill">Original · {formatBytes(file.size)}</span></div>
      <div className="preset-list">{(Object.keys(settings) as Preset[]).map((key) => <button key={key} disabled={busy} className={`preset-card${preset === key ? ' selected' : ''}`} aria-pressed={preset === key} onClick={() => setPreset(key)}><span className="preset-dot" /><strong>{settings[key].label}</strong><small>{settings[key].detail}</small></button>)}</div>
      <div className="notice"><Sparkles size={17} /><p><strong>Quality note:</strong> Compression rebuilds pages as images. Text will no longer be selectable or searchable, and some PDFs may not become smaller. The result reports the actual size change.</p></div>
      <div className="button-row"><button className="button button-quiet" disabled={busy} onClick={reset}><RotateCcw size={16} /> Reset</button><button className="button button-primary" disabled={busy} onClick={compress}><FileDown size={17} /> Compress PDF <Download size={15} /></button></div>
      {outputSize !== undefined && <div className="size-comparison"><div><span>Before</span><strong>{formatBytes(file.size)}</strong></div><span className="comparison-arrow">→</span><div><span>After</span><strong>{formatBytes(outputSize)}</strong></div></div>}
    </section>}
    <Feedback error={error} success={success} busy={busy} progress={progress} busyLabel="Rendering and compressing pages…" onCancel={() => abortController.current?.abort()} />
  </>;
}
