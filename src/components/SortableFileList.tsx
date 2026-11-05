import { ArrowDown, ArrowUp, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { formatBytes } from '../lib/pdf';

type Props = { files: File[]; onChange: (files: File[]) => void; image?: boolean; disabled?: boolean };

export default function SortableFileList({ files, onChange, image = false, disabled = false }: Props) {
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (disabled || target < 0 || target >= files.length) return;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <ol className="file-list">
      {files.map((file, index) => (
        <li className="file-row" key={`${file.name}-${file.lastModified}-${index}`}>
          <span className="file-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="file-type-icon">{image ? <ImageIcon size={17} /> : <FileText size={17} />}</span>
          <span className="file-name"><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></span>
          <div className="file-actions">
            <button className="icon-button" aria-label={`Move ${file.name} up`} disabled={disabled || index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
            <button className="icon-button" aria-label={`Move ${file.name} down`} disabled={disabled || index === files.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
            <button className="icon-button danger-icon" aria-label={`Remove ${file.name}`} disabled={disabled} onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}><Trash2 size={16} /></button>
          </div>
        </li>
      ))}
    </ol>
  );
}
