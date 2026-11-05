import { useState } from 'react';
import { Play, Download, Trash2, RotateCcw, ChevronUp, ChevronDown, Workflow, Plus } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import {
  applyWatermark,
  applyPageNumbers,
  compressPdfRasterized,
  downloadBytes,
  inspectPdf,
  parsePageRanges,
  WatermarkOptions,
  PageNumberOptions,
} from '../lib/pdf';

type OperationType = 'watermark' | 'page-numbers' | 'rotate' | 'compress';

interface WorkflowStep {
  id: string;
  type: OperationType;
  title: string;
  config: Record<string, string | number | boolean>;
}

export default function WorkflowTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: 'step-1',
      type: 'watermark',
      title: 'Watermark Document',
      config: { text: 'DRAFT', opacity: 0.25, rotation: 45, colorHex: '#4b5563' },
    },
    {
      id: 'step-2',
      type: 'page-numbers',
      title: 'Insert Page Numbers',
      config: { format: 'Page {n} of {total}', position: 'bottom-center', fontSize: 10, skipFirstPage: false },
    },
  ]);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFile = (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setError('');
    setSuccess('');
    setResultBytes(null);
    inspectPdf(f)
      .then(setPageCount)
      .catch((err) => setError(err.message || 'Could not inspect PDF.'));
  };

  const addStep = (type: OperationType) => {
    const id = `step-${Date.now()}`;
    let newStep: WorkflowStep;

    switch (type) {
      case 'watermark':
        newStep = {
          id,
          type,
          title: 'Watermark Document',
          config: { text: 'CONFIDENTIAL', opacity: 0.3, rotation: 45, colorHex: '#dc2626' },
        };
        break;
      case 'page-numbers':
        newStep = {
          id,
          type,
          title: 'Insert Page Numbers',
          config: { format: '{n} / {total}', position: 'bottom-right', fontSize: 9, skipFirstPage: true },
        };
        break;
      case 'rotate':
        newStep = {
          id,
          type,
          title: 'Rotate Pages',
          config: { angle: 90, pageRange: '' },
        };
        break;
      case 'compress':
        newStep = {
          id,
          type,
          title: 'Compress Document',
          config: { quality: 0.65, dpi: 96 },
        };
        break;
    }

    setSteps((prev) => [...prev, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    setSteps(newSteps);
  };

  const updateConfig = (id: string, key: string, value: string | number | boolean) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, config: { ...step.config, [key]: value } } : step)),
    );
  };

  const runWorkflow = async () => {
    if (!file || steps.length === 0) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setResultBytes(null);
    setProgressVal(5);

    try {
      let currentFile = file;

      for (let i = 0; i < steps.length; i++) {
        setCurrentStepIdx(i);
        const step = steps[i];
        let stepOutput: Uint8Array;

        if (step.type === 'watermark') {
          const opts: WatermarkOptions = {
            type: 'text',
            text: String(step.config.text || 'CONFIDENTIAL'),
            opacity: Number(step.config.opacity) || 0.3,
            rotation: Number(step.config.rotation) || 45,
            colorHex: String(step.config.colorHex || '#4b5563'),
            position: 'center',
          };
          stepOutput = await applyWatermark(currentFile, opts);
        } else if (step.type === 'page-numbers') {
          const opts: PageNumberOptions = {
            format: String(step.config.format || '{n}'),
            position: (step.config.position as PageNumberOptions['position']) || 'bottom-center',
            fontSize: Number(step.config.fontSize) || 10,
            skipFirstPage: Boolean(step.config.skipFirstPage),
            colorHex: '#374151',
            startPageNumber: 1,
            margin: 25,
          };
          stepOutput = await applyPageNumbers(currentFile, opts);
        } else if (step.type === 'rotate') {
          const bytes = new Uint8Array(await currentFile.arrayBuffer());
          const doc = await PDFDocument.load(bytes);
          const totalPages = doc.getPageCount();
          const angle = Number(step.config.angle) || 90;
          const rangeStr = String(step.config.pageRange || '').trim();
          const targetIndices = rangeStr ? parsePageRanges(rangeStr, totalPages) : Array.from({ length: totalPages }, (_, idx) => idx);

          for (const idx of targetIndices) {
            const page = doc.getPage(idx);
            page.setRotation(degrees((page.getRotation().angle + angle) % 360));
          }
          stepOutput = await doc.save();
        } else if (step.type === 'compress') {
          const quality = Number(step.config.quality) || 0.65;
          const dpi = Number(step.config.dpi) || 96;
          stepOutput = await compressPdfRasterized(currentFile, dpi, quality, () => {});
        } else {
          throw new Error(`Unsupported workflow step: ${step.type}`);
        }

        currentFile = new File([stepOutput as BlobPart], `pipeline-${i}.pdf`, { type: 'application/pdf' });
        setProgressVal(Math.round(((i + 1) / steps.length) * 100));
      }

      const finalBytes = new Uint8Array(await currentFile.arrayBuffer());
      setResultBytes(finalBytes);
      setSuccess(`Workflow completed! ${steps.length} sequential operations applied.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Workflow execution failed.';
      setError(message);
    } finally {
      setBusy(false);
      setCurrentStepIdx(-1);
    }
  };

  const downloadResult = () => {
    if (!resultBytes || !file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    downloadBytes(resultBytes, `${nameWithoutExt}-automated.pdf`);
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setResultBytes(null);
    setError('');
    setSuccess('');
    setCurrentStepIdx(-1);
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <Workflow size={12} />
          <span>PHASE 3 · PIPELINE AUTOMATION</span>
        </div>
        <h2>Chained Workflow Automator</h2>
        <p>Chain multiple PDF modifications in a single automated browser pipeline without re-uploading files between tasks.</p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={handleFile}
          title="Drop your PDF here to build a pipeline"
          hint="Chain Watermarking, Pagination, Rotation, and Compression together"
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

          <div style={{ marginTop: 20 }}>
            <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label className="tool-label" style={{ margin: 0 }}>Pipeline Sequence ({steps.length} steps)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="secondary-action-btn" onClick={() => addStep('watermark')} disabled={busy}>
                  <Plus size={13} /> Watermark
                </button>
                <button className="secondary-action-btn" onClick={() => addStep('page-numbers')} disabled={busy}>
                  <Plus size={13} /> Numbers
                </button>
                <button className="secondary-action-btn" onClick={() => addStep('rotate')} disabled={busy}>
                  <Plus size={13} /> Rotate
                </button>
                <button className="secondary-action-btn" onClick={() => addStep('compress')} disabled={busy}>
                  <Plus size={13} /> Compress
                </button>
              </div>
            </div>

            {steps.length === 0 ? (
              <p className="subtext" style={{ textAlign: 'center', padding: 24 }}>No steps in pipeline. Add operations above.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    style={{
                      border: currentStepIdx === idx ? '2px solid var(--accent, #3b82f6)' : '1px solid var(--border-color, #e5e7eb)',
                      borderRadius: 8,
                      padding: 12,
                      background: currentStepIdx === idx ? 'rgba(59, 130, 246, 0.05)' : 'var(--card-bg, #ffffff)',
                    }}
                  >
                    <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="nav-index">0{idx + 1}</span>
                        <strong>{step.title}</strong>
                        {currentStepIdx === idx && (
                          <span className="tag-pill" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Processing…</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          className="icon-button"
                          onClick={() => moveStep(idx, 'up')}
                          disabled={busy || idx === 0}
                          title="Move up"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => moveStep(idx, 'down')}
                          disabled={busy || idx === steps.length - 1}
                          title="Move down"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => removeStep(step.id)}
                          disabled={busy}
                          title="Remove step"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Step specific inline configurations */}
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {step.type === 'watermark' && (
                        <>
                          <div style={{ flex: '1 1 140px' }}>
                            <span className="subtext">Text:</span>
                            <input
                              type="text"
                              className="text-input"
                              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              value={String(step.config.text || '')}
                              onChange={(e) => updateConfig(step.id, 'text', e.target.value)}
                              disabled={busy}
                            />
                          </div>
                          <div style={{ flex: '1 1 100px' }}>
                            <span className="subtext">Opacity: {Math.round(Number(step.config.opacity || 0.3) * 100)}%</span>
                            <input
                              type="range"
                              min="0.1"
                              max="0.8"
                              step="0.05"
                              value={Number(step.config.opacity || 0.3)}
                              onChange={(e) => updateConfig(step.id, 'opacity', parseFloat(e.target.value))}
                              disabled={busy}
                            />
                          </div>
                        </>
                      )}

                      {step.type === 'page-numbers' && (
                        <>
                          <div style={{ flex: '1 1 140px' }}>
                            <span className="subtext">Format:</span>
                            <input
                              type="text"
                              className="text-input"
                              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              value={String(step.config.format || '')}
                              onChange={(e) => updateConfig(step.id, 'format', e.target.value)}
                              disabled={busy}
                            />
                          </div>
                          <div style={{ flex: '1 1 120px' }}>
                            <span className="subtext">Position:</span>
                            <select
                              className="select-input"
                              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              value={String(step.config.position || 'bottom-center')}
                              onChange={(e) => updateConfig(step.id, 'position', e.target.value)}
                              disabled={busy}
                            >
                              <option value="bottom-center">Bottom Center</option>
                              <option value="bottom-right">Bottom Right</option>
                              <option value="top-right">Top Right</option>
                            </select>
                          </div>
                        </>
                      )}

                      {step.type === 'rotate' && (
                        <>
                          <div style={{ flex: '1 1 120px' }}>
                            <span className="subtext">Angle:</span>
                            <select
                              className="select-input"
                              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              value={Number(step.config.angle || 90)}
                              onChange={(e) => updateConfig(step.id, 'angle', parseInt(e.target.value, 10))}
                              disabled={busy}
                            >
                              <option value={90}>90° Clockwise</option>
                              <option value={180}>180° Invert</option>
                              <option value={270}>270° Counter-clockwise</option>
                            </select>
                          </div>
                          <div style={{ flex: '1 1 140px' }}>
                            <span className="subtext">Pages (empty = all):</span>
                            <input
                              type="text"
                              className="text-input"
                              placeholder="e.g. 1, 3-5"
                              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              value={String(step.config.pageRange || '')}
                              onChange={(e) => updateConfig(step.id, 'pageRange', e.target.value)}
                              disabled={busy}
                            />
                          </div>
                        </>
                      )}

                      {step.type === 'compress' && (
                        <div style={{ flex: '1 1 160px' }}>
                          <span className="subtext">Quality: {Math.round(Number(step.config.quality || 0.65) * 100)}%</span>
                          <input
                            type="range"
                            min="0.3"
                            max="0.85"
                            step="0.05"
                            value={Number(step.config.quality || 0.65)}
                            onChange={(e) => updateConfig(step.id, 'quality', parseFloat(e.target.value))}
                            disabled={busy}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button className="primary-action-btn" onClick={runWorkflow} disabled={busy || steps.length === 0}>
              <Play size={16} />
              <span>{busy ? 'Executing Pipeline…' : 'Run Workflow Pipeline'}</span>
            </button>

            {resultBytes && (
              <button className="secondary-action-btn" onClick={downloadResult} style={{ background: '#10b981', color: '#ffffff' }}>
                <Download size={16} />
                <span>Download Result</span>
              </button>
            )}
          </div>
        </div>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel={currentStepIdx >= 0 && steps[currentStepIdx] ? `Running Step ${currentStepIdx + 1}: ${steps[currentStepIdx].title}…` : 'Executing chained workflow…'}
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
