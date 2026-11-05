import { ArrowUpRight, FileImage, Combine, Files, ImagePlus, Scissors, WandSparkles, ScanText, FileSpreadsheet } from 'lucide-react';

type ToolKey = 'home' | 'merge' | 'split' | 'organize' | 'images' | 'compress' | 'export';
type Props = { onSelect: (key: ToolKey) => void };
const cards = [
  { key: 'merge' as const, title: 'Merge PDFs', detail: 'Make one file from many.', icon: Combine, number: '01', color: 'blue' },
  { key: 'split' as const, title: 'Split & extract', detail: 'Keep just the pages you need.', icon: Scissors, number: '02', color: 'orange' },
  { key: 'organize' as const, title: 'Organize pages', detail: 'Reorder, rotate or remove.', icon: Files, number: '03', color: 'violet' },
  { key: 'images' as const, title: 'Images to PDF', detail: 'Make a PDF from JPG or PNG.', icon: ImagePlus, number: '04', color: 'green' },
  { key: 'compress' as const, title: 'Compress PDF', detail: 'A lighter copy, your quality choice.', icon: WandSparkles, number: '05', color: 'pink' },
  { key: 'export' as const, title: 'PDF to images', detail: 'Save pages as JPG or PNG.', icon: FileImage, number: '06', color: 'yellow' },
];

export default function Home({ onSelect }: Props) {
  return <div className="home-view">
    <section className="hero-panel">
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-paper"><span /><span /><span /><span className="paper-fold" /></div>
      <div className="hero-content"><span className="hero-kicker"><span className="hero-spark">✳</span> THE ESSENTIAL PDF WORKBENCH</span><h1>Good documents.<br /><em>Less busywork.</em></h1><p>Everyday PDF tasks, without the detour. Pick a tool, make your change, take your file back.</p><button className="hero-cta" onClick={() => onSelect('merge')}>Start with a PDF <ArrowUpRight size={16} /></button></div>
      <div className="hero-annotation"><span className="annotation-line" />PRIVATE, LOCAL<br />& READY TO FOLD</div>
      <div className="hero-serial">FOLD / FILES / 01</div>
    </section>
    <div className="home-section-head"><div><span className="eyebrow">THE TOOL SHELF</span><h2>What are we working on?</h2></div><span className="tool-count">06 <span>TOOLS</span></span></div>
    <section className="tool-card-grid" aria-label="PDF tools">
      {cards.map(({ key, title, detail, icon: Icon, number, color }) => <button className={`tool-card accent-${color}`} key={key} onClick={() => onSelect(key)}><span className="tool-card-top"><span className="tool-card-number">{number} / TASK</span><ArrowUpRight className="tool-card-arrow" size={18} /></span><span className="tool-icon"><Icon size={20} strokeWidth={1.8} /></span><strong>{title}</strong><span className="tool-card-detail">{detail}</span></button>)}
    </section>
    <section className="home-bottom-row">
      <div className="locality-panel"><span className="locality-seal"><span>F</span><i /></span><div><span className="eyebrow">YOUR FILES, YOUR DEVICE</span><h3>Private from first click.</h3><p>PDF work happens inside this browser tab. Nothing is uploaded to an app server.</p></div><span className="locality-caption">NO SERVER<br />NO ACCOUNT<br />NO SURPRISES</span></div>
      <div className="later-panel"><span className="eyebrow">ON THE FUTURE SHELF</span><h3>Not in this first release.</h3><div className="later-item"><ScanText size={15} /><span>OCR & searchable scans</span><span className="later-tag">LATER</span></div><div className="later-item"><FileSpreadsheet size={15} /><span>Word, Excel & PowerPoint</span><span className="later-tag">LATER</span></div></div>
    </section>
  </div>;
}
