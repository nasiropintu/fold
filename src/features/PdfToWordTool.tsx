import { useEffect, useState } from 'react';
import { Download, FileText, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
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
};

export default function PdfToWordTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageRange, setPageRange] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(0);
    setResultBlob(null);
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

      const docChildren: Paragraph[] = [];

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
            rawItems.push({ str: raw.str, x: tx, y: ty, height });
          }
        }

        // Group into line buckets by Y coordinate (tolerance ~4pt)
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

        // Sort lines top-to-bottom
        lineBuckets.sort((a, b) => b.y - a.y);

        for (const bucket of lineBuckets) {
          // Sort items in line from left to right
          bucket.items.sort((a, b) => a.x - b.x);
          const lineText = bucket.items.map((it) => it.str).join(' ').trim();
          if (!lineText) continue;

          if (bucket.height >= 22) {
            docChildren.push(
              new Paragraph({
                text: lineText,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 240, after: 120 },
              }),
            );
          } else if (bucket.height >= 16) {
            docChildren.push(
              new Paragraph({
                text: lineText,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
            );
          } else if (bucket.height >= 13) {
            docChildren.push(
              new Paragraph({
                text: lineText,
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 160, after: 80 },
              }),
            );
          } else {
            docChildren.push(
              new Paragraph({
                children: [new TextRun({ text: lineText, size: 22 })], // 11pt font
                spacing: { after: 100 },
              }),
            );
          }
        }

        // Page break if not last page
        if (i < pageIndices.length - 1) {
          docChildren.push(
            new Paragraph({
              pageBreakBefore: true,
            }),
          );
        }

        page.cleanup();
        setProgressVal(10 + Math.round(((i + 1) / pageIndices.length) * 75));
      }

      await doc.destroy();

      const docxDocument = new Document({
        creator: 'Fold PDF Toolkit by NasirPintu',
        description: 'Converted from PDF with Fold',
        sections: [
          {
            properties: {},
            children: docChildren.length > 0 ? docChildren : [new Paragraph({ text: '(Empty document)' })],
          },
        ],
      });

      setProgressVal(90);
      const blob = await Packer.toBlob(docxDocument);
      setProgressVal(100);

      setResultBlob(blob);
      setSuccess(`Successfully converted ${pageIndices.length} page(s) to Microsoft Word (.docx)!`);

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      downloadBlob(blob, `${nameWithoutExt}.docx`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert PDF to Word.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(resultBlob, `${nameWithoutExt}.docx`);
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setPageRange('');
    setResultBlob(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <FileText size={12} />
          <span>PHASE 4 · OFFICE CONVERSION</span>
        </div>
        <h2>PDF to Word (.docx)</h2>
        <p>Convert PDF documents into editable Microsoft Word (.docx) files with heading detection, typography structure, and clean paragraph flow.</p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={(files) => files[0] && setFile(files[0])}
          title="Drop your PDF here to convert to Word"
          hint="Generates formatted Microsoft Word document (.docx)"
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

          <div style={{ marginTop: 16 }}>
            <label className="tool-label">Pages to Convert</label>
            <input
              type="text"
              className="text-input"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g. 1-5"
              disabled={busy}
            />
            <span className="subtext">Select specific pages or export the entire document.</span>
          </div>

          <div style={{ marginTop: 22, display: 'flex', gap: 12 }}>
            <button className="primary-action-btn" onClick={handleConvert} disabled={busy}>
              <Download size={16} />
              <span>{busy ? 'Converting to Word…' : 'Convert to Word (.docx)'}</span>
            </button>

            {resultBlob && (
              <button className="secondary-action-btn" onClick={handleDownload}>
                <Download size={16} />
                <span>Download .docx</span>
              </button>
            )}
          </div>
        </div>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel="Extracting semantic text runs & formatting Word document…"
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
