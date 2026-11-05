import { useEffect, useState } from 'react';
import { Download, FileCheck, RotateCcw } from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBytes, fillPdfForm, FormFieldInfo, inspectFormFields } from '../lib/pdf';

export default function FormsTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FormFieldInfo[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(false);

  const [busy, setBusy] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setFields([]); setFormValues({}); setError(''); setSuccess('');
    if (file) {
      setInspecting(true);
      inspectFormFields(file)
        .then((foundFields) => {
          if (active) {
            setFields(foundFields);
            const initialValues: Record<string, string | boolean> = {};
            for (const f of foundFields) {
              initialValues[f.name] = f.currentValue;
            }
            setFormValues(initialValues);
          }
        })
        .catch((err) => {
          if (active) setError(err.message);
        })
        .finally(() => {
          if (active) setInspecting(false);
        });
    }
    return () => { active = false; };
  }, [file]);

  const handleFieldChange = (name: string, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveForm = async () => {
    if (!file) return;
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const savedBytes = await fillPdfForm(file, formValues, flatten);
      downloadBytes(savedBytes, `${file.name.replace(/\.pdf$/i, '')}-filled.pdf`);
      setSuccess(`Form filled and saved successfully!${flatten ? ' (Fields flattened)' : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save form.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFields([]);
    setFormValues({});
    setError('');
    setSuccess('');
  };

  return (
    <>
      <FileDropzone
        accept="application/pdf,.pdf"
        disabled={busy || inspecting}
        onInvalid={setError}
        onFiles={(selected) => setFile(selected[0])}
        title={file ? file.name : 'Choose an interactive PDF Form'}
        hint="Fill, modify, and permanently flatten AcroForm fields right in your browser."
      />

      {file && (
        <section className="work-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">ACROFORM INSPECTOR</span>
              <h2>{inspecting ? 'Scanning for form fields…' : `${fields.length} form fields detected`}</h2>
            </div>
            <button className="button button-quiet button-small" disabled={busy || inspecting} onClick={reset}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          {!inspecting && fields.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#738379', fontSize: 11 }}>
              <p>No fillable AcroForm fields were detected in this document.</p>
              <p style={{ fontSize: 10, color: '#97a69e' }}>
                Tip: Standard static PDFs do not have embedded interactive form fields.
              </p>
            </div>
          )}

          {!inspecting && fields.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 16 }}>
                {fields.map((f) => {
                  const val = formValues[f.name];

                  if (f.type === 'checkbox') {
                    return (
                      <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f6f9f6', border: '1px solid #e1e9e3', borderRadius: 7 }}>
                        <input
                          type="checkbox"
                          id={`field-${f.name}`}
                          checked={Boolean(val)}
                          disabled={busy}
                          onChange={(e) => handleFieldChange(f.name, e.target.checked)}
                          style={{ width: 17, height: 17, cursor: 'pointer' }}
                        />
                        <label htmlFor={`field-${f.name}`} style={{ fontSize: 11, fontWeight: 600, color: '#273c33', cursor: 'pointer' }}>
                          {f.name}
                        </label>
                      </div>
                    );
                  }

                  if (f.type === 'dropdown' && f.options) {
                    return (
                      <label key={f.name} className="form-field">
                        <span>{f.name} (Dropdown)</span>
                        <select
                          disabled={busy}
                          value={String(val || '')}
                          onChange={(e) => handleFieldChange(f.name, e.target.value)}
                        >
                          {f.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  return (
                    <label key={f.name} className="form-field">
                      <span>{f.name}</span>
                      <input
                        type="text"
                        disabled={busy}
                        value={String(val ?? '')}
                        onChange={(e) => handleFieldChange(f.name, e.target.value)}
                        placeholder={`Enter ${f.name}…`}
                      />
                    </label>
                  );
                })}
              </div>

              {/* Flatten toggle */}
              <div style={{ marginTop: 20, padding: '12px 14px', background: '#f5f7f4', borderRadius: 8, border: '1px solid #e2eae4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    id="flattenCheck"
                    checked={flatten}
                    disabled={busy}
                    onChange={(e) => setFlatten(e.target.checked)}
                    style={{ width: 17, height: 17, cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="flattenCheck" style={{ fontSize: 11, fontWeight: 700, color: '#22382e', cursor: 'pointer', display: 'block' }}>
                      Flatten Form Fields
                    </label>
                    <span style={{ fontSize: 9, color: '#7b8f84' }}>
                      Converts form inputs into permanent document text so values can no longer be edited.
                    </span>
                  </div>
                </div>
              </div>

              <div className="button-row" style={{ marginTop: 22 }}>
                <span className="field-note">
                  Modifies form streams locally in memory. The original document is unaffected.
                </span>
                <button className="button button-primary" disabled={busy} onClick={handleSaveForm}>
                  <FileCheck size={16} /> Save & Download PDF <Download size={15} />
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <Feedback error={error} success={success} busy={busy} busyLabel="Saving form values to document…" />
    </>
  );
}
