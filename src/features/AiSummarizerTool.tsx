import { useEffect, useState } from 'react';
import { Copy, Download, RotateCcw, Sparkles, ChevronDown, ChevronUp, Check, Cpu } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBlob, inspectPdf, parsePageRanges } from '../lib/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type SummaryLength = 'brief' | 'standard' | 'comprehensive';

interface AiSummarizerInstance {
  summarize: (text: string) => Promise<string>;
  destroy?: () => void;
}

interface WindowWithAi extends Window {
  ai?: {
    summarizer?: {
      capabilities?: () => Promise<{ available: string }>;
      create?: (options?: { type?: string; length?: string; format?: string }) => Promise<AiSummarizerInstance>;
    };
  };
}

export default function AiSummarizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageRange, setPageRange] = useState('');
  const [length, setLength] = useState<SummaryLength>('standard');
  const [fullText, setFullText] = useState('');
  const [summary, setSummary] = useState('');
  const [engineUsed, setEngineUsed] = useState<'chrome-ai' | 'algorithmic' | null>(null);
  const [showFullText, setShowFullText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(0);
    setFullText('');
    setSummary('');
    setEngineUsed(null);
    setError('');
    setSuccess('');
    if (file) {
      inspectPdf(file)
        .then((count) => {
          if (active) {
            setPageCount(count);
            setPageRange(`1-${Math.min(count, 10)}`);
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

  const extractText = async (): Promise<string> => {
    if (!file) return '';
    const pageIndices = parsePageRanges(pageRange || `1-${pageCount}`, pageCount);
    if (pageIndices.length === 0) throw new Error('Please select at least one page.');

    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const pageTexts: string[] = [];

    for (let i = 0; i < pageIndices.length; i++) {
      const pageNum = pageIndices[i] + 1;
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items
        .filter((it) => 'str' in it)
        .map((it) => (it as { str: string }).str)
        .join(' ');
      
      if (pageStr.trim()) pageTexts.push(pageStr.trim());
      page.cleanup();
      setProgressVal(10 + Math.round(((i + 1) / pageIndices.length) * 40));
    }

    await doc.destroy();
    return pageTexts.join('\n\n');
  };

  const summarizeAlgorithmic = (text: string, len: SummaryLength): string => {
    // 1. Split into sentences
    const rawSentences = text
      .replace(/\r\n|\r|\n/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);

    if (rawSentences.length <= 3) {
      return rawSentences.join(' ');
    }

    // 2. Frequency map of significant words
    const stopWords = new Set([
      'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'which',
      'will', 'would', 'there', 'their', 'about', 'when', 'what', 'some', 'other',
      'into', 'more', 'also', 'than', 'been', 'then', 'them', 'these', 'could', 'such',
    ]);
    const wordFreq: Record<string, number> = {};
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    for (const w of words) {
      if (!stopWords.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }

    // 3. Score sentences
    const targetCount = len === 'brief' ? 3 : len === 'standard' ? 5 : 8;
    const scored = rawSentences.map((sentence, index) => {
      const sentenceWords = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      let score = 0;
      for (const w of sentenceWords) {
        score += wordFreq[w] || 0;
      }
      // Position boost: first and last sentences often carry core thesis
      if (index === 0 || index === 1) score *= 1.4;
      if (index === rawSentences.length - 1) score *= 1.2;

      // Length penalty: too short or exceedingly long
      if (sentenceWords.length < 6) score *= 0.5;
      if (sentenceWords.length > 50) score *= 0.8;

      return { sentence, index, score: score / (sentenceWords.length || 1) };
    });

    // 4. Select top sentences and restore original order
    const topSentences = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .sort((a, b) => a.index - b.index)
      .map((item) => `• ${item.sentence}`);

    return topSentences.join('\n\n');
  };

  const handleSummarize = async () => {
    if (!file || pageCount < 1) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setProgressVal(10);

    try {
      const extracted = await extractText();
      if (!extracted.trim()) {
        throw new Error('No readable text found in the selected pages. If this is a scan, please use the OCR PDF tool first.');
      }
      setFullText(extracted);
      setProgressVal(60);

      // Attempt Chrome Built-in AI
      const win = window as WindowWithAi;
      let summaryText = '';
      let usedChrome = false;

      if (win.ai?.summarizer?.create) {
        try {
          const chromeSummarizer = await win.ai.summarizer.create({
            type: 'tl;dr',
            length: length === 'brief' ? 'short' : length === 'standard' ? 'medium' : 'long',
            format: 'markdown',
          });
          summaryText = await chromeSummarizer.summarize(extracted);
          if (chromeSummarizer.destroy) chromeSummarizer.destroy();
          usedChrome = true;
        } catch {
          // Fall through to algorithmic summarizer
          usedChrome = false;
        }
      }

      if (!summaryText) {
        summaryText = summarizeAlgorithmic(extracted, length);
        usedChrome = false;
      }

      setSummary(summaryText);
      setEngineUsed(usedChrome ? 'chrome-ai' : 'algorithmic');
      setSuccess('Summary generated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to summarize PDF.';
      setError(message);
    } finally {
      setBusy(false);
      setProgressVal(100);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summary || !file) return;
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(blob, `${nameWithoutExt}-summary.txt`);
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setPageRange('');
    setFullText('');
    setSummary('');
    setEngineUsed(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <Sparkles size={12} />
          <span>PHASE 3 · LOCAL INTELLIGENCE</span>
        </div>
        <h2>Local AI Summarizer</h2>
        <p>Synthesize document highlights 100% on-device with zero server calls. Supports Chrome Built-in AI with smart algorithmic fallback.</p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={(files) => files[0] && setFile(files[0])}
          title="Drop your PDF here to summarize"
          hint="Distills long documents, papers, and contracts into executive takeaways"
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
            <div>
              <label className="tool-label">Pages to Analyze</label>
              <input
                type="text"
                className="text-input"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1-10"
                disabled={busy}
              />
              <span className="subtext">Default: first 10 pages for optimal speed.</span>
            </div>

            <div>
              <label className="tool-label">Summary Depth</label>
              <select
                className="select-input"
                value={length}
                onChange={(e) => setLength(e.target.value as SummaryLength)}
                disabled={busy}
              >
                <option value="brief">Brief (~3 key bullets)</option>
                <option value="standard">Standard (~5 key takeaways)</option>
                <option value="comprehensive">Comprehensive (~8 key points)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="primary-action-btn" onClick={handleSummarize} disabled={busy}>
              <Sparkles size={16} />
              <span>{busy ? 'Summarizing Document…' : 'Generate Summary'}</span>
            </button>
          </div>

          {summary && (
            <div className="tool-section" style={{ marginTop: 24 }}>
              <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="tool-label" style={{ margin: 0 }}>Document Summary</label>
                  {engineUsed === 'chrome-ai' ? (
                    <span className="tag-pill" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                      <Sparkles size={11} style={{ marginRight: 4 }} /> Chrome Built-in AI
                    </span>
                  ) : (
                    <span className="tag-pill" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                      <Cpu size={11} style={{ marginRight: 4 }} /> On-Device Algorithmic
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="secondary-action-btn" onClick={handleCopy}>
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button className="secondary-action-btn" onClick={handleDownload}>
                    <Download size={14} />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: 8,
                  padding: 16,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.95rem',
                }}
              >
                {summary}
              </div>

              {fullText && (
                <div style={{ marginTop: 14 }}>
                  <button
                    className="text-button"
                    onClick={() => setShowFullText(!showFullText)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    {showFullText ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showFullText ? 'Hide extracted text' : 'View extracted document text'}
                  </button>
                  {showFullText && (
                    <textarea
                      className="code-preview-area"
                      rows={8}
                      value={fullText}
                      readOnly
                      style={{
                        width: '100%',
                        marginTop: 8,
                        fontSize: '0.8rem',
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid var(--border-color, #e5e7eb)',
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel="Extracting semantics & generating local summary…"
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
