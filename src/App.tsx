import { lazy, Suspense, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Combine, FileImage, Files, ImagePlus, LockKeyhole, Menu, Scissors, Sparkles, WandSparkles, X } from 'lucide-react';
import Home from './features/Home';

const MergeTool = lazy(() => import('./features/MergeTool'));
const SplitTool = lazy(() => import('./features/SplitTool'));
const OrganizeTool = lazy(() => import('./features/OrganizeTool'));
const ImagesToPdfTool = lazy(() => import('./features/ImagesToPdfTool'));
const CompressTool = lazy(() => import('./features/CompressTool'));
const ExportImagesTool = lazy(() => import('./features/ExportImagesTool'));

type ToolKey = 'home' | 'merge' | 'split' | 'organize' | 'images' | 'compress' | 'export';
type ToolInfo = { key: ToolKey; label: string; short: string; description: string; icon: typeof Combine; eyebrow: string };

const tools: ToolInfo[] = [
  { key: 'merge', label: 'Merge PDFs', short: 'Combine documents', description: 'Bring multiple PDFs together in the order you choose.', icon: Combine, eyebrow: 'BUILD ONE DOCUMENT' },
  { key: 'split', label: 'Split & extract', short: 'Keep the pages you need', description: 'Pull a page range or hand-picked pages into a fresh PDF.', icon: Scissors, eyebrow: 'MAKE A SELECTION' },
  { key: 'organize', label: 'Organize pages', short: 'Reorder, rotate, remove', description: 'See your pages at a glance and get the sequence just right.', icon: Files, eyebrow: 'TIDY YOUR PAGES' },
  { key: 'images', label: 'Images to PDF', short: 'Turn images into pages', description: 'Arrange JPG or PNG images and shape them into a PDF.', icon: ImagePlus, eyebrow: 'MAKE A PDF' },
  { key: 'compress', label: 'Compress PDF', short: 'Make a lighter copy', description: 'Choose a quality preset and compare the actual file size.', icon: WandSparkles, eyebrow: 'LIGHTEN THE FILE' },
  { key: 'export', label: 'PDF to images', short: 'Export page artwork', description: 'Choose PDF pages and save them as JPG or PNG images.', icon: FileImage, eyebrow: 'SAVE PAGE IMAGES' },
];

export default function App() {
  const [active, setActive] = useState<ToolKey>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        <div className="sidebar-footer"><span className="status-dot" /> FREE TOOLKIT <span className="footer-version">MVP · 01</span></div>
      </aside>
      {mobileMenuOpen && <button className="mobile-scrim" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation" />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button" aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <div className="breadcrumbs"><button onClick={() => go('home')}>Workspace</button>{current && <><span>/</span><strong>{current.label}</strong></>}</div>
          <div className="topbar-right"><span className="privacy-chip"><span className="privacy-lock"><LockKeyhole size={13} /></span> Files stay on your device</span><span className="topbar-divider" /><span className="brand-stamp">F<span>01</span></span></div>
        </header>
        <div className="content-wrap">
          {current && <div className="page-heading"><button className="back-link" onClick={() => go('home')}><ArrowLeft size={15} /> All tools</button><span className="eyebrow">{current.eyebrow}</span><h1>{current.label}</h1><p>{current.description}</p></div>}
          {active === 'home' ? renderTool() : <Suspense fallback={<p className="inline-status">Opening your PDF tool…</p>}>{renderTool()}</Suspense>}
          {active === 'home' && <footer className="content-footer"><span>FOLD PDF TOOLKIT</span><span>Free to use · Your files don't leave your browser</span><span className="footer-free">NO PAID APIs <ArrowUpRight size={12} /></span></footer>}
          {active !== 'home' && <footer className="tool-footer"><LockKeyhole size={13} /> Processing happens in your browser. Files are not uploaded to a server.</footer>}
        </div>
      </main>
    </div>
  );
}
