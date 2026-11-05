# Project Memory — Fold (Free PDF Toolkit)

**Last Updated:** November 2026  
**Repository:** [https://github.com/nasiropintu/fold](https://github.com/nasiropintu/fold)  
**Live URL:** [https://nasiropintu.github.io/fold/](https://nasiropintu.github.io/fold/)  
**Local Workspace:** `C:\Users\User\Desktop\fold-project-complete\fold`

---

## 1. Project Overview & Philosophy
**Fold** is a private, client-side PDF utility application built with React, Vite, and TypeScript.
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
