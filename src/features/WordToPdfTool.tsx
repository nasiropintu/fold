import { useState } from 'react';
import { Download, FileText, RotateCcw } from 'lucide-react';
import * as mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBytes, formatBytes } from '../lib/pdf';

export default function WordToPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFiles = (files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
    setResultBytes(null);
    setError('');
    setSuccess('');
  };

  const handleConvert = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setProgressVal(20);

    try {
      const buffer = await file.arrayBuffer();
      setProgressVal(40);

      const extractResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      const rawText = extractResult.value;

      if (!rawText.trim()) {
        throw new Error('The Word document does not contain readable text content.');
      }

      setProgressVal(60);

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 16;
      const fontSize = 10.5;

      const paragraphs = rawText
        .split(/\r?\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - margin - 20;

      // Header watermark / title
      currentPage.drawText(file.name.replace(/\.[^/.]+$/, ''), {
        x: margin,
        y: pageHeight - margin + 12,
        size: 9,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });

      for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
        const paragraph = paragraphs[pIdx];
        const isHeading = paragraph.length < 80 && (pIdx === 0 || paragraph.endsWith(':') || /^[A-Z0-9\s]{4,}$/.test(paragraph));

        const pFont = isHeading ? fontBold : fontRegular;
        const pSize = isHeading ? 14 : fontSize;
        const pLineHeight = isHeading ? 22 : lineHeight;

        // Word-wrapping logic
        const words = paragraph.split(/\s+/);
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = pFont.widthOfTextAtSize(testLine, pSize);

          if (textWidth <= contentWidth) {
            currentLine = testLine;
          } else {
            if (currentY - pLineHeight < margin) {
              currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
              currentY = pageHeight - margin - 20;
            }

            currentPage.drawText(currentLine, {
              x: margin,
              y: currentY,
              size: pSize,
              font: pFont,
              color: isHeading ? rgb(0.1, 0.2, 0.3) : rgb(0.15, 0.15, 0.15),
            });
            currentY -= pLineHeight;
            currentLine = word;
          }
        }

        if (currentLine) {
          if (currentY - pLineHeight < margin) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin - 20;
          }

          currentPage.drawText(currentLine, {
            x: margin,
            y: currentY,
            size: pSize,
            font: pFont,
            color: isHeading ? rgb(0.1, 0.2, 0.3) : rgb(0.15, 0.15, 0.15),
          });
          currentY -= pLineHeight + 6; // Extra space after paragraph
        }

        setProgressVal(60 + Math.round(((pIdx + 1) / paragraphs.length) * 35));
      }

      const pdfBytes = await pdfDoc.save();
      setProgressVal(100);

      setResultBytes(pdfBytes);
      setSuccess(`Successfully converted Word document to ${pdfDoc.getPageCount()}-page PDF!`);

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      downloadBytes(pdfBytes, `${nameWithoutExt}.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert Word to PDF.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    downloadBytes(resultBytes, `${nameWithoutExt}.pdf`);
  };

  const reset = () => {
    setFile(null);
    setResultBytes(null);
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
        <h2>Word to PDF</h2>
        <p>Convert Microsoft Word (.docx) documents into beautifully paginated, crisp PDF files directly inside your browser.</p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".docx"
          disabled={busy}
          onInvalid={setError}
          onFiles={handleFiles}
          title="Drop your Word file (.docx) here"
          hint="Pure client-side conversion without uploading to external servers"
        />
      ) : (
        <div className="tool-card-box">
          <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{file.name}</strong>
              <span className="subtext" style={{ marginLeft: 8 }}>({formatBytes(file.size)})</span>
            </div>
            <button className="text-button" onClick={reset} disabled={busy}>
              <RotateCcw size={14} /> Change file
            </button>
          </div>

          <div style={{ marginTop: 22, display: 'flex', gap: 12 }}>
            <button className="primary-action-btn" onClick={handleConvert} disabled={busy}>
              <Download size={16} />
              <span>{busy ? 'Formatting PDF…' : 'Convert Word to PDF'}</span>
            </button>

            {resultBytes && (
              <button className="secondary-action-btn" onClick={handleDownload}>
                <Download size={16} />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel="Parsing document structure & laying out PDF pages…"
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
