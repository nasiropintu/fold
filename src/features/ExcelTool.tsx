import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, RotateCcw, ArrowRightLeft } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBlob, downloadBytes, inspectPdf, parsePageRanges } from '../lib/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type ConversionMode = 'pdf-to-excel' | 'excel-to-pdf';

type TextItemRecord = {
  str: string;
  x: number;
  y: number;
};

export default function ExcelTool() {
  const [mode, setMode] = useState<ConversionMode>('pdf-to-excel');
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageRange, setPageRange] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(0);
    setError('');
    setSuccess('');
    if (file && mode === 'pdf-to-excel') {
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
  }, [file, mode]);

  const switchMode = (newMode: ConversionMode) => {
    setMode(newMode);
    setFile(null);
    setPageCount(0);
    setPageRange('');
    setError('');
    setSuccess('');
  };

  const handlePdfToExcel = async () => {
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

      const wb = XLSX.utils.book_new();

      for (let i = 0; i < pageIndices.length; i++) {
        const pageNum = pageIndices[i] + 1;
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();

        const items: TextItemRecord[] = [];
        for (const raw of textContent.items) {
          if ('str' in raw && raw.str.trim().length > 0) {
            items.push({
              str: raw.str.trim(),
              x: raw.transform[4],
              y: raw.transform[5],
            });
          }
        }

        // Group into rows by Y coordinate (tolerance ~6pt)
        const rowBuckets: { y: number; items: TextItemRecord[] }[] = [];
        for (const item of items) {
          let matched = false;
          for (const bucket of rowBuckets) {
            if (Math.abs(bucket.y - item.y) <= 6) {
              bucket.items.push(item);
              bucket.y = (bucket.y + item.y) / 2;
              matched = true;
              break;
            }
          }
          if (!matched) {
            rowBuckets.push({ y: item.y, items: [item] });
          }
        }

        // Sort rows top-to-bottom (descending Y)
        rowBuckets.sort((a, b) => b.y - a.y);

        // Convert each row into tabular cells (sorted left-to-right)
        const sheetRows: string[][] = [];
        for (const bucket of rowBuckets) {
          bucket.items.sort((a, b) => a.x - b.x);
          
          // Simple clustering: if gap between items > 25pt, treat as next column
          const rowCells: string[] = [];
          let currentCell = '';
          let lastX = -1;

          for (const item of bucket.items) {
            if (lastX === -1 || item.x - lastX < 25) {
              currentCell = currentCell ? `${currentCell} ${item.str}` : item.str;
            } else {
              if (currentCell) rowCells.push(currentCell);
              currentCell = item.str;
            }
            lastX = item.x;
          }
          if (currentCell) rowCells.push(currentCell);
          sheetRows.push(rowCells);
        }

        const ws = XLSX.utils.aoa_to_sheet(sheetRows.length > 0 ? sheetRows : [['(Empty Page)']]);
        XLSX.utils.book_append_sheet(wb, ws, `Page ${pageNum}`);
        page.cleanup();
        setProgressVal(10 + Math.round(((i + 1) / pageIndices.length) * 80));
      }

      await doc.destroy();

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      downloadBlob(blob, `${nameWithoutExt}.xlsx`);

      setSuccess('Successfully converted PDF tables to Excel (.xlsx)!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to convert PDF to Excel.';
      setError(message);
    } finally {
      setBusy(false);
      setProgressVal(100);
    }
  };

  const handleExcelToPdf = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setProgressVal(20);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      if (workbook.SheetNames.length === 0) throw new Error('Excel workbook contains no sheets.');

      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

      if (rawData.length === 0) throw new Error('Spreadsheet appears to be empty.');

      setProgressVal(40);

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Normalize row widths
      const maxCols = Math.max(...rawData.map((r) => (Array.isArray(r) ? r.length : 0)), 1);
      const normalizedRows: string[][] = rawData.map((row) => {
        const rowArr = Array.isArray(row) ? row : [];
        const result: string[] = [];
        for (let c = 0; c < maxCols; c++) {
          result.push(rowArr[c] !== undefined && rowArr[c] !== null ? String(rowArr[c]) : '');
        }
        return result;
      });

      // Page dimensions (A4 Landscape for table readability)
      const pageWidth = 841.89;
      const pageHeight = 595.28;
      const margin = 36;
      const usableWidth = pageWidth - margin * 2;
      const colWidth = usableWidth / maxCols;
      const rowHeight = 22;
      const fontSize = Math.max(7, Math.min(10, Math.floor(180 / maxCols)));
      const rowsPerPage = Math.floor((pageHeight - margin * 2 - 40) / rowHeight);

      let currentPageIndex = 0;
      let totalPages = Math.ceil(normalizedRows.length / rowsPerPage) || 1;

      for (let start = 0; start < normalizedRows.length; start += rowsPerPage) {
        currentPageIndex++;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const pageRows = normalizedRows.slice(start, start + rowsPerPage);

        // Header title
        page.drawText(`${file.name} — ${firstSheetName} (Page ${currentPageIndex} of ${totalPages})`, {
          x: margin,
          y: pageHeight - margin + 10,
          size: 10,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        });

        let currentY = pageHeight - margin - 15;

        for (let rIdx = 0; rIdx < pageRows.length; rIdx++) {
          const rowData = pageRows[rIdx];
          const isHeader = start === 0 && rIdx === 0;

          // Draw row background for header
          if (isHeader) {
            page.drawRectangle({
              x: margin,
              y: currentY - rowHeight + 4,
              width: usableWidth,
              height: rowHeight,
              color: rgb(0.92, 0.94, 0.98),
            });
          }

          for (let cIdx = 0; cIdx < maxCols; cIdx++) {
            const cellText = rowData[cIdx] || '';
            const cellX = margin + cIdx * colWidth;

            // Draw cell borders
            page.drawRectangle({
              x: cellX,
              y: currentY - rowHeight + 4,
              width: colWidth,
              height: rowHeight,
              borderColor: rgb(0.85, 0.85, 0.85),
              borderWidth: 0.5,
            });

            // Draw text (truncate if too wide)
            const maxChars = Math.max(4, Math.floor(colWidth / (fontSize * 0.55)));
            const displayText = cellText.length > maxChars ? cellText.substring(0, maxChars - 2) + '…' : cellText;

            if (displayText) {
              page.drawText(displayText, {
                x: cellX + 4,
                y: currentY - rowHeight + 10,
                size: fontSize,
                font: isHeader ? fontBold : fontRegular,
                color: isHeader ? rgb(0.1, 0.2, 0.5) : rgb(0.15, 0.15, 0.15),
              });
            }
          }

          currentY -= rowHeight;
        }

        setProgressVal(40 + Math.round((currentPageIndex / totalPages) * 55));
      }

      const pdfBytes = await pdfDoc.save();
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      downloadBytes(pdfBytes, `${nameWithoutExt}.pdf`);

      setSuccess('Successfully generated PDF from Excel spreadsheet!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to convert Excel to PDF.';
      setError(message);
    } finally {
      setBusy(false);
      setProgressVal(100);
    }
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <FileSpreadsheet size={12} />
          <span>PHASE 3 · SPREADSHEET CONVERSIONS</span>
        </div>
        <h2>PDF & Excel Converter</h2>
        <p>Convert PDF tabular data into Microsoft Excel (.xlsx) spreadsheets, or turn Excel files into structured PDFs.</p>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`secondary-action-btn ${mode === 'pdf-to-excel' ? 'active-pill' : ''}`}
          onClick={() => switchMode('pdf-to-excel')}
          disabled={busy}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            background: mode === 'pdf-to-excel' ? 'var(--accent, #3b82f6)' : 'transparent',
            color: mode === 'pdf-to-excel' ? '#ffffff' : 'inherit',
            border: '1px solid var(--border-color, #d1d5db)',
          }}
        >
          <FileSpreadsheet size={15} style={{ marginRight: 6 }} />
          PDF to Excel (.xlsx)
        </button>
        <button
          className={`secondary-action-btn ${mode === 'excel-to-pdf' ? 'active-pill' : ''}`}
          onClick={() => switchMode('excel-to-pdf')}
          disabled={busy}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            background: mode === 'excel-to-pdf' ? 'var(--accent, #3b82f6)' : 'transparent',
            color: mode === 'excel-to-pdf' ? '#ffffff' : 'inherit',
            border: '1px solid var(--border-color, #d1d5db)',
          }}
        >
          <ArrowRightLeft size={15} style={{ marginRight: 6 }} />
          Excel to PDF (.pdf)
        </button>
      </div>

      {!file ? (
        <FileDropzone
          accept={mode === 'pdf-to-excel' ? '.pdf' : '.xlsx,.xls,.csv'}
          disabled={busy}
          onInvalid={setError}
          onFiles={(files) => files[0] && setFile(files[0])}
          title={mode === 'pdf-to-excel' ? 'Drop your PDF here' : 'Drop your Excel or CSV file here'}
          hint={mode === 'pdf-to-excel' ? 'Extract tabular data into an Excel spreadsheet (.xlsx)' : 'Convert your spreadsheet into a paginated PDF document'}
        />
      ) : (
        <div className="tool-card-box">
          <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{file.name}</strong>
              {mode === 'pdf-to-excel' && pageCount > 0 && (
                <span className="subtext" style={{ marginLeft: 8 }}>({pageCount} pages)</span>
              )}
            </div>
            <button className="text-button" onClick={() => setFile(null)} disabled={busy}>
              <RotateCcw size={14} /> Change file
            </button>
          </div>

          {mode === 'pdf-to-excel' && (
            <div className="tool-section" style={{ marginTop: 16 }}>
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
          )}

          <div style={{ marginTop: 20 }}>
            <button
              className="primary-action-btn"
              onClick={mode === 'pdf-to-excel' ? handlePdfToExcel : handleExcelToPdf}
              disabled={busy}
            >
              <Download size={16} />
              <span>{busy ? 'Converting…' : mode === 'pdf-to-excel' ? 'Export as Excel (.xlsx)' : 'Export as PDF'}</span>
            </button>
          </div>
        </div>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel={mode === 'pdf-to-excel' ? 'Parsing tabular lines & building Excel sheets…' : 'Formatting grid & generating PDF pages…'}
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
