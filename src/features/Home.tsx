import { ArrowUpRight, Binary, FileImage, Combine, EyeOff, FileCheck, FileDiff, Files, ImagePlus, PenTool, Scissors, Stamp, WandSparkles, ScanText, FileSpreadsheet, Sparkles, FileText, Workflow, CheckCircle } from 'lucide-react';

type ToolKey =
  | 'home'
  | 'merge'
  | 'split'
  | 'organize'
  | 'images'
  | 'compress'
  | 'export'
  | 'sign'
  | 'watermark'
  | 'page-numbers'
  | 'compare'
  | 'ocr'
  | 'redact'
  | 'forms'
  | 'markdown'
  | 'excel'
  | 'summarizer'
  | 'workflow';

type Props = { onSelect: (key: ToolKey) => void };

const cards = [
  { key: 'merge' as const, title: 'Merge PDFs', detail: 'Make one file from many.', icon: Combine, number: '01', color: 'blue' },
  { key: 'split' as const, title: 'Split & extract', detail: 'Keep just the pages you need.', icon: Scissors, number: '02', color: 'orange' },
  { key: 'organize' as const, title: 'Organize pages', detail: 'Reorder, rotate or remove.', icon: Files, number: '03', color: 'violet' },
  { key: 'images' as const, title: 'Images to PDF', detail: 'Make a PDF from JPG or PNG.', icon: ImagePlus, number: '04', color: 'green' },
  { key: 'compress' as const, title: 'Compress PDF', detail: 'A lighter copy, your quality choice.', icon: WandSparkles, number: '05', color: 'pink' },
  { key: 'export' as const, title: 'PDF to images', detail: 'Save pages as JPG or PNG.', icon: FileImage, number: '06', color: 'yellow' },
  { key: 'sign' as const, title: 'Sign PDF', detail: 'Draw, type, or stamp your signature.', icon: PenTool, number: '07', color: 'green' },
  { key: 'watermark' as const, title: 'Watermark PDF', detail: 'Stamp text or custom logos.', icon: Stamp, number: '08', color: 'blue' },
  { key: 'page-numbers' as const, title: 'Page numbers', detail: 'Add header or footer pagination.', icon: Binary, number: '09', color: 'orange' },
  { key: 'compare' as const, title: 'Compare PDFs', detail: 'Pixel-level visual document diff.', icon: FileDiff, number: '10', color: 'violet' },
  { key: 'ocr' as const, title: 'OCR PDF', detail: 'Extract text via in-browser vision.', icon: ScanText, number: '11', color: 'green' },
  { key: 'redact' as const, title: 'Redact PDF', detail: 'Permanently purge confidential data.', icon: EyeOff, number: '12', color: 'pink' },
  { key: 'forms' as const, title: 'Fill Forms', detail: 'Fill, edit & flatten AcroForms.', icon: FileCheck, number: '13', color: 'blue' },
  { key: 'markdown' as const, title: 'PDF to Markdown', detail: 'Clean structured text & headings.', icon: FileText, number: '14', color: 'orange' },
  { key: 'excel' as const, title: 'PDF & Excel', detail: 'Convert tables & spreadsheets.', icon: FileSpreadsheet, number: '15', color: 'green' },
  { key: 'summarizer' as const, title: 'AI Summarizer', detail: 'Local on-device text distillation.', icon: Sparkles, number: '16', color: 'violet' },
  { key: 'workflow' as const, title: 'Workflow Automator', detail: 'Chain multi-operation pipelines.', icon: Workflow, number: '17', color: 'blue' },
];

export default function Home({ onSelect }: Props) {
  return (
    <div className="home-view">
      <section className="hero-panel">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-paper">
          <span />
          <span />
          <span />
          <span className="paper-fold" />
        </div>
        <div className="hero-content">
          <span className="hero-kicker">
            <span className="hero-spark">✳</span> THE COMPLETE PDF WORKBENCH
          </span>
          <h1>
            Good documents.<br />
            <em>Less busywork.</em>
          </h1>
          <p>Everyday PDF tasks, conversions, and local AI without the detour. Pick a tool, make your change, take your file back.</p>
          <button className="hero-cta" onClick={() => onSelect('merge')}>
            Start with a PDF <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="hero-annotation">
          <span className="annotation-line" />
          PRIVATE, LOCAL<br />& READY TO FOLD
        </div>
        <div className="hero-serial">FOLD / FILES / 01</div>
      </section>

      <div className="home-section-head">
        <div>
          <span className="eyebrow">THE TOOL SHELF</span>
          <h2>What are we working on?</h2>
        </div>
        <span className="tool-count">17 <span>TOOLS</span></span>
      </div>

      <section className="tool-card-grid" aria-label="PDF tools">
        {cards.map(({ key, title, detail, icon: Icon, number, color }) => (
          <button className={`tool-card accent-${color}`} key={key} onClick={() => onSelect(key)}>
            <span className="tool-card-top">
              <span className="tool-card-number">{number} / TASK</span>
              <ArrowUpRight className="tool-card-arrow" size={18} />
            </span>
            <span className="tool-icon">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <strong>{title}</strong>
            <span className="tool-card-detail">{detail}</span>
          </button>
        ))}
      </section>

      <section className="home-bottom-row">
        <div className="locality-panel">
          <span className="locality-seal">
            <span>F</span>
            <i />
          </span>
          <div>
            <span className="eyebrow">YOUR FILES, YOUR DEVICE</span>
            <h3>Private from first click.</h3>
            <p>All PDF parsing, conversion, and processing runs inside this browser tab. Zero server uploads.</p>
          </div>
          <span className="locality-caption">NO SERVER<br />NO ACCOUNT<br />NO SURPRISES</span>
        </div>

        <div className="later-panel">
          <span className="eyebrow">PHASE 1, 2 & 3 COMPLETE</span>
          <h3>All 17 Tools Unlocked.</h3>
          <div className="later-item">
            <CheckCircle size={15} color="#10b981" />
            <span>PDF to Markdown & Excel Tools</span>
            <span className="later-tag" style={{ background: '#ecfdf5', color: '#059669' }}>READY</span>
          </div>
          <div className="later-item">
            <CheckCircle size={15} color="#10b981" />
            <span>Local AI Summarizer & Workflow Chain</span>
            <span className="later-tag" style={{ background: '#ecfdf5', color: '#059669' }}>READY</span>
          </div>
        </div>
      </section>
    </div>
  );
}
