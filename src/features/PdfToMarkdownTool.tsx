import { useEffect, useState } from 'react';
import { Copy, Download, FileText, RotateCcw, Check } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBlob, inspectPdf, parsePageRanges } from '../lib/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type TextItemRecord = {
  str: string;
  x: number;
  y: number;
  height: number;
  width: number;
};

export default function PdfToMarkdownTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageRange, setPageRange] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(0);
    setMarkdown('');
    setError('');
    setSuccess('');
    if (file) {
      inspectPdf(file)
        .then((count) => {
          if (active) {
            setPageCount(count);
            setPageRange(`1-${count}`);
          }
        })
        .catch((err) => {
          if (active) setError(err.message || 'Could not inspect PDF.');
        });
    }
    return () => {
      active = false;
    };
  }, [file]);

  const handleConvert = async () => {
    if (!file || pageCount < 1) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setProgressVal(10);

    try {
      const pageIndices = parsePageRanges(pageRange || `1-${pageCount}`, pageCount);
      if (pageIndices.length === 0) throw new Error('Please select at least one page.');

      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      
      const markdownSections: string[] = [];

      for (let i = 0; i < pageIndices.length; i++) {
        const pageNum = pageIndices[i] + 1;
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const rawItems: TextItemRecord[] = [];
        for (const raw of textContent.items) {
          if ('str' in raw && raw.str.trim().length > 0) {
            const tx = raw.transform[4];
            const ty = raw.transform[5];
            const height = Math.abs(raw.transform[3]) || Math.abs(raw.transform[0]) || 10;
            rawItems.push({
              str: raw.str,
              x: tx,
              y: ty,
              height,
              width: raw.width || 0,
            });
          }
        }

        // Group into lines by Y coordinate (PDF Y coordinates go up, tolerance ~4pt)
        const lineBuckets: { y: number; height: number; items: TextItemRecord[] }[] = [];
        for (const item of rawItems) {
          let matched = false;
          for (const bucket of lineBuckets) {
            if (Math.abs(bucket.y - item.y) <= 4) {
              bucket.items.push(item);
              bucket.y = (bucket.y + item.y) / 2;
              bucket.height = Math.max(bucket.height, item.height);
              matched = true;
              break;
            }
          }
          if (!matched) {
            lineBuckets.push({ y: item.y, height: item.height, items: [item] });
          }
        }

        // Sort lines top-to-bottom (descending Y in PDF coordinates)
        lineBuckets.sort((a, b) => b.y - a.y);

        const pageLines: string[] = [];
        for (const bucket of lineBuckets) {
          // Sort items in line from left to right
          bucket.items.sort((a, b) => a.x - b.x);
          const lineText = bucket.items.map((it) => it.str).join(' ').trim();
          if (!lineText) continue;

          // Detect headings by font height
          if (bucket.height >= 22) {
            pageLines.push(`\n# ${lineText}\n`);
          } else if (bucket.height >= 17) {
            pageLines.push(`\n## ${lineText}\n`);
          } else if (bucket.height >= 14) {
            pageLines.push(`\n### ${lineText}\n`);
          } else {
            pageLines.push(lineText);
          }
        }

        if (pageLines.length > 0) {
          markdownSections.push(`<!-- Page ${pageNum} -->\n` + pageLines.join('\n'));
        }
        
        page.cleanup();
        setProgressVal(10 + Math.round(((i + 1) / pageIndices.length) * 85));
      }

      await doc.destroy();
      const finalMd = markdownSections.join('\n\n---\n\n');
      setMarkdown(finalMd);
      setSuccess(`Extracted markdown from ${pageIndices.length} page${pageIndices.length > 1 ? 's' : ''}!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to convert PDF to Markdown.';
      setError(message);
    } finally {
      setBusy(false);
      setProgressVal(100);
    }
  };

  const handleCopy = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!markdown || !file) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(blob, `${nameWithoutExt}.md`);
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setPageRange('');
    setMarkdown('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <FileText size={12} />
          <span>PHASE 3 · DOCUMENT CONVERSION</span>
        </div>
        <h2>PDF to Markdown</h2>
        <p>Extract clean, formatted Markdown from your PDF document with automatic heading and paragraph detection.</p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={(files) => files[0] && setFile(files[0])}
          title="Drop your PDF here"
          hint="Convert structure and text into clean Markdown (.md)"
        />
      ) : (
        <div className="tool-card-box">
          <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{file.name}</strong>
              <span className="subtext" style={{ marginLeft: 8 }}>({pageCount} pages)</span>
            </div>
            <button className="text-button" onClick={reset} disabled={busy}>
              <RotateCcw size={14} /> Change file
            </button>
          </div>

          <div className="tool-section" style={{ marginTop: 16 }}>
            <label className="tool-label">Pages to Convert</label>
            <input
              type="text"
              className="text-input"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g. 1-5, 8"
              disabled={busy}
            />
            <span className="subtext">Specify page numbers or ranges (e.g. 1-3, 5).</span>
          </div>

          {!markdown && (
            <div style={{ marginTop: 20 }}>
              <button className="primary-action-btn" onClick={handleConvert} disabled={busy}>
                <FileText size={16} />
                <span>{busy ? 'Extracting Markdown…' : 'Convert to Markdown'}</span>
              </button>
            </div>
          )}

          {markdown && (
            <div className="tool-section" style={{ marginTop: 24 }}>
              <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="tool-label" style={{ margin: 0 }}>Markdown Output</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="secondary-action-btn" onClick={handleCopy}>
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button className="secondary-action-btn" onClick={handleDownload}>
                    <Download size={14} />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>
              <textarea
                className="code-preview-area"
                rows={16}
                value={markdown}
                readOnly
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--border-color, #e5e7eb)',
                  background: 'var(--card-bg, #ffffff)',
                  resize: 'vertical',
                }}
              />
            </div>
          )}
        </div>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel="Analyzing text structures & converting to Markdown…"
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
