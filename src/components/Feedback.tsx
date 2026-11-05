import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react';

type Props = { error?: string; success?: string; busy?: boolean; progress?: number; busyLabel?: string; onCancel?: () => void };

export default function Feedback({ error, success, busy, progress, busyLabel = 'Working on your file…', onCancel }: Props) {
  if (!error && !success && !busy) return null;
  return (
    <div className={`feedback${error ? ' feedback-error' : success ? ' feedback-success' : ' feedback-busy'}`} role={error ? 'alert' : 'status'} aria-live="polite">
      {error ? <AlertCircle size={18} /> : success ? <CheckCircle2 size={18} /> : <LoaderCircle className="spin" size={18} />}
      <div className="feedback-body">
        <strong>{error ? 'Could not finish this task' : success ? 'Your file is ready' : busyLabel}</strong>
        {error && <span>{error}</span>}
        {success && <span>{success}</span>}
        {busy && typeof progress === 'number' && <div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div>}
      </div>
      {busy && typeof progress === 'number' && <span className="progress-label">{progress}%</span>}
      {busy && onCancel && <button className="button button-quiet button-small" onClick={onCancel}><X size={14} /> Cancel</button>}
    </div>
  );
}
