# PDF workflow QA

Run `node scripts/create-fixtures.mjs` to regenerate the local fixtures under `qa/fixtures/`. The generator intentionally creates small files; the 201-page file exercises the documented page-count boundary.

## Current baseline

- `pnpm build` passes with TypeScript and Vite (Vite 6.4.5 resolved from the declared `^6.0.5` range).
- The production build still warns that `src/lib/pdf.ts` produces a roughly 909 kB minified chunk; the PDF.js worker is roughly 1.38 MB before transfer compression.
- Fixture generation completed and each generated PDF begins with a `%PDF-` signature. The malformed fixture is intentionally invalid after its header.
- Cross-viewer output checks, device memory checks, and the encrypted fixture remain pending; this is not a release sign-off.

| Fixture | What to check |
|---|---|
| `basic-3-pages.pdf` | Merge, extract, reorder, export images, and preview |
| `rotated-page.pdf` | Preview orientation, rotate controls, and saved page orientation |
| `image-heavy-5-pages.pdf` | Rendering, compression, JPG/PNG export, and memory cleanup |
| `form-fields.pdf` | Whether operations preserve or discard interactive form fields; document expected behavior |
| `over-page-limit-201-pages.pdf` | Clear rejection at the 200-page limit |
| `malformed.pdf` | Clear rejection of a damaged PDF |

## Manual output checks

For valid fixtures, run each applicable tool and open the output in two independent viewers (for example, a browser PDF viewer and a desktop reader). Check page count, page order, rotation, visible content, and form-field behavior. Record browser/OS/viewer versions and any differences before release.

An encrypted fixture is not generated because `pdf-lib` does not create password-protected PDFs. Add one from a trusted local PDF tool when available; use a disposable document with no personal data. Verify a clear password-protected-file error until password entry is implemented.

Large-file and memory behavior still needs device-specific runs. Do not treat the small image-heavy fixture as evidence for near-device-limit performance.
