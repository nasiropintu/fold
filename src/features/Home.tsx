import { useState } from 'react';
import {
  ArrowUpRight,
  Binary,
  Camera,
  CheckCircle,
  Combine,
  Crop,
  EyeOff,
  FileCheck,
  FileCode,
  FileDiff,
  FileImage,
  FileSpreadsheet,
  Files,
  FileText,
  ImagePlus,
  Lock,
  LockOpen,
  PenTool,
  ScanText,
  Scissors,
  Sparkles,
  Stamp,
  WandSparkles,
  Workflow,
  Wrench,
} from 'lucide-react';

export type ToolKey =
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
  | 'workflow'
  | 'protect'
  | 'unlock'
  | 'crop'
  | 'pdf-to-word'
  | 'word-to-pdf'
  | 'scan'
  | 'repair';

export type ToolCategory = 'organize' | 'security' | 'conversions' | 'automation';

type Props = { onSelect: (key: ToolKey) => void };

type CardItem = {
  key: ToolKey;
  title: string;
  detail: string;
  icon: typeof Combine;
  number: string;
  color: 'blue' | 'orange' | 'violet' | 'green' | 'pink' | 'yellow';
  category: ToolCategory;
};

const cards: CardItem[] = [
  // Organize & Pages
  { key: 'merge', title: 'Merge PDFs', detail: 'Make one file from many.', icon: Combine, number: '01', color: 'blue', category: 'organize' },
  { key: 'split', title: 'Split & extract', detail: 'Keep just the pages you need.', icon: Scissors, number: '02', color: 'orange', category: 'organize' },
  { key: 'organize', title: 'Organize pages', detail: 'Reorder, rotate or remove.', icon: Files, number: '03', color: 'violet', category: 'organize' },
  { key: 'images', title: 'Images to PDF', detail: 'Make a PDF from JPG or PNG.', icon: ImagePlus, number: '04', color: 'green', category: 'organize' },
  { key: 'export', title: 'PDF to images', detail: 'Save pages as JPG or PNG.', icon: FileImage, number: '06', color: 'yellow', category: 'organize' },
  { key: 'page-numbers', title: 'Page numbers', detail: 'Add header or footer pagination.', icon: Binary, number: '09', color: 'orange', category: 'organize' },
  { key: 'crop', title: 'Rotate & Crop', detail: 'Trim margins with visual crop boxes.', icon: Crop, number: '20', color: 'orange', category: 'organize' },

  // Security & Privacy
  { key: 'sign', title: 'Sign PDF', detail: 'Draw, type, or stamp your signature.', icon: PenTool, number: '07', color: 'green', category: 'security' },
  { key: 'watermark', title: 'Watermark PDF', detail: 'Stamp text or custom logos.', icon: Stamp, number: '08', color: 'blue', category: 'security' },
  { key: 'redact', title: 'Redact PDF', detail: 'Permanently purge confidential data.', icon: EyeOff, number: '12', color: 'pink', category: 'security' },
  { key: 'protect', title: 'Protect PDF', detail: 'Lock with AES-256 password & permissions.', icon: Lock, number: '18', color: 'pink', category: 'security' },
  { key: 'unlock', title: 'Unlock PDF', detail: 'Remove passwords & restrictions.', icon: LockOpen, number: '19', color: 'green', category: 'security' },

  // Conversions & Data
  { key: 'markdown', title: 'PDF to Markdown', detail: 'Clean structured text & headings.', icon: FileText, number: '14', color: 'orange', category: 'conversions' },
  { key: 'excel', title: 'PDF & Excel', detail: 'Convert tables & spreadsheets.', icon: FileSpreadsheet, number: '15', color: 'green', category: 'conversions' },
  { key: 'compress', title: 'Compress PDF', detail: 'A lighter copy, your quality choice.', icon: WandSparkles, number: '05', color: 'pink', category: 'conversions' },
  { key: 'forms', title: 'Fill Forms', detail: 'Fill, edit & flatten AcroForms.', icon: FileCheck, number: '13', color: 'blue', category: 'conversions' },
  { key: 'pdf-to-word', title: 'PDF to Word', detail: 'Convert to editable Word (.docx).', icon: FileText, number: '21', color: 'blue', category: 'conversions' },
  { key: 'word-to-pdf', title: 'Word to PDF', detail: 'Convert Word (.docx) to PDF.', icon: FileCode, number: '22', color: 'green', category: 'conversions' },

  // Intelligence & AI
  { key: 'summarizer', title: 'AI Summarizer', detail: 'Local on-device text distillation.', icon: Sparkles, number: '16', color: 'violet', category: 'automation' },
  { key: 'ocr', title: 'OCR PDF', detail: 'Extract text via in-browser vision.', icon: ScanText, number: '11', color: 'green', category: 'automation' },
  { key: 'compare', title: 'Compare PDFs', detail: 'Pixel-level visual document diff.', icon: FileDiff, number: '10', color: 'violet', category: 'automation' },
  { key: 'workflow', title: 'Workflow Automator', detail: 'Chain multi-operation pipelines.', icon: Workflow, number: '17', color: 'blue', category: 'automation' },
  { key: 'scan', title: 'Scan to PDF', detail: 'Webcam snap & document filters.', icon: Camera, number: '23', color: 'pink', category: 'automation' },
  { key: 'repair', title: 'Repair PDF', detail: 'Rebuild broken XRef & damaged streams.', icon: Wrench, number: '24', color: 'yellow', category: 'automation' },
];

const categoryLabels: Record<ToolCategory, string> = {
  organize: 'Organize & Pages',
  security: 'Security & Privacy',
  conversions: 'Conversions & Data',
  automation: 'Intelligence & AI',
};

export default function Home({ onSelect }: Props) {
  const [selectedCat, setSelectedCat] = useState<'all' | ToolCategory>('all');

  const visibleCards = selectedCat === 'all' ? cards : cards.filter((c) => c.category === selectedCat);

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
            Start with a PDF <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="hero-annotation">
          <span className="annotation-line" />
          PRIVATE, LOCAL<br />& READY TO FOLD
        </div>
        <div className="hero-serial">FOLD / FILES / 01</div>
      </section>

      {/* Category Filter Pills Bar */}
      <div className="category-filter-bar" role="tablist" aria-label="Tool Categories">
        <button
          className={`category-tab-btn ${selectedCat === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCat('all')}
          role="tab"
          aria-selected={selectedCat === 'all'}
        >
          All Tools <span className="category-tab-badge">24</span>
        </button>
        <button
          className={`category-tab-btn ${selectedCat === 'organize' ? 'active' : ''}`}
          onClick={() => setSelectedCat('organize')}
          role="tab"
          aria-selected={selectedCat === 'organize'}
        >
          Organize & Pages <span className="category-tab-badge">7</span>
        </button>
        <button
          className={`category-tab-btn ${selectedCat === 'security' ? 'active' : ''}`}
          onClick={() => setSelectedCat('security')}
          role="tab"
          aria-selected={selectedCat === 'security'}
        >
          Security & Privacy <span className="category-tab-badge">5</span>
        </button>
        <button
          className={`category-tab-btn ${selectedCat === 'conversions' ? 'active' : ''}`}
          onClick={() => setSelectedCat('conversions')}
          role="tab"
          aria-selected={selectedCat === 'conversions'}
        >
          Conversions & Data <span className="category-tab-badge">6</span>
        </button>
        <button
          className={`category-tab-btn ${selectedCat === 'automation' ? 'active' : ''}`}
          onClick={() => setSelectedCat('automation')}
          role="tab"
          aria-selected={selectedCat === 'automation'}
        >
          Intelligence & AI <span className="category-tab-badge">6</span>
        </button>
      </div>

      <div className="home-section-head">
        <div>
          <span className="eyebrow">
            {selectedCat === 'all' ? 'THE COMPLETE WORKBENCH' : categoryLabels[selectedCat].toUpperCase()}
          </span>
          <h2>
            {selectedCat === 'all'
              ? 'What are we working on?'
              : `${categoryLabels[selectedCat]} Tools`}
          </h2>
        </div>
        <span className="tool-count">
          {visibleCards.length} <span>TOOLS</span>
        </span>
      </div>

      <section className="tool-card-grid" aria-label="PDF tools">
        {visibleCards.map(({ key, title, detail, icon: Icon, number, color }) => (
          <button
            className={`tool-card accent-${color}`}
            key={key}
            onClick={() => onSelect(key)}
          >
            <span className="tool-card-top">
              <span className="tool-card-number">{number} / TASK</span>
              <ArrowUpRight className="tool-card-arrow" size={19} />
            </span>
            <span className="tool-icon">
              <Icon size={21} strokeWidth={1.8} />
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
          <span className="eyebrow">ALL 24 SUITE TOOLS COMPLETE</span>
          <h3>100% Free & Serverless.</h3>
          <div className="later-item">
            <CheckCircle size={16} color="#10b981" />
            <span>Office Word Suite (.docx) Active</span>
            <span className="later-tag">READY</span>
          </div>
          <div className="later-item">
            <CheckCircle size={16} color="#10b981" />
            <span>Hardware Camera Scanner & PDF Repair</span>
            <span className="later-tag">READY</span>
          </div>
        </div>
      </section>
    </div>
  );
}
