import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist";

// Configurar worker para pdfjs (requerido por Vite)
if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

export async function fetchPdfBlobFromUrl(pdfUrl: string): Promise<Blob> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error("No se pudo descargar el PDF.");
  }
  return await response.blob();
}

/**
 * Convierte un PDF a UNA sola imagen (todas las páginas apiladas verticalmente).
 * Evita paginación y páginas en blanco.
 */
async function pdfBlobToSingleImage(pdfBlob: Blob): Promise<string> {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const scale = 2.0;

  const pageCanvases: HTMLCanvasElement[] = [];
  let totalWidth = 0;
  let totalHeight = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener contexto del canvas.");
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;
    pageCanvases.push(canvas);
    totalWidth = Math.max(totalWidth, viewport.width);
    totalHeight += viewport.height;
  }

  const combined = document.createElement("canvas");
  combined.width = totalWidth;
  combined.height = totalHeight;
  const ctx = combined.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener contexto del canvas.");

  let y = 0;
  for (const canvas of pageCanvases) {
    ctx.drawImage(canvas, 0, y, canvas.width, canvas.height);
    y += canvas.height;
  }

  return combined.toDataURL("image/png");
}

/**
 * Documento HTML con la boleta como imagen única. Sin saltos de página.
 */
function buildPdfPrintDocument(imageDataUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { background: #fff; }
    img { width: 80mm; max-width: 80mm; height: auto; display: block; margin: 0; }
    @page { size: 80mm auto; margin: 0; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      img { page-break-inside: avoid !important; }
    }
  </style>
</head>
<body><img src="${imageDataUrl}" alt="Boleta" /></body>
</html>`;
}

/**
 * Imprime el PDF usando iframe aislado (igual que kitchen ticket).
 * El iframe tiene su propio documento; al cambiar impresora el modal no reaparece.
 * Una sola imagen = una sola página.
 */
export async function printPdfBlobInHiddenIframe(pdfBlob: Blob): Promise<void> {
  const singleImageDataUrl = await pdfBlobToSingleImage(pdfBlob);
  const fullDocument = buildPdfPrintDocument(singleImageDataUrl);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.overflow = "hidden";
  iframe.style.visibility = "hidden";

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  const runPrint = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.focus();
    win.print();
    window.setTimeout(cleanup, 45000);
  };

  iframe.onload = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(runPrint);
    });
  };

  document.body.appendChild(iframe);
  iframe.srcdoc = fullDocument;
}

export async function printPdfFromUrl(pdfUrl: string): Promise<void> {
  const blob = await fetchPdfBlobFromUrl(pdfUrl);
  await printPdfBlobInHiddenIframe(blob);
}

