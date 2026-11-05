import { FileUp } from 'lucide-react';
import { useId, useState } from 'react';

type Props = {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  title?: string;
  hint?: string;
  onFiles: (files: File[]) => void;
  onInvalid?: (message: string) => void;
};

function matchesAccept(file: File, accept: string): boolean {
  return accept.split(',').map((rule) => rule.trim().toLowerCase()).some((rule) => {
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
    if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
    return file.type.toLowerCase() === rule;
  });
}

export default function FileDropzone({ accept, multiple = false, disabled = false, title = 'Drop files here', hint = 'or browse from your device', onFiles, onInvalid }: Props) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const send = (list: FileList | null) => {
    if (disabled || !list?.length) return;
    const candidates = Array.from(list);
    const accepted = candidates.filter((file) => matchesAccept(file, accept));
    const rejected = candidates.filter((file) => !matchesAccept(file, accept));
    const chosen = multiple ? accepted : accepted.slice(0, 1);
    if (chosen.length) onFiles(chosen);
    const messages: string[] = [];
    if (rejected.length) messages.push(`Unsupported file type: ${rejected.map((file) => file.name).join(', ')}.`);
    if (!multiple && accepted.length > 1) messages.push(`Only one file is allowed here; ${accepted.length - 1} extra files were ignored.`);
    if (messages.length) onInvalid?.(messages.join(' '));
  };
  return (
    <div
      className={`dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
      aria-disabled={disabled}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); send(event.dataTransfer.files); }}
    >
      <span className="dropzone-icon"><FileUp size={21} strokeWidth={1.8} /></span>
      <div className="dropzone-copy"><strong>{title}</strong><span>{hint}</span></div>
      <label className="button button-outline button-small" htmlFor={id} aria-disabled={disabled} style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>Choose {multiple ? 'files' : 'file'}</label>
      <input id={id} className="visually-hidden" type="file" accept={accept} multiple={multiple} disabled={disabled} onChange={(event) => { send(event.currentTarget.files); event.currentTarget.value = ''; }} />
    </div>
  );
}
