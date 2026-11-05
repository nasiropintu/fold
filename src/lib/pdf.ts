import { degrees, PDFDocument, PageSizes, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const MAX_PDF_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_PAGES = 200;
export const MAX_EXPORT_IMAGE_PAGES = 30;
export const MAX_EXPORT_IMAGE_PIXELS = 30_000_000;
export const MAX_OPERATION_OUTPUT_BYTES = 100 * 1024 * 1024;
export const MAX_COMPRESS_PIXELS = 120_000_000;
export type PagePreview = { pageNumber: number; thumbnail: string };
export type PageArrangement = { originalIndex: number; rotation: number };
export type PageOrientation = 'auto' | 'portrait' | 'landscape';
export type PageSizing = 'fit' | 'a4';

export class ProcessingCancelledError extends Error {
  constructor() {
    super('Processing cancelled.');
    this.name = 'ProcessingCancelledError';
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ProcessingCancelledError();
}

async function renderPage(
  page: pdfjsLib.PDFPageProxy,
  options: Parameters<pdfjsLib.PDFPageProxy['render']>[0],
  signal?: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);
  const task = page.render(options);
  const cancel = () => task.cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    await task.promise;
  } catch (cause) {
    if (signal?.aborted) throw new ProcessingCancelledError();
    throw cause;
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validatePdfFile(file: File): void {
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name} is over the 100 MB per-file limit.`);
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error(`${file.name} is not a PDF file.`);
  }
}

async function readPdfBytes(file: File): Promise<Uint8Array> {
  validatePdfFile(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  if (!header.includes('%PDF-')) throw new Error(`${file.name} does not contain a valid PDF header.`);
  return bytes;
}

export async function inspectPdf(file: File): Promise<number> {
  const bytes = await readPdfBytes(file);
  const document = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pageCount = document.numPages;
  await document.destroy();
  if (pageCount < 1) throw new Error('This PDF has no pages.');
  if (pageCount > MAX_PDF_PAGES) throw new Error(`This PDF has ${pageCount} pages; the current browser limit is ${MAX_PDF_PAGES}.`);
  return pageCount;
}

export async function createPagePreviews(file: File, maxWidth = 180): Promise<PagePreview[]> {
  const bytes = await readPdfBytes(file);
  const pdfDocument = await pdfjsLib.getDocument({ data: bytes }).promise;
  try {
    if (pdfDocument.numPages > MAX_PDF_PAGES) throw new Error(`This PDF exceeds the ${MAX_PDF_PAGES}-page browser limit.`);
    const previews: PagePreview[] = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = boundedCanvasScale(baseViewport.width, baseViewport.height, maxWidth / baseViewport.width, 260, 45_000);
      const viewport = page.getViewport({ scale });
      const canvas = globalThis.document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not create a page preview.');
      await page.render({ canvasContext: context, viewport }).promise;
      const thumbnail = canvas.toDataURL('image/jpeg', 0.78);
      canvas.width = 0;
      canvas.height = 0;
      previews.push({ pageNumber, thumbnail });
      page.cleanup();
    }
    return previews;
  } finally {
    await pdfDocument.destroy();
  }
}

async function loadPdfLibDocument(file: File): Promise<PDFDocument> {
  const bytes = await readPdfBytes(file);
  try {
    const document = await PDFDocument.load(bytes);
    if (document.getPageCount() > MAX_PDF_PAGES) {
      throw new Error(`This PDF exceeds the ${MAX_PDF_PAGES}-page browser limit.`);
    }
    return document;
  } catch (error) {
    if (error instanceof Error && error.message.includes('browser limit')) throw error;
    throw new Error(`Could not open ${file.name}. It may be password-protected or damaged.`);
  }
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  if (files.length < 2) throw new Error('Choose at least two PDF files to merge.');
  const combinedSize = files.reduce((sum, file) => sum + file.size, 0);
  if (combinedSize > 250 * 1024 * 1024) throw new Error('The selected PDFs total more than 250 MB. Try fewer or smaller files.');
  const output = await PDFDocument.create();
  for (const file of files) {
    const input = await loadPdfLibDocument(file);
    if (output.getPageCount() + input.getPageCount() > MAX_PDF_PAGES) throw new Error(`The merged PDF would exceed the ${MAX_PDF_PAGES}-page browser limit.`);
    const pages = await output.copyPages(input, input.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }
  return output.save();
}

export function parsePageRanges(value: string, pageCount: number): number[] {
  if (!value.trim()) throw new Error('Enter one or more page numbers or ranges.');
  const pages = new Set<number>();
  for (const rawPart of value.split(',')) {
    const part = rawPart.trim();
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) throw new Error(`“${part}” is not a valid page number or range. Try 1-3, 5.`);
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < 1 || start > pageCount || end > pageCount || end < start) {
      throw new Error(`Page range “${part}” is outside this PDF's 1–${pageCount} pages.`);
    }
    for (let page = start; page <= end; page += 1) pages.add(page - 1);
  }
  return [...pages].sort((a, b) => a - b);
}

export async function exportSelectedPages(file: File, indices: number[]): Promise<Uint8Array> {
  if (indices.length === 0) throw new Error('Select at least one page to export.');
  const input = await loadPdfLibDocument(file);
  const output = await PDFDocument.create();
  const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);
  if (uniqueIndices.some((index) => index < 0 || index >= input.getPageCount())) throw new Error('A selected page is outside the document.');
  const pages = await output.copyPages(input, uniqueIndices);
  pages.forEach((page) => output.addPage(page));
  return output.save();
}

export async function exportOrganizedPdf(file: File, arrangement: PageArrangement[]): Promise<Uint8Array> {
  if (arrangement.length === 0) throw new Error('Keep at least one page in the document.');
  const input = await loadPdfLibDocument(file);
  const output = await PDFDocument.create();
  const pageIndices = arrangement.map((item) => item.originalIndex);
  if (pageIndices.some((index) => index < 0 || index >= input.getPageCount())) throw new Error('A page in the selection is no longer available.');
  const pages = await output.copyPages(input, pageIndices);
  pages.forEach((page, index) => {
    const originalRotation = input.getPage(arrangement[index].originalIndex).getRotation().angle;
    const addedRotation = arrangement[index].rotation;
    page.setRotation(degrees(((originalRotation + addedRotation) % 360 + 360) % 360));
    output.addPage(page);
  });
  return output.save();
}

export async function imagesToPdf(files: File[], sizing: PageSizing, orientation: PageOrientation): Promise<Uint8Array> {
  if (!files.length) throw new Error('Choose at least one JPG or PNG image.');
  if (files.length > 50) throw new Error('Choose no more than 50 images at a time.');
  if (files.reduce((total, file) => total + file.size, 0) > 150 * 1024 * 1024) throw new Error('The selected images total more than 150 MB. Choose fewer or smaller images.');
  const output = await PDFDocument.create();
  for (const file of files) {
    if (file.size === 0 || file.size > 30 * 1024 * 1024) throw new Error(`${file.name} is empty or over the 30 MB per-image limit.`);
    const type = file.type.toLowerCase();
    const extension = file.name.toLowerCase();
    const isPng = type === 'image/png' || ((!type || type === 'application/octet-stream') && extension.endsWith('.png'));
    const isJpg = type === 'image/jpeg' || type === 'image/jpg' || ((!type || type === 'application/octet-stream') && /\.jpe?g$/.test(extension));
    if (!isPng && !isJpg) throw new Error(`${file.name} is not a JPG or PNG image.`);
    let dimensions: { width: number; height: number };
    try {
      const bitmap = await createImageBitmap(file);
      dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
    } catch {
      throw new Error(`Could not inspect ${file.name} as an image. Use a valid JPG or PNG in a modern browser.`);
    }
    if (dimensions.width > 20000 || dimensions.height > 20000 || dimensions.width * dimensions.height > 40_000_000) throw new Error(`${file.name} exceeds the 40-megapixel image limit.`);
    let image;
    try {
      if (isPng) image = await output.embedPng(await file.arrayBuffer());
      else image = await output.embedJpg(await file.arrayBuffer());
    } catch (error) {
      throw new Error(`Could not read ${file.name}. Use a valid JPG or PNG image.`);
    }
    const naturalWidth = image.width * 0.75;
    const naturalHeight = image.height * 0.75;
    let pageWidth = naturalWidth;
    let pageHeight = naturalHeight;
    if (sizing === 'a4') {
      [pageWidth, pageHeight] = PageSizes.A4;
      if (orientation === 'auto' && image.width > image.height) [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }
    if (orientation === 'landscape' && pageWidth < pageHeight) [pageWidth, pageHeight] = [pageHeight, pageWidth];
    if (orientation === 'portrait' && pageWidth > pageHeight) [pageWidth, pageHeight] = [pageHeight, pageWidth];
    const page = output.addPage([pageWidth, pageHeight]);
    const scale = Math.min(pageWidth / image.width, pageHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    page.drawImage(image, { x: (pageWidth - drawWidth) / 2, y: (pageHeight - drawHeight) / 2, width: drawWidth, height: drawHeight });
  }
  return output.save();
}

function canvasJpegBytes(canvas: HTMLCanvasElement, quality: number): Uint8Array {
  const encoded = canvas.toDataURL('image/jpeg', quality).split(',')[1];
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function canvasToBlob(canvas: HTMLCanvasElement, format: 'jpg' | 'png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Your browser could not encode this page image.'));
    }, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
  });
}

export async function compressPdfRasterized(file: File, dpi: number, quality: number, onProgress: (value: number) => void, signal?: AbortSignal): Promise<Uint8Array> {
  const bytes = await readPdfBytes(file);
  const source = await pdfjsLib.getDocument({ data: bytes }).promise;
  try {
    if (source.numPages > MAX_PDF_PAGES) throw new Error(`This PDF exceeds the ${MAX_PDF_PAGES}-page browser limit.`);
    let estimatedPixels = 0;
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      throwIfAborted(signal);
      const page = await source.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = boundedCanvasScale(base.width, base.height, dpi / 72, 5000, 8_000_000);
      estimatedPixels += Math.ceil(base.width * scale) * Math.ceil(base.height * scale);
      page.cleanup();
      if (estimatedPixels > MAX_COMPRESS_PIXELS) {
        throw new Error('This compression job is too large for reliable browser processing. Try a shorter PDF or a lower page count.');
      }
    }
    const output = await PDFDocument.create();
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      throwIfAborted(signal);
      const page = await source.getPage(pageNumber);
      const originalViewport = page.getViewport({ scale: 1 });
      const scale = boundedCanvasScale(originalViewport.width, originalViewport.height, dpi / 72, 5000, 8_000_000);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Your browser could not prepare the PDF page for compression.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await renderPage(page, { canvasContext: context, viewport, background: '#ffffff' }, signal);
      const jpeg = await output.embedJpg(canvasJpegBytes(canvas, quality));
      const outputPage = output.addPage([originalViewport.width, originalViewport.height]);
      outputPage.drawImage(jpeg, { x: 0, y: 0, width: originalViewport.width, height: originalViewport.height });
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      onProgress(Math.round((pageNumber / source.numPages) * 90));
    }
    const saved = await output.save();
    if (saved.byteLength > MAX_OPERATION_OUTPUT_BYTES) {
      throw new Error('The compressed PDF would exceed the 100 MB browser output limit. Try a lower quality preset or a shorter PDF.');
    }
    throwIfAborted(signal);
    onProgress(100);
    return saved;
  } finally {
    await source.destroy();
  }
}

export async function exportPagesAsZip(file: File, selectedPages: number[], format: 'jpg' | 'png', onProgress: (value: number) => void, signal?: AbortSignal): Promise<Blob> {
  if (!selectedPages.length) throw new Error('Select at least one page to export.');
  const bytes = await readPdfBytes(file);
  const pdfDocument = await pdfjsLib.getDocument({ data: bytes }).promise;
  try {
    const uniquePages = [...new Set(selectedPages)].sort((a, b) => a - b);
    if (uniquePages.length > MAX_EXPORT_IMAGE_PAGES) {
      throw new Error(`Export up to ${MAX_EXPORT_IMAGE_PAGES} pages at a time to keep browser memory use predictable.`);
    }
    if (uniquePages.some((number) => number < 1 || number > pdfDocument.numPages)) throw new Error('A selected page is outside the document.');
    let estimatedPixels = 0;
    for (const pageNumber of uniquePages) {
      throwIfAborted(signal);
      const page = await pdfDocument.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = boundedCanvasScale(base.width, base.height, 1.5, 6000, 12_000_000);
      estimatedPixels += Math.ceil(base.width * scale) * Math.ceil(base.height * scale);
      page.cleanup();
      if (estimatedPixels > MAX_EXPORT_IMAGE_PIXELS) {
        throw new Error('These pages would create too many image pixels for reliable browser processing. Select fewer pages.');
      }
    }
    const zip = new JSZip();
    for (let index = 0; index < uniquePages.length; index += 1) {
      throwIfAborted(signal);
      const pageNumber = uniquePages[index];
      const page = await pdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = boundedCanvasScale(baseViewport.width, baseViewport.height, 1.5, 6000, 12_000_000);
      const viewport = page.getViewport({ scale });
      const canvas = globalThis.document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { alpha: format === 'png' });
      if (!context) throw new Error('Your browser could not create a page image.');
      if (format === 'jpg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      await renderPage(page, { canvasContext: context, viewport, background: format === 'jpg' ? '#ffffff' : undefined }, signal);
      const pageImage = await canvasToBlob(canvas, format);
      zip.file(`page-${String(pageNumber).padStart(3, '0')}.${format}`, pageImage, { compression: 'STORE' });
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      onProgress(Math.round(((index + 1) / uniquePages.length) * 90));
    }
    const result = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      throwIfAborted(signal);
      onProgress(90 + Math.round(metadata.percent / 10));
    });
    throwIfAborted(signal);
    if (result.size > MAX_OPERATION_OUTPUT_BYTES) throw new Error('The image ZIP would exceed the 100 MB browser output limit. Select fewer pages or use JPG.');
    return result;
  } finally {
    await pdfDocument.destroy();
  }
}

function boundedCanvasScale(width: number, height: number, requestedScale: number, maxEdge: number, maxPixels: number): number {
  const edgeScale = maxEdge / Math.max(width, height);
  const pixelScale = Math.sqrt(maxPixels / (width * height));
  return Math.min(requestedScale, edgeScale, pixelScale);
}

export function downloadBytes(bytes: Uint8Array, filename: string, type = 'application/pdf'): void {
  const blob = new Blob([bytes as BlobPart], { type });
  downloadBlob(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export type WatermarkPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tiled';

export type WatermarkOptions = {
  type: 'text' | 'image';
  text?: string;
  imageFile?: File;
  fontSize?: number;
  colorHex?: string;
  opacity?: number;
  rotation?: number;
  position?: WatermarkPosition;
  pageRange?: string;
};

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left';

export type PageNumberOptions = {
  position: PageNumberPosition;
  format: string;
  startPageNumber: number;
  skipFirstPage: boolean;
  fontSize: number;
  colorHex: string;
  margin: number;
};

export type SignaturePlacement = {
  pageNumber: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  if (isNaN(bigint)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}

export async function applyWatermark(file: File, options: WatermarkOptions): Promise<Uint8Array> {
  const doc = await loadPdfLibDocument(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageCount = doc.getPageCount();

  let targetPages: number[];
  if (options.pageRange && options.pageRange.trim()) {
    targetPages = parsePageRanges(options.pageRange, pageCount);
  } else {
    targetPages = Array.from({ length: pageCount }, (_, i) => i);
  }

  const opacity = Math.max(0.05, Math.min(1, options.opacity ?? 0.3));
  const rotationDegrees = degrees(options.rotation ?? 45);
  const color = hexToRgb(options.colorHex ?? '#6b7280');
  const textColor = rgb(color.r, color.g, color.b);

  let embeddedImage;
  if (options.type === 'image' && options.imageFile) {
    const imgBytes = await options.imageFile.arrayBuffer();
    const isPng = options.imageFile.type.includes('png') || options.imageFile.name.toLowerCase().endsWith('.png');
    embeddedImage = isPng ? await doc.embedPng(imgBytes) : await doc.embedJpg(imgBytes);
  }

  for (const pageIndex of targetPages) {
    const page = doc.getPage(pageIndex);
    const { width, height } = page.getSize();

    if (options.type === 'text') {
      const text = options.text?.trim() || 'CONFIDENTIAL';
      const fontSize = options.fontSize || 48;
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      if (options.position === 'tiled') {
        const stepX = Math.max(160, textWidth * 1.3);
        const stepY = Math.max(120, textHeight * 4);
        for (let x = -width * 0.2; x < width * 1.2; x += stepX) {
          for (let y = -height * 0.2; y < height * 1.2; y += stepY) {
            page.drawText(text, {
              x,
              y,
              size: fontSize * 0.75,
              font,
              color: textColor,
              opacity: opacity * 0.7,
              rotate: rotationDegrees,
            });
          }
        }
      } else {
        let x = (width - textWidth) / 2;
        let y = (height - textHeight) / 2;
        const margin = 40;

        if (options.position === 'top-left') {
          x = margin;
          y = height - margin - textHeight;
        } else if (options.position === 'top-right') {
          x = width - margin - textWidth;
          y = height - margin - textHeight;
        } else if (options.position === 'bottom-left') {
          x = margin;
          y = margin;
        } else if (options.position === 'bottom-right') {
          x = width - margin - textWidth;
          y = margin;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: textColor,
          opacity,
          rotate: options.position === 'center' ? rotationDegrees : degrees(0),
        });
      }
    } else if (embeddedImage) {
      const imgAspect = embeddedImage.width / embeddedImage.height;
      const targetWidth = Math.min(width * 0.5, 300);
      const targetHeight = targetWidth / imgAspect;

      let x = (width - targetWidth) / 2;
      let y = (height - targetHeight) / 2;
      const margin = 40;

      if (options.position === 'top-left') {
        x = margin;
        y = height - margin - targetHeight;
      } else if (options.position === 'top-right') {
        x = width - margin - targetWidth;
        y = height - margin - targetHeight;
      } else if (options.position === 'bottom-left') {
        x = margin;
        y = margin;
      } else if (options.position === 'bottom-right') {
        x = width - margin - targetWidth;
        y = margin;
      }

      page.drawImage(embeddedImage, {
        x,
        y,
        width: targetWidth,
        height: targetHeight,
        opacity,
        rotate: options.position === 'center' && options.rotation ? rotationDegrees : degrees(0),
      });
    }
  }

  return doc.save();
}

export async function applyPageNumbers(file: File, options: PageNumberOptions): Promise<Uint8Array> {
  const doc = await loadPdfLibDocument(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pageCount = doc.getPageCount();

  const color = hexToRgb(options.colorHex || '#374151');
  const textColor = rgb(color.r, color.g, color.b);
  const fontSize = options.fontSize || 10;
  const margin = options.margin || 25;

  const startIndex = options.skipFirstPage ? 1 : 0;

  for (let i = startIndex; i < pageCount; i += 1) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const pageNumber = i + 1;
    const displayNum = options.skipFirstPage ? i : pageNumber;
    const totalDisplay = options.skipFirstPage ? pageCount - 1 : pageCount;

    const label = options.format
      .replace('{n}', String(displayNum))
      .replace('{total}', String(totalDisplay));

    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let x = (width - textWidth) / 2;
    let y = margin;

    switch (options.position) {
      case 'bottom-center':
        x = (width - textWidth) / 2;
        y = margin;
        break;
      case 'bottom-right':
        x = width - margin - textWidth;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'top-center':
        x = (width - textWidth) / 2;
        y = height - margin - textHeight;
        break;
      case 'top-right':
        x = width - margin - textWidth;
        y = height - margin - textHeight;
        break;
      case 'top-left':
        x = margin;
        y = height - margin - textHeight;
        break;
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: textColor,
    });
  }

  return doc.save();
}

export async function applySignature(
  file: File,
  signaturePngBytes: Uint8Array,
  placement: SignaturePlacement
): Promise<Uint8Array> {
  const doc = await loadPdfLibDocument(file);
  const pageIndex = placement.pageNumber - 1;
  if (pageIndex < 0 || pageIndex >= doc.getPageCount()) {
    throw new Error('Selected page is outside document range.');
  }

  const page = doc.getPage(pageIndex);
  const { width, height } = page.getSize();

  const embeddedSig = await doc.embedPng(signaturePngBytes);

  const drawWidth = placement.widthRatio * width;
  const drawHeight = placement.heightRatio * height;
  const drawX = placement.xRatio * width;
  // Convert from web top-left coords to PDF bottom-left coords
  const drawY = height - (placement.yRatio * height) - drawHeight;

  page.drawImage(embeddedSig, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  });

  return doc.save();
}
