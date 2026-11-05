import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

const output = new URL('../qa/fixtures/', import.meta.url);
await mkdir(output, { recursive: true });

async function save(name, document) {
  await writeFile(new URL(name, output), await document.save());
}

const basic = await PDFDocument.create();
const font = await basic.embedFont(StandardFonts.Helvetica);
for (let pageNumber = 1; pageNumber <= 3; pageNumber += 1) {
  const page = basic.addPage([612, 792]);
  page.drawText(`Fold QA basic fixture — page ${pageNumber}`, { x: 48, y: 720, size: 18, font, color: rgb(0.1, 0.25, 0.2) });
  page.drawText('Text and vector content for merge, split, organize, and preview checks.', { x: 48, y: 680, size: 11, font });
}
await save('basic-3-pages.pdf', basic);

const rotated = await PDFDocument.create();
const rotatedPage = rotated.addPage([612, 792]);
rotatedPage.setRotation(degrees(90));
rotatedPage.drawText('Rotated page fixture — 90 degrees', { x: 48, y: 720, size: 18, font: await rotated.embedFont(StandardFonts.Helvetica) });
await save('rotated-page.pdf', rotated);

const imageHeavy = await PDFDocument.create();
// Small transparent PNG; repeated across pages to exercise raster rendering without a large fixture.
const pixel = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p8sAAAAASUVORK5CYII='), (char) => char.charCodeAt(0));
const png = await imageHeavy.embedPng(pixel);
for (let i = 0; i < 5; i += 1) {
  const page = imageHeavy.addPage([612, 792]);
  page.drawImage(png, { x: 30, y: 30, width: 552, height: 732 });
}
await save('image-heavy-5-pages.pdf', imageHeavy);

const form = await PDFDocument.create();
const formPage = form.addPage([612, 792]);
formPage.drawText('Form and annotation fixture', { x: 48, y: 740, size: 18, font: await form.embedFont(StandardFonts.Helvetica) });
const fields = form.getForm();
const text = fields.createTextField('qa.name');
text.setText('Sample value');
text.addToPage(formPage, { x: 48, y: 650, width: 250, height: 28 });
const check = fields.createCheckBox('qa.confirmed');
check.addToPage(formPage, { x: 48, y: 600, width: 18, height: 18 });
await save('form-fields.pdf', form);

const nearLimit = await PDFDocument.create();
const nearLimitFont = await nearLimit.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 201; i += 1) {
  const page = nearLimit.addPage([612, 792]);
  page.drawText(`Page ${i} — over the 200-page app limit`, { x: 48, y: 720, size: 12, font: nearLimitFont });
}
await save('over-page-limit-201-pages.pdf', nearLimit);

await writeFile(new URL('malformed.pdf', output), '%PDF-1.7\nThis is intentionally not a valid PDF.\n');
console.log(`Created QA fixtures at ${output.pathname}`);
