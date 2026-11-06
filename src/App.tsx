import { lazy, Suspense, useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Binary,
  Camera,
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
  Heart,
  ImagePlus,
  Info,
  Lock,
  LockKeyhole,
  LockOpen,
  Menu,
  PenTool,
  ScanText,
  Scissors,
  Search,
  Sparkles,
  Stamp,
  WandSparkles,
  Workflow,
  Wrench,
  X,
} from 'lucide-react';
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
const ProtectTool = lazy(() => import('./features/ProtectTool'));
const UnlockTool = lazy(() => import('./features/UnlockTool'));
const CropTool = lazy(() => import('./features/CropTool'));
const PdfToWordTool = lazy(() => import('./features/PdfToWordTool'));
const WordToPdfTool = lazy(() => import('./features/WordToPdfTool'));
const ScanTool = lazy(() => import('./features/ScanTool'));
const RepairTool = lazy(() => import('./features/RepairTool'));

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

export interface CategoryInfo {
  id: ToolCategory;
  label: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'organize', label: 'Organize & Pages' },
  { id: 'security', label: 'Security & Privacy' },
  { id: 'conversions', label: 'Conversions & Data' },
  { id: 'automation', label: 'Intelligence & AI' },
];

export type ToolInfo = {
  key: ToolKey;
  label: string;
  short: string;
  description: string;
  icon: typeof Combine;
  eyebrow: string;
  category: ToolCategory;
};

const tools: ToolInfo[] = [
  // Organize & Pages
  { key: 'merge', label: 'Merge PDFs', short: 'Combine documents', description: 'Bring multiple PDFs together in the order you choose.', icon: Combine, eyebrow: 'BUILD ONE DOCUMENT', category: 'organize' },
  { key: 'split', label: 'Split & extract', short: 'Keep the pages you need', description: 'Pull a page range or hand-picked pages into a fresh PDF.', icon: Scissors, eyebrow: 'MAKE A SELECTION', category: 'organize' },
  { key: 'organize', label: 'Organize pages', short: 'Reorder, rotate, remove', description: 'See your pages at a glance and get the sequence just right.', icon: Files, eyebrow: 'TIDY YOUR PAGES', category: 'organize' },
  { key: 'images', label: 'Images to PDF', short: 'Turn images into pages', description: 'Arrange JPG or PNG images and shape them into a PDF.', icon: ImagePlus, eyebrow: 'MAKE A PDF', category: 'organize' },
  { key: 'export', label: 'PDF to images', short: 'Export page artwork', description: 'Choose PDF pages and save them as JPG or PNG images.', icon: FileImage, eyebrow: 'SAVE PAGE IMAGES', category: 'organize' },
  { key: 'page-numbers', label: 'Page numbers', short: 'Header or footer numbers', description: 'Insert customizable page numbering in headers or footers.', icon: Binary, eyebrow: 'PAGINATE DOCUMENT', category: 'organize' },
  { key: 'crop', label: 'Rotate & Crop', short: 'Trim margins & flip', description: 'Trim page margins with visual crop boxes and adjust page orientations.', icon: Crop, eyebrow: 'GEOMETRIC PRECISION', category: 'organize' },

  // Security & Privacy
  { key: 'sign', label: 'Sign PDF', short: 'Stamp digital signature', description: 'Draw, type, or upload your signature and stamp it onto any page.', icon: PenTool, eyebrow: 'E-SIGN DOCUMENTS', category: 'security' },
  { key: 'watermark', label: 'Watermark PDF', short: 'Stamp text or logos', description: 'Add customizable text or brand watermark stamps across pages.', icon: Stamp, eyebrow: 'PROTECT & BRAND', category: 'security' },
  { key: 'redact', label: 'Redact PDF', short: 'Sanitize confidential data', description: 'Permanently black out and eliminate sensitive information from document pages.', icon: EyeOff, eyebrow: 'PRIVACY & SECURITY', category: 'security' },
  { key: 'protect', label: 'Protect PDF', short: 'Password encrypt', description: 'Lock your document with AES-256 password encryption and set permissions.', icon: Lock, eyebrow: 'ENCRYPT DOCUMENT', category: 'security' },
  { key: 'unlock', label: 'Unlock PDF', short: 'Remove password', description: 'Decrypt password-protected PDFs and strip security restrictions.', icon: LockOpen, eyebrow: 'DECRYPT DOCUMENT', category: 'security' },

  // Conversions & Data
  { key: 'markdown', label: 'PDF to Markdown', short: 'Clean structured text', description: 'Extract clean Markdown with automatic heading levels and paragraph spacing.', icon: FileText, eyebrow: 'MARKDOWN EXTRACTION', category: 'conversions' },
  { key: 'excel', label: 'PDF & Excel', short: 'Spreadsheet converter', description: 'Convert tables from PDF into Excel (.xlsx), or format spreadsheets as PDF.', icon: FileSpreadsheet, eyebrow: 'TABLES & SPREADSHEETS', category: 'conversions' },
  { key: 'compress', label: 'Compress PDF', short: 'Make a lighter copy', description: 'Choose a quality preset and compare the actual file size.', icon: WandSparkles, eyebrow: 'LIGHTEN THE FILE', category: 'conversions' },
  { key: 'forms', label: 'Fill Forms', short: 'Fill & flatten AcroForms', description: 'Inspect, fill in interactive PDF form fields, and optionally flatten values.', icon: FileCheck, eyebrow: 'INTERACTIVE FORMS', category: 'conversions' },
  { key: 'pdf-to-word', label: 'PDF to Word', short: 'Export editable .docx', description: 'Convert PDF documents into formatted Microsoft Word (.docx) files.', icon: FileText, eyebrow: 'OFFICE DOCUMENT', category: 'conversions' },
  { key: 'word-to-pdf', label: 'Word to PDF', short: 'Convert .docx to PDF', description: 'Convert Microsoft Word documents into paginated, styled PDF files.', icon: FileCode, eyebrow: 'OFFICE DOCUMENT', category: 'conversions' },

  // Intelligence & AI
  { key: 'summarizer', label: 'AI Summarizer', short: 'On-device synthesis', description: 'Summarize key takeaways 100% on-device with Chrome AI or smart heuristics.', icon: Sparkles, eyebrow: 'LOCAL INTELLIGENCE', category: 'automation' },
  { key: 'ocr', label: 'OCR PDF', short: 'Searchable scans & text', description: 'Recognize and extract text from scanned PDFs using in-browser machine vision.', icon: ScanText, eyebrow: 'EXTRACT SCAN TEXT', category: 'automation' },
  { key: 'compare', label: 'Compare PDFs', short: 'Visual document diff', description: 'Compare two PDF revisions side-by-side with pixel diff highlighting.', icon: FileDiff, eyebrow: 'SPOT DIFFERENCES', category: 'automation' },
  { key: 'workflow', label: 'Workflow Automator', short: 'Multi-step pipeline', description: 'Chain watermark, page numbers, rotation, and compression into one run.', icon: Workflow, eyebrow: 'CHAINED AUTOMATION', category: 'automation' },
  { key: 'scan', label: 'Scan to PDF', short: 'Webcam & document snap', description: 'Capture pages with your camera, apply B&W filters, and compile to PDF.', icon: Camera, eyebrow: 'CAMERA CAPTURE', category: 'automation' },
  { key: 'repair', label: 'Repair PDF', short: 'Fix corrupt xref tables', description: 'Recover corrupted PDFs by rebuilding broken cross-reference tables in memory.', icon: Wrench, eyebrow: 'DOCUMENT RECOVERY', category: 'automation' },
];

export default function App() {
  const [active, setActive] = useState<ToolKey>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const current = tools.find((tool) => tool.key === active);

  const go = (key: ToolKey) => {
    setActive(key);
    setMobileMenuOpen(false);
  };

  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [searchQuery]);

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
      case 'protect': return <ProtectTool />;
      case 'unlock': return <UnlockTool />;
      case 'crop': return <CropTool />;
      case 'pdf-to-word': return <PdfToWordTool />;
      case 'word-to-pdf': return <WordToPdfTool />;
      case 'scan': return <ScanTool />;
      case 'repair': return <RepairTool />;
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

        {/* Quick Filter Box */}
        <div className="sidebar-search-wrap">
          <Search size={14} className="sidebar-search-icon" />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search 24 tools…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categorized Scrollable Nav */}
        <div className="sidebar-nav-container">
          <nav className="primary-nav" aria-label="Overview">
            <button
              className={`nav-item${active === 'home' ? ' active' : ''}`}
              onClick={() => go('home')}
            >
              <span className="nav-icon"><Sparkles size={17} /></span>
              <span>Overview</span>
            </button>
          </nav>

          {searchQuery.trim() ? (
            <div className="sidebar-category-block">
              <div className="sidebar-category-header">
                <span>Matching Tools</span>
                <span className="sidebar-category-count">{filteredTools.length}</span>
              </div>
              <nav className="primary-nav">
                {filteredTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      className={`nav-item${active === tool.key ? ' active' : ''}`}
                      key={tool.key}
                      onClick={() => go(tool.key)}
                    >
                      <span className="nav-icon"><Icon size={17} /></span>
                      <span>{tool.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ) : (
            CATEGORIES.map((cat) => {
              const catTools = tools.filter((t) => t.category === cat.id);
              return (
                <div key={cat.id} className="sidebar-category-block">
                  <div className="sidebar-category-header">
                    <span>{cat.label}</span>
                    <span className="sidebar-category-count">{catTools.length}</span>
                  </div>
                  <nav className="primary-nav" aria-label={cat.label}>
                    {catTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          className={`nav-item${active === tool.key ? ' active' : ''}`}
                          key={tool.key}
                          onClick={() => go(tool.key)}
                        >
                          <span className="nav-icon"><Icon size={17} /></span>
                          <span>{tool.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Privacy Guarantee Note */}
        <div className="sidebar-note">
          <span className="sidebar-note-icon"><LockKeyhole size={17} /></span>
          <div>
            <strong>Private by design</strong>
            <span>Files stay on this device.</span>
          </div>
        </div>

        {/* Persistent NasirPintu Brand Tagline & Modal Trigger */}
        <button
          className="creator-sidebar-pill"
          onClick={() => setAboutOpen(true)}
          title="View Creator & AI Collaboration Credits"
        >
          <span className="creator-pill-heart"><Heart size={13} fill="currentColor" /></span>
          <span className="creator-pill-text">Crafted with ❤️ by <strong>NasirPintu</strong></span>
          <Info size={14} className="creator-pill-info" />
        </button>

        <div className="sidebar-footer">
          <span className="status-dot" /> FREE TOOLKIT <span className="footer-version">MVP · 01</span>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumbs">
            <button onClick={() => go('home')}>Workspace</button>
            {current && (
              <>
                <span>/</span>
                <strong>{current.label}</strong>
              </>
            )}
          </div>
          <div className="topbar-right">
            <button
              className="topbar-creator-btn"
              onClick={() => setAboutOpen(true)}
              title="Crafted with ❤️ by NasirPintu"
            >
              <Heart size={13} className="topbar-heart-icon" />
              <span>NasirPintu</span>
            </button>
            <span className="topbar-divider" />
            <span className="privacy-chip">
              <span className="privacy-lock"><LockKeyhole size={14} /></span> Files stay on your device
            </span>
            <span className="topbar-divider" />
            <span className="brand-stamp">F<span>01</span></span>
          </div>
        </header>

        <div className="content-wrap">
          {current && (
            <div className="page-heading">
              <button className="back-link" onClick={() => go('home')}>
                <ArrowLeft size={16} /> All tools
              </button>
              <span className="eyebrow">{current.eyebrow}</span>
              <h1>{current.label}</h1>
              <p>{current.description}</p>
            </div>
          )}

          {active === 'home' ? (
            renderTool()
          ) : (
            <Suspense fallback={<p className="inline-status">Opening your PDF tool…</p>}>
              {renderTool()}
            </Suspense>
          )}

          {active === 'home' && (
            <footer className="content-footer">
              <span>FOLD PDF TOOLKIT</span>
              <span>Free to use · Your files don't leave your browser</span>
              <button className="footer-creator-button" onClick={() => setAboutOpen(true)}>
                Crafted with ❤️ by NasirPintu <Info size={12} />
              </button>
              <span className="footer-free">NO PAID APIs <ArrowUpRight size={13} /></span>
            </footer>
          )}

          {active !== 'home' && (
            <footer className="tool-footer">
              <LockKeyhole size={14} />
              <span>Processing happens in your browser. Files are not uploaded to a server.</span>
              <button
                className="footer-creator-button"
                onClick={() => setAboutOpen(true)}
                style={{ marginLeft: 'auto' }}
              >
                Crafted with ❤️ by NasirPintu <Info size={12} />
              </button>
            </footer>
          )}
        </div>
      </main>

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
