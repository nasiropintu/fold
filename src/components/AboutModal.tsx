import { useEffect, useState } from 'react';
import { X, Heart, ExternalLink, Sparkles, Bot, Code2, ShieldCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const socialLinks = [
  {
    name: 'GitHub',
    handle: '@nasiropintu',
    url: 'https://github.com/nasiropintu',
    color: '#24292e',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
  },
  {
    name: 'X (Twitter)',
    handle: '@nasiropintu',
    url: 'https://x.com/nasiropintu',
    color: '#000000',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    name: 'Instagram',
    handle: '@the_np2',
    url: 'https://www.instagram.com/the_np2/',
    color: '#E1306C',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    name: 'Facebook',
    handle: 'mohammadnasiruddin.pintu',
    url: 'https://www.facebook.com/mohammadnasiruddin.pintu/',
    color: '#1877F2',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
];

const aiCollaborators = [
  { name: 'Gemini', provider: 'Google DeepMind', role: 'Architecture & Agentic Workflows' },
  { name: 'Manus', provider: 'Manus AI', role: 'Autonomous Planning & Synthesis' },
  { name: 'ChatGPT', provider: 'OpenAI', role: 'Logic Optimization & Reasoning' },
  { name: 'DeepSeek', provider: 'DeepSeek', role: 'Algorithmic Engineering & Core Logic' },
  { name: 'Claude', provider: 'Anthropic', role: 'Systems Architecture & Clean Design' },
  { name: 'Vibe by Mistral', provider: 'Mistral AI', role: 'Fast Generation & Execution' },
];

const openSourceCredits = [
  { name: 'pdf-lib', author: 'Hopding', desc: 'In-browser PDF mutation, merging, splitting & extraction' },
  { name: 'PDF.js', author: 'Mozilla', desc: 'High-fidelity PDF page parsing and rasterization' },
  { name: 'Tesseract.js', author: 'Naptha', desc: 'Client-side WebAssembly OCR and machine vision' },
  { name: 'Pixelmatch', author: 'Mapbox', desc: 'Fast, pixel-level visual document difference engine' },
  { name: 'React 19', author: 'Meta', desc: 'Component architecture and state primitives' },
  { name: 'Vite', author: 'Evan You & Community', desc: 'Lightning-fast frontend toolchain and packaging' },
  { name: 'JSZip', author: 'Stuk', desc: 'Client-side ZIP compression and asset packing' },
  { name: 'Lucide Icons', author: 'Lucide Community', desc: 'Clean, open-source user interface icons' },
];

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="about-modal-title">
      <div className="about-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="about-modal-close" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>

        {/* Creator Hero Header */}
        <div className="creator-hero">
          <div className="creator-avatar-wrap">
            {!photoError ? (
              <img
                src={`${import.meta.env.BASE_URL}nasirpintu.jpg`}
                alt="NasirPintu"
                className="creator-avatar-img"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <div className="creator-avatar-fallback">
                <span>NP</span>
              </div>
            )}
            <div className="creator-avatar-badge" title="Creator Verified">
              <Sparkles size={11} />
            </div>
          </div>

          <div className="creator-meta">
            <div className="creator-tagline-pill">
              <Heart size={11} className="heart-accent" />
              <span>Crafted with Love</span>
            </div>
            <h2 id="about-modal-title" className="creator-name">NasirPintu</h2>
            <p className="creator-subtitle">Mohammad Nasiruddin Pintu · Creator & Architect</p>
            <p className="creator-bio">
              Dedicated to building free, private-by-design, serverless tools that empower people without paywalls, subscriptions, or data tracking.
            </p>
          </div>
        </div>

        {/* Verified Social Links */}
        <div className="about-section">
          <div className="about-section-label">CONNECT WITH NASIRPINTU</div>
          <div className="social-links-grid">
            {socialLinks.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill"
                title={`${s.name} (${s.handle})`}
              >
                <span className="social-icon">{s.icon}</span>
                <span className="social-info">
                  <strong>{s.name}</strong>
                  <small>{s.handle}</small>
                </span>
                <ExternalLink size={12} className="social-arrow" />
              </a>
            ))}
          </div>
        </div>

        {/* The Human + AI Collaboration Suite */}
        <div className="about-section">
          <div className="about-section-head">
            <div className="about-section-label">
              <Bot size={13} style={{ display: 'inline', marginRight: 6 }} />
              AI AGENT COLLABORATION CREDITS
            </div>
            <span className="ai-sublabel">Human-Directed · Agent-Assisted</span>
          </div>
          <p className="about-narrative">
            Every feature in this suite is conceived and architected by <strong>NasirPintu</strong>, engineered in active synergy with frontier artificial intelligence models and autonomous coding agents.
          </p>
          <div className="ai-agents-grid">
            {aiCollaborators.map((ai) => (
              <div key={ai.name} className="ai-agent-chip">
                <div className="ai-agent-dot" />
                <div className="ai-agent-text">
                  <strong>{ai.name}</strong>
                  <span className="ai-agent-provider">{ai.provider}</span>
                  <span className="ai-agent-role">{ai.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open-Source Foundations */}
        <div className="about-section">
          <div className="about-section-label">
            <Code2 size={13} style={{ display: 'inline', marginRight: 6 }} />
            OPEN-SOURCE COMMUNITY CREDITS
          </div>
          <p className="about-narrative">
            Fold runs 100% locally on your machine with zero server costs, built on the shoulders of these open-source giants:
          </p>
          <div className="oss-grid">
            {openSourceCredits.map((oss) => (
              <div key={oss.name} className="oss-card">
                <div className="oss-head">
                  <strong>{oss.name}</strong>
                  <span>by {oss.author}</span>
                </div>
                <p>{oss.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="about-modal-footer">
          <ShieldCheck size={14} className="privacy-badge-icon" />
          <span>
            <strong>Privacy Guarantee:</strong> All document processing stays strictly in your browser. Zero uploads. Zero telemetry.
          </span>
        </div>
      </div>
    </div>
  );
}
