import { useState } from 'react';
import { LockOpen, Eye, EyeOff, RotateCcw, Download, CheckCircle, ShieldAlert } from 'lucide-react';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';
import FileDropzone from '../components/FileDropzone';
import Feedback from '../components/Feedback';
import { downloadBytes, formatBytes } from '../lib/pdf';

export default function UnlockTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [encryptionDetails, setEncryptionDetails] = useState<string | null>(null);
  const [isNotEncrypted, setIsNotEncrypted] = useState(false);

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
    setPassword('');
    setIsNotEncrypted(false);
    setEncryptionDetails(null);

    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);

      const encInfo = await isEncrypted(bytes);
      if (!encInfo.encrypted) {
        setIsNotEncrypted(true);
        setSuccess('This document is already unencrypted. It does not require a password!');
      } else {
        const algo = encInfo.algorithm || 'Standard PDF';
        const keyLen = encInfo.keyLength ? ` (${encInfo.keyLength}-bit)` : '';
        setEncryptionDetails(`${algo}${keyLen}`);
      }
    } catch {
      setError('Could not inspect the uploaded document.');
    }
  };

  const handleUnlock = async () => {
    if (!file || !fileBytes) return;

    if (!password) {
      setError('Please enter the password to unlock this document.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    setProgressVal(35);

    try {
      setProgressVal(65);
      const decrypted = await decryptPDF(fileBytes, password);
      setProgressVal(100);

      setResultBytes(decrypted);
      setSuccess('PDF successfully unlocked and password protection removed!');

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      downloadBytes(decrypted, `${nameWithoutExt}-unlocked.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('key')) {
        setError('Incorrect password. Please verify the credentials and try again.');
      } else {
        setError(msg || 'Failed to decrypt document. Please verify the password.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    downloadBytes(resultBytes, `${nameWithoutExt}-unlocked.pdf`);
  };

  const reset = () => {
    setFile(null);
    setFileBytes(null);
    setPassword('');
    setEncryptionDetails(null);
    setIsNotEncrypted(false);
    setResultBytes(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="tool-view">
      <div className="tool-header-block">
        <div className="tool-tag-pill">
          <LockOpen size={12} />
          <span>PHASE 4 · SECURITY & DECRYPTION</span>
        </div>
        <h2>Unlock PDF</h2>
        <p>Remove passwords, permissions, and security restrictions from encrypted PDF documents 100% locally in your browser.</p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          disabled={busy}
          onInvalid={setError}
          onFiles={handleFiles}
          title="Drop your password-protected PDF here"
          hint="Remove password security and export an unrestricted copy"
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

          {isNotEncrypted ? (
            <div className="notice" style={{ marginTop: 16 }}>
              <CheckCircle size={16} color="#10b981" />
              <p>
                <strong>No Password Needed:</strong> This PDF is already unrestricted and does not require decryption.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 20 }}>
              {encryptionDetails && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <ShieldAlert size={16} color="#f59e0b" />
                  <span className="subtext">
                    Detected encryption: <strong>{encryptionDetails}</strong>
                  </span>
                </div>
              )}

              <div style={{ maxWidth: 420 }}>
                <label className="tool-label">Enter Document Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="text-input"
                    style={{ paddingRight: 36 }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to unlock…"
                    disabled={busy}
                    autoFocus
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
                <span className="subtext">Enter user password or owner password to decrypt.</span>
              </div>

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button
                  className="primary-action-btn"
                  onClick={handleUnlock}
                  disabled={busy || !password}
                >
                  <LockOpen size={16} />
                  <span>{busy ? 'Decrypting PDF…' : 'Unlock & Decrypt PDF'}</span>
                </button>

                {resultBytes && (
                  <button className="secondary-action-btn" onClick={handleDownload}>
                    <Download size={16} />
                    <span>Download Unlocked PDF</span>
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
        busyLabel="Verifying credentials & decrypting document stream…"
        progress={busy ? progressVal : undefined}
      />
    </div>
  );
}
