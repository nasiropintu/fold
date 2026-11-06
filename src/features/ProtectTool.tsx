import { useState } from 'react';
import { Lock, Eye, EyeOff, RotateCcw, ShieldCheck, Download, AlertCircle } from 'lucide-react';
import { encryptPDF, EncryptPDFOptions, AlreadyEncryptedError } from '@pdfsmaller/pdf-encrypt';
import { isEncrypted } from '@pdfsmaller/pdf-decrypt';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBytes, formatBytes } from '../lib/pdf';

export default function ProtectTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [alreadyProtected, setAlreadyProtected] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');

  // Granular permissions
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowModifying, setAllowModifying] = useState(false);
  const [allowAnnotating, setAllowAnnotating] = useState(true);
  const [allowFillingForms, setAllowFillingForms] = useState(true);

  const [busy, setBusy] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFiles = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setError('');
    setSuccess('');
    setResultBytes(null);
    setAlreadyProtected(false);

    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);

      const encInfo = await isEncrypted(bytes);
      if (encInfo.encrypted) {
        setAlreadyProtected(true);
        setError('This PDF is already encrypted with a password. Use the Unlock PDF tool first if you wish to change its credentials.');
      }
    } catch {
      setError('Could not inspect the uploaded document.');
    }
  };

  const handleProtect = async () => {
    if (!file || !fileBytes) return;

    if (!userPassword) {
      setError('Please enter a password to protect your document.');
      return;
    }

    if (userPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    setProgressVal(30);

    try {
      const options: EncryptPDFOptions = {
        algorithm,
        allowPrinting,
        allowCopying,
        allowModifying,
        allowAnnotating,
        allowFillingForms,
      };

      if (ownerPassword.trim()) {
        options.ownerPassword = ownerPassword.trim();
      }

      setProgressVal(60);
      const encrypted = await encryptPDF(fileBytes, userPassword, options);
      setProgressVal(100);

      setResultBytes(encrypted);
      setSuccess(`PDF successfully protected with ${algorithm} encryption!`);

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      downloadBytes(encrypted, `${nameWithoutExt}-protected.pdf`);
    } catch (err: unknown) {
      if (err instanceof AlreadyEncryptedError) {
        setError('This PDF is already password-protected.');
      } else {
        const message = err instanceof Error ? err.message : 'Encryption failed.';
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    downloadBytes(resultBytes, `${nameWithoutExt}-protected.pdf`);
  };

  const reset = () => {
    setFile(null);
    setFileBytes(null);
    setAlreadyProtected(false);
    setUserPassword('');
    setConfirmPassword('');
    setOwnerPassword('');
    setResultBytes(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <ShieldCheck size={12} />
          <span>PHASE 4 · SECURITY & ENCRYPTION</span>
        </div>
        <h2>Protect PDF</h2>
        <p>Encrypt your PDF document with industry-standard AES-256 or RC4 password protection and set granular document permissions.</p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={handleFiles}
          title="Drop your PDF here to protect"
          hint="Secure your sensitive documents with client-side password encryption"
        />
      ) : (
        <div className="tool-card-box">
          <div className="tool-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{file.name}</strong>
              <span className="subtext" style={{ marginLeft: 8 }}>({formatBytes(file.size)})</span>
            </div>
            <button className="text-button" onClick={reset} disabled={busy}>
              <RotateCcw size={14} /> Change file
            </button>
          </div>

          {alreadyProtected ? (
            <div className="notice" style={{ marginTop: 16 }}>
              <AlertCircle size={16} />
              <p>
                <strong>Already Encrypted:</strong> This document already contains password protection. To re-encrypt it with new settings or permissions, first unlock it using the Unlock PDF tool.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <label className="tool-label">Document Password (Required to Open)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="text-input"
                      style={{ paddingRight: 36 }}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Enter strong password…"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 4, top: 4 }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <span className="subtext">Recipients must enter this password to view the PDF.</span>
                </div>

                <div>
                  <label className="tool-label">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="text-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password…"
                    disabled={busy}
                  />
                  {userPassword && confirmPassword && userPassword !== confirmPassword && (
                    <span className="subtext" style={{ color: '#ef4444' }}>Passwords do not match</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 16 }}>
                <div>
                  <label className="tool-label">Owner / Permissions Password (Optional)</label>
                  <input
                    type="password"
                    className="text-input"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Optional master password…"
                    disabled={busy}
                  />
                  <span className="subtext">Allows changing permissions without knowing the user password.</span>
                </div>

                <div>
                  <label className="tool-label">Encryption Standard</label>
                  <select
                    className="select-input"
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as 'AES-256' | 'RC4')}
                    disabled={busy}
                  >
                    <option value="AES-256">AES-256 (PDF 2.0 Standard — Recommended)</option>
                    <option value="RC4">RC4 128-bit (Legacy Compatibility)</option>
                  </select>
                  <span className="subtext">AES-256 is the strongest modern cryptographic standard.</span>
                </div>
              </div>

              {/* Granular Permissions */}
              <div style={{ marginTop: 22, borderTop: '1px solid var(--border-color, #e5e7eb)', paddingTop: 16 }}>
                <label className="tool-label" style={{ marginBottom: 10 }}>Document Permissions for Users</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowPrinting}
                      onChange={(e) => setAllowPrinting(e.target.checked)}
                      disabled={busy}
                    />
                    <span>Allow Printing</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowCopying}
                      onChange={(e) => setAllowCopying(e.target.checked)}
                      disabled={busy}
                    />
                    <span>Allow Text & Graphic Copying</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowFillingForms}
                      onChange={(e) => setAllowFillingForms(e.target.checked)}
                      disabled={busy}
                    />
                    <span>Allow Form Filling</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowAnnotating}
                      onChange={(e) => setAllowAnnotating(e.target.checked)}
                      disabled={busy}
                    />
                    <span>Allow Comments & Annotations</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowModifying}
                      onChange={(e) => setAllowModifying(e.target.checked)}
                      disabled={busy}
                    />
                    <span>Allow Modifying Document</span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button
                  className="primary-action-btn"
                  onClick={handleProtect}
                  disabled={busy || !userPassword || userPassword !== confirmPassword}
                >
                  <Lock size={16} />
                  <span>{busy ? 'Encrypting Document…' : 'Protect & Encrypt PDF'}</span>
                </button>

                {resultBytes && (
                  <button className="secondary-action-btn" onClick={handleDownload}>
                    <Download size={16} />
                    <span>Download Protected PDF</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Feedback
        error={error}
        success={success}
        busy={busy}
        busyLabel={`Encrypting document with ${algorithm}…`}
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
