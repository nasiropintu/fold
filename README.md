# Fold — Free PDF Toolkit

> **Crafted with ❤️ by NasirPintu**  
> *100% Free · Private by Design · Zero Server Uploads*

Fold is a private, browser-based PDF utility suite where all processing runs directly on your device. The app does not upload selected documents to any server or cloud API.

---

## Creator & Vision

**NasirPintu** (Mohammad Nasiruddin Pintu)  
*Creator, Product Architect & Open-Source Builder*

* **Mission:** Democratizing powerful digital tools by engineering zero-cost, privacy-first software that processes files 100% locally on the user's hardware.
* **GitHub:** [@nasiropintu](https://github.com/nasiropintu)
* **X (Twitter):** [@nasiropintu](https://x.com/nasiropintu)
* **Instagram:** [@the_np2](https://www.instagram.com/the_np2/)
* **Facebook:** [mohammadnasiruddin.pintu](https://www.facebook.com/mohammadnasiruddin.pintu/)

---

## Human-Directed AI Agent Collaboration

Fold is architected and directed by **NasirPintu**, developed in active synergy with frontier artificial intelligence assistants and autonomous coding agents:

* **Gemini** *(Google DeepMind)* — Architectural reasoning, full-stack implementation & agent workflows.
* **Manus** — Autonomous planning, system analysis & task orchestration.
* **ChatGPT** *(OpenAI)* — Logic synthesis, edge-case optimization & refactoring.
* **DeepSeek** — Algorithmic problem-solving & deep code intelligence.
* **Claude** *(Anthropic)* — Systems reasoning, code clarity & technical drafting.
* **Vibe by Mistral** — Fast code generation & pragmatic engineering.

---

## Open-Source Community Credits

Fold is proudly built upon exceptional open-source libraries:
* **[PDF.js](https://mozilla.github.io/pdf.js/)** *(Mozilla)* — In-browser PDF reading, rendering, and rasterization.
* **[pdf-lib](https://pdf-lib.js.org/)** *(Hopding)* — Client-side PDF page assembly, splitting, rotation, and mutation.
* **[Tesseract.js](https://tesseract.projectnaptha.com/)** *(Naptha)* — Client-side WebAssembly optical character recognition (OCR).
* **[Pixelmatch](https://github.com/mapbox/pixelmatch)** *(Mapbox)* — High-speed, pixel-level visual difference engine.
* **[@pdfsmaller/pdf-encrypt & decrypt](https://github.com/pdfsmaller)** — Zero-dependency Web Crypto AES-256 and RC4 document encryption and decryption.
* **[SheetJS (xlsx)](https://sheetjs.com/)** *(SheetJS Community)* — In-browser spreadsheet parsing and Excel workbook creation.
* **[docx](https://docx.js.org/)** *(Dolan Miu & Community)* — In-browser Microsoft Word (.docx) document generation.
* **[mammoth.js](https://github.com/mwilliamson/mammoth.js)** *(Michael Searle)* — Client-side Word (.docx) AST parsing and raw text extraction.
* **[React 19](https://react.dev/)** *(Meta)* — Declarative UI framework.
* **[Vite](https://vitejs.dev/)** *(Yuxi Evan You & Vite Team)* — Modern frontend build tooling.
* **[JSZip](https://stuk.github.io/jszip/)** *(Stuk)* — In-memory ZIP archive generation for file exports.
* **[Lucide Icons](https://lucide.dev/)** *(Lucide Community)* — Crisp open-source interface iconography.

---

## Modules

- `src/features/`: separate task screens for merging, splitting/extracting, organizing, image-to-PDF, compression and page-image export.
- `src/components/`: shared file intake, feedback and page-preview UI.
- `src/lib/pdf.ts`: PDF.js reading/rendering and pdf-lib document operations.
- `src/App.tsx` and `src/styles.css`: navigation shell and visual system.

## Free toolchain

React, Vite, TypeScript, PDF.js, pdf-lib, JSZip and Lucide React are open-source dependencies installed through pnpm. There are no paid APIs, accounts, database, server-side PDF uploads or OCR service.

## Browser limits and compression behavior

For predictable browser memory use, this MVP limits each input PDF to 100 MB and 200 pages; merged output is capped at 200 pages. Image-to-PDF accepts up to 50 images, 30 MB per image, 40 megapixels per image and 150 MB combined. Compression works by rasterizing pages into a new PDF, which can make text non-selectable and may not reduce every document; the screen describes this and reports actual output size instead of promising a fixed reduction. Password-protected PDFs and invalid files produce visible errors. OCR and conversion to Word/Excel/PowerPoint are outside this release.

Compression and page-image export can be cancelled during rendering. Compression estimates total rendered pixels before processing and caps output at 100 MB. Page-image export is limited to 30 pages, 30 million rendered pixels, and 100 MB ZIP output; pages are added to the ZIP as blobs to avoid base64 copies. See `qa/README.md` for local QA fixtures and the manual cross-viewer checklist.

## Development

Use `pnpm install`, `pnpm dev`, and `pnpm build`.
