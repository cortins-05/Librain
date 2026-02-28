import {
  createCanvas,
  DOMMatrix as CanvasDOMMatrix,
  ImageData as CanvasImageData,
  Path2D as CanvasPath2D,
} from "@napi-rs/canvas";

if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = CanvasDOMMatrix as unknown as typeof DOMMatrix;
}
if (!globalThis.ImageData) {
  globalThis.ImageData = CanvasImageData as unknown as typeof ImageData;
}
if (!globalThis.Path2D) {
  globalThis.Path2D = CanvasPath2D as unknown as typeof Path2D;
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
}

export async function pdfToImageDataUrls(pdfBuffer: Buffer, maxPages = 3, scale = 2) {
  const pdfjs = await getPdfjs();
  const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
  const total = Math.min(pdf.numPages, maxPages);

  const images: string[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    const canvasContext = ctx as unknown as NonNullable<
      Parameters<typeof page.render>[0]["canvasContext"]
    >;

    await page.render({
      canvas: null,
      canvasContext,
      viewport,
    }).promise;

    const png = canvas.toBuffer("image/png");
    images.push(`data:image/png;base64,${png.toString("base64")}`);
  }

  return images;
}
