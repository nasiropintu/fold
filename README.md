# Fold — Free PDF Toolkit

Fold is an original, browser-based PDF utility. Processing runs on the visitor's device; the app does not upload selected documents to an application server.

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
