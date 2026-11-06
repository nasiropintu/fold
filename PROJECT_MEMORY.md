# Project Memory — Fold (Free PDF Toolkit)

**Last Updated:** November 2026  
**Repository:** [https://github.com/nasiropintu/fold](https://github.com/nasiropintu/fold)  
**Live URL:** [https://nasiropintu.github.io/fold/](https://nasiropintu.github.io/fold/)  
**Local Workspace:** `C:\Users\User\Desktop\fold-project-complete\fold`

---

## 1. Project Overview & Philosophy
**Fold** is a private, client-side PDF utility application built with React, Vite, and TypeScript.
* **Tagline:** *"Crafted with ❤️ by NasirPintu"*
* **Creator:** **NasirPintu** (Mohammad Nasiruddin Pintu) — [GitHub](https://github.com/nasiropintu) | [X](https://x.com/nasiropintu) | [Instagram](https://www.instagram.com/the_np2/) | [Facebook](https://www.facebook.com/mohammadnasiruddin.pintu/)
* **Attribution Standard:** Documented in [`CREATOR_STANDARDS.md`](./CREATOR_STANDARDS.md) — all future features and projects must include the tagline, About modal, AI collaboration credits (Gemini, Manus, ChatGPT, DeepSeek, Claude, Vibe by Mistral), and open-source community credits.
* **Developer Workflow Rules:**
  * **Always deliver strategic plans, architecture decisions, and roadmap proposals in structured Markdown artifacts.**
  * **Always provide git commit and push commands to the user after every milestone and feature completion.**
* **UI/UX & Information Architecture Standards (Milestone 4.0):**
  * **Category-Based Navigation:** 17+ tools structured into 4 distinct functional domains (`Organize & Pages`, `Security & Privacy`, `Conversions & Data`, `Intelligence & AI`).
  * **Sidebar Quick Search:** Live tool filtering input with count badges.
  * **Category Filter Pills on Home Shelf:** One-click toggling between functional domains.
  * **Standardized Typography Scale:** Strict 11px floor for micro-metadata/eyebrows, 13–14px for interactive controls/buttons, 13.5px for nav items, 14–15px for body text, 15.5px for card titles, 20–24px for H2, 34px for H1. Zero sub-11px font sizes.
* **100% Client-Side:** All document processing (reading, rendering, merging, rasterizing, compressing, and exporting) runs in the user's browser via Web Workers and HTML5 Canvas.
* **Zero Server Uploads:** No files are uploaded to any server or cloud API; completely private by design.
* **Zero Paid Services:** Built entirely on open-source libraries without subscriptions or external APIs.

---

## 2. Technology Stack & Key Dependencies
* **Framework:** React 19 (`react`, `react-dom`)
* **Build Tool:** Vite 6 (`@vitejs/plugin-react`) configured with `base: './'` for GitHub Pages
* **Language:** TypeScript 5.7+
* **Package Manager:** `pnpm@11.25.0`
* **Core Libraries:**
  * `pdf-lib` (v1.17.1): PDF creation, page extraction, copying, rotation, and re-assembly.
  * `pdfjs-dist` (v4.10.38): Page reading, thumbnail rendering, and rasterization via `pdf.worker.min.mjs`.
  * `jszip` (v3.10.1): Compressing exported page images into downloadable `.zip` archives.
  * `lucide-react` (v0.468.0): Icon library.

---

## 3. Architecture & Implemented Features

### Project Layout
```
fold/
├── .github/workflows/deploy.yml   # CI/CD: Automated build & deploy to GitHub Pages
├── public/                        # Static assets (favicons, manifests)
├── qa/                            # QA documentation & test fixtures
├── scripts/create-fixtures.mjs    # Generates local test PDFs
├── src/
│   ├── components/                # FileDropzone, SortableFileList, Feedback, usePdfPreview
│   ├── features/                  # 6 Core tool modules + Home dashboard
│   ├── lib/pdf.ts                 # PDF engine (pdf-lib + PDF.js + limits & sanitization)
│   ├── App.tsx                    # Layout shell, sidebar nav, responsive mobile menu
│   └── styles.css                 # Comprehensive custom design system
├── vite.config.ts                 # Vite config with base: './'
└── package.json
```

### Implemented Tools (`src/features/`)
1. **Merge PDFs (`MergeTool.tsx`)**: Reorderable list of multiple PDF files merged into a single document.
2. **Split & Extract (`SplitTool.tsx`)**: Split pages via range strings (`1-3, 5`) or hand-picked selections.
3. **Organize Pages (`OrganizeTool.tsx`)**: Visual grid of page thumbnails with reordering, 90° rotation, and deletion.
4. **Images to PDF (`ImagesToPdfTool.tsx`)**: Convert JPG and PNG images into a PDF with A4/fit sizing and portrait/landscape orientations.
5. **Compress PDF (`CompressTool.tsx`)**: Rasterized compression presets with memory estimation, cancellation (`AbortSignal`), and live progress.
6. **PDF to Images (`ExportImagesTool.tsx`)**: Export PDF pages to JPG or PNG files packaged in a ZIP.
7. **Sign PDF (`SignTool.tsx`)**: Draw, type, or upload a digital signature and visually position/stamp it on any PDF page.
8. **Watermark PDF (`WatermarkTool.tsx`)**: Stamp customizable text or brand logos with rotation, opacity, position, and page range controls.
9. **Page Numbers (`PageNumbersTool.tsx`)**: Add formatted header or footer page numbering with customizable placement, margins, and cover page skipping.
10. **Compare PDFs (`CompareTool.tsx`)**: Pixel-level visual diff using `pixelmatch` to detect and highlight alterations between two PDF revisions.
11. **OCR PDF (`OcrTool.tsx`)**: In-browser machine vision and OCR using `tesseract.js` WebAssembly to extract text, export to `.txt`, or generate clean text PDFs.
12. **Redact PDF (`RedactTool.tsx`)**: Interactive rectangle drawing to permanently black out and purge confidential data by re-rasterizing redacted pages.
13. **Fill Forms (`FormsTool.tsx`)**: Inspect, fill in interactive AcroForm fields (text, checkboxes, dropdowns, radios), and optionally flatten them.
14. **PDF to Markdown (`PdfToMarkdownTool.tsx`)**: Extract clean Markdown text with automatic heading detection, paragraph groupings, and clipboard/.md export.
15. **PDF & Excel (`ExcelTool.tsx`)**: Dual-mode converter — extract PDF table structures into Excel (.xlsx) workbooks or convert spreadsheets into styled PDF tables.
16. **AI Summarizer (`AiSummarizerTool.tsx`)**: Local document summarization supporting Chrome Built-in AI with on-device algorithmic fallback.
17. **Workflow Automator (`WorkflowTool.tsx`)**: Sequential pipeline builder chaining watermarks, pagination, page rotations, and rasterized compression into a single run.
18. **Protect PDF (`ProtectTool.tsx`)**: In-browser AES-256 and RC4 password encryption with granular permissions (printing, copying, form filling, annotations).
19. **Unlock PDF (`UnlockTool.tsx`)**: Client-side decryption and password removal for encrypted PDFs using pure Web Crypto without server calls.
20. **Rotate & Crop PDF (`CropTool.tsx`)**: Interactive canvas crop box, margin presets, and 90°/180° orientation adjustment modifying PDF `CropBox` and `MediaBox` vectors directly.
21. **PDF to Word (`PdfToWordTool.tsx`)**: In-browser conversion of PDF text, font hierarchies, and headings into editable Microsoft Word (.docx) files via `docx`.
22. **Word to PDF (`WordToPdfTool.tsx`)**: Client-side `.docx` AST parsing via `mammoth.js` and layout rendering onto paginated PDF pages via `pdf-lib`.
23. **Scan to PDF (`ScanTool.tsx`)**: Direct hardware camera capture via `navigator.mediaDevices.getUserMedia` with B&W/grayscale contrast filters and multi-page compiling.
24. **Repair PDF (`RepairTool.tsx`)**: Reconstructs damaged, corrupted, or truncated PDFs by rebuilding broken cross-reference (XRef) tables and repairing trailer markers.

### Memory & Stability Safeguards (`src/lib/pdf.ts`)
* $\le 100\text{ MB}$ per input PDF; $\le 200\text{ pages}$ per document.
* Canvas destruction (`canvas.width = 0; canvas.height = 0; page.cleanup(); pdfDocument.destroy()`).
* AbortSignal support across async rendering tasks to prevent hanging processes.

---

## 4. Git & Deployment Setup
* **GitHub User:** `nasiropintu`
* **Remote:** `https://nasiropintu@github.com/nasiropintu/fold.git`
* **Branch:** `main`
* **CI/CD:** `.github/workflows/deploy.yml` runs on push to `main` with Node 22 and `pnpm`.
* **Important Activation Step:** In GitHub repository settings:
  👉 **Settings > Pages > Build and deployment > Source: GitHub Actions**
  (Fixes the `HttpError: Not Found - Get Pages site failed` when first deploying).

---

## 5. Quick Commands
* **Install dependencies:** `pnpm install`
* **Start dev server:** `pnpm dev` (runs at `http://localhost:3000`)
* **Build production:** `pnpm build`
* **Regenerate test fixtures:** `node scripts/create-fixtures.mjs`
* **Push changes to GitHub:** `git push origin main`
