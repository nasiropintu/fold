import { lazy, Suspense, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Binary, Combine, EyeOff, FileCheck, FileDiff, FileImage, FileSpreadsheet, Files, FileText, Heart, ImagePlus, Info, LockKeyhole, Menu, PenTool, ScanText, Scissors, Sparkles, Stamp, WandSparkles, Workflow, X } from 'lucide-react';
import Home from './features/Home';
import AboutModal from './components/AboutModal';

const MergeTool = lazy(() => import('./features/MergeTool'));
const SplitTool = lazy(() => import('./features/SplitTool'));
const OrganizeTool = lazy(() => import('./features/OrganizeTool'));
const ImagesToPdfTool = lazy(() => import('./features/ImagesToPdfTool'));
const CompressTool = lazy(() => import('./features/CompressTool'));
const ExportImagesTool = lazy(() => import('./features/ExportImagesTool'));
const SignTool = lazy(() => import('./features/SignTool'));
const WatermarkTool = lazy(() => import('./features/WatermarkTool'));
const PageNumbersTool = lazy(() => import('./features/PageNumbersTool'));
const CompareTool = lazy(() => import('./features/CompareTool'));
const OcrTool = lazy(() => import('./features/OcrTool'));
const RedactTool = lazy(() => import('./features/RedactTool'));
const FormsTool = lazy(() => import('./features/FormsTool'));
const PdfToMarkdownTool = lazy(() => import('./features/PdfToMarkdownTool'));
const ExcelTool = lazy(() => import('./features/ExcelTool'));
const AiSummarizerTool = lazy(() => import('./features/AiSummarizerTool'));
const WorkflowTool = lazy(() => import('./features/WorkflowTool'));

type ToolKey = 'home' | 'merge' | 'split' | 'organize' | 'images' | 'compress' | 'export' | 'sign' | 'watermark' | 'page-numbers' | 'compare' | 'ocr' | 'redact' | 'forms' | 'markdown' | 'excel' | 'summarizer' | 'workflow';
type ToolInfo = { key: ToolKey; label: string; short: string; description: string; icon: typeof Combine; eyebrow: string };

const tools: ToolInfo[] = [
  { key: 'merge', label: 'Merge PDFs', short: 'Combine documents', description: 'Bring multiple PDFs together in the order you choose.', icon: Combine, eyebrow: 'BUILD ONE DOCUMENT' },
  { key: 'split', label: 'Split & extract', short: 'Keep the pages you need', description: 'Pull a page range or hand-picked pages into a fresh PDF.', icon: Scissors, eyebrow: 'MAKE A SELECTION' },
  { key: 'organize', label: 'Organize pages', short: 'Reorder, rotate, remove', description: 'See your pages at a glance and get the sequence just right.', icon: Files, eyebrow: 'TIDY YOUR PAGES' },
  { key: 'images', label: 'Images to PDF', short: 'Turn images into pages', description: 'Arrange JPG or PNG images and shape them into a PDF.', icon: ImagePlus, eyebrow: 'MAKE A PDF' },
  { key: 'compress', label: 'Compress PDF', short: 'Make a lighter copy', description: 'Choose a quality preset and compare the actual file size.', icon: WandSparkles, eyebrow: 'LIGHTEN THE FILE' },
  { key: 'export', label: 'PDF to images', short: 'Export page artwork', description: 'Choose PDF pages and save them as JPG or PNG images.', icon: FileImage, eyebrow: 'SAVE PAGE IMAGES' },
  { key: 'sign', label: 'Sign PDF', short: 'Stamp digital signature', description: 'Draw, type, or upload your signature and stamp it onto any page.', icon: PenTool, eyebrow: 'E-SIGN DOCUMENTS' },
  { key: 'watermark', label: 'Watermark PDF', short: 'Stamp text or logos', description: 'Add customizable text or brand watermark stamps across pages.', icon: Stamp, eyebrow: 'PROTECT & BRAND' },
  { key: 'page-numbers', label: 'Page numbers', short: 'Header or footer numbers', description: 'Insert customizable page numbering in headers or footers.', icon: Binary, eyebrow: 'PAGINATE DOCUMENT' },
  { key: 'compare', label: 'Compare PDFs', short: 'Visual document diff', description: 'Compare two PDF revisions side-by-side with pixel diff highlighting.', icon: FileDiff, eyebrow: 'SPOT DIFFERENCES' },
  { key: 'ocr', label: 'OCR PDF', short: 'Searchable scans & text', description: 'Recognize and extract text from scanned PDFs using in-browser machine vision.', icon: ScanText, eyebrow: 'EXTRACT SCAN TEXT' },
  { key: 'redact', label: 'Redact PDF', short: 'Sanitize confidential data', description: 'Permanently black out and eliminate sensitive information from document pages.', icon: EyeOff, eyebrow: 'PRIVACY & SECURITY' },
  { key: 'forms', label: 'Fill Forms', short: 'Fill & flatten AcroForms', description: 'Inspect, fill in interactive PDF form fields, and optionally flatten values.', icon: FileCheck, eyebrow: 'INTERACTIVE FORMS' },
  { key: 'markdown', label: 'PDF to Markdown', short: 'Clean structured text', description: 'Extract clean Markdown with automatic heading levels and paragraph spacing.', icon: FileText, eyebrow: 'MARKDOWN EXTRACTION' },
  { key: 'excel', label: 'PDF & Excel', short: 'Spreadsheet converter', description: 'Convert tables from PDF into Excel (.xlsx), or format spreadsheets as PDF.', icon: FileSpreadsheet, eyebrow: 'TABLES & SPREADSHEETS' },
  { key: 'summarizer', label: 'AI Summarizer', short: 'On-device synthesis', description: 'Summarize key takeaways 100% on-device with Chrome AI or smart heuristics.', icon: Sparkles, eyebrow: 'LOCAL INTELLIGENCE' },
  { key: 'workflow', label: 'Workflow Automator', short: 'Multi-step pipeline', description: 'Chain watermark, page numbers, rotation, and compression into one run.', icon: Workflow, eyebrow: 'CHAINED AUTOMATION' },
];

export default function App() {
  const [active, setActive] = useState<ToolKey>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const current = tools.find((tool) => tool.key === active);
  const go = (key: ToolKey) => { setActive(key); setMobileMenuOpen(false); };
  const renderTool = () => {
    switch (active) {
      case 'merge': return <MergeTool />;
      case 'split': return <SplitTool />;
      case 'organize': return <OrganizeTool />;
      case 'images': return <ImagesToPdfTool />;
      case 'compress': return <CompressTool />;
      case 'export': return <ExportImagesTool />;
      case 'sign': return <SignTool />;
      case 'watermark': return <WatermarkTool />;
      case 'page-numbers': return <PageNumbersTool />;
      case 'compare': return <CompareTool />;
      case 'ocr': return <OcrTool />;
      case 'redact': return <RedactTool />;
      case 'forms': return <FormsTool />;
      case 'markdown': return <PdfToMarkdownTool />;
      case 'excel': return <ExcelTool />;
      case 'summarizer': return <AiSummarizerTool />;
      case 'workflow': return <WorkflowTool />;
      default: return <Home onSelect={go} />;
    }
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileMenuOpen ? ' sidebar-open' : ''}`}>
        <button className="brand" onClick={() => go('home')} aria-label="Fold home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-word">fold<span>.</span></span>
          <span className="brand-label">PDF WORKSPACE</span>
        </button>
        <div className="sidebar-section-label">YOUR WORKBENCH</div>
        <nav className="primary-nav" aria-label="PDF tools">
          <button className={`nav-item${active === 'home' ? ' active' : ''}`} onClick={() => go('home')}><span className="nav-icon"><Sparkles size={17} /></span><span>Overview</span></button>
          <div className="nav-divider" />
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return <button className={`nav-item${active === tool.key ? ' active' : ''}`} key={tool.key} onClick={() => go(tool.key)}><span className="nav-index">0{index + 1}</span><span className="nav-icon"><Icon size={17} /></span><span>{tool.label}</span></button>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note"><span className="sidebar-note-icon"><LockKeyhole size={16} /></span><div><strong>Private by design</strong><span>Files stay on this device.</span></div></div>
        
        {/* Persistent NasirPintu Brand Tagline & Modal Trigger */}
        <button className="creator-sidebar-pill" onClick={() => setAboutOpen(true)} title="View Creator & AI Collaboration Credits">
          <span className="creator-pill-heart"><Heart size={12} fill="currentColor" /></span>
          <span className="creator-pill-text">Crafted with ❤️ by <strong>NasirPintu</strong></span>
          <Info size={13} className="creator-pill-info" />
        </button>

        <div className="sidebar-footer"><span className="status-dot" /> FREE TOOLKIT <span className="footer-version">MVP · 01</span></div>
      </aside>
      {mobileMenuOpen && <button className="mobile-scrim" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation" />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button" aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <div className="breadcrumbs"><button onClick={() => go('home')}>Workspace</button>{current && <><span>/</span><strong>{current.label}</strong></>}</div>
          <div className="topbar-right">
            <button className="topbar-creator-btn" onClick={() => setAboutOpen(true)} title="Crafted with ❤️ by NasirPintu">
              <Heart size={13} className="topbar-heart-icon" />
              <span>NasirPintu</span>
            </button>
            <span className="topbar-divider" />
            <span className="privacy-chip"><span className="privacy-lock"><LockKeyhole size={13} /></span> Files stay on your device</span>
            <span className="topbar-divider" />
            <span className="brand-stamp">F<span>01</span></span>
          </div>
        </header>
        <div className="content-wrap">
          {current && <div className="page-heading"><button className="back-link" onClick={() => go('home')}><ArrowLeft size={15} /> All tools</button><span className="eyebrow">{current.eyebrow}</span><h1>{current.label}</h1><p>{current.description}</p></div>}
          {active === 'home' ? renderTool() : <Suspense fallback={<p className="inline-status">Opening your PDF tool…</p>}>{renderTool()}</Suspense>}
          {active === 'home' && (
            <footer className="content-footer">
              <span>FOLD PDF TOOLKIT</span>
              <span>Free to use · Your files don't leave your browser</span>
              <button className="footer-creator-button" onClick={() => setAboutOpen(true)}>
                Crafted with ❤️ by NasirPintu <Info size={11} />
              </button>
              <span className="footer-free">NO PAID APIs <ArrowUpRight size={12} /></span>
            </footer>
          )}
          {active !== 'home' && (
            <footer className="tool-footer">
              <LockKeyhole size={13} />
              <span>Processing happens in your browser. Files are not uploaded to a server.</span>
              <button className="footer-creator-button" onClick={() => setAboutOpen(true)} style={{ marginLeft: 'auto' }}>
                Crafted with ❤️ by NasirPintu <Info size={11} />
              </button>
            </footer>
          )}
        </div>
      </main>

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
