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
 * Convierte un PDF a imágenes (data URLs) usando pdf.js.
 * Mismo enfoque que el ticket de cocina: contenido HTML en iframe para que
 * la impresión capture el iframe y no el modal de la app.
 */
async function pdfBlobToImageDataUrls(pdfBlob: Blob): Promise<string[]> {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const scale = 2.0; // Resolución para impresión
  const dataUrls: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo obtener contexto del canvas.");
    }
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;
    dataUrls.push(canvas.toDataURL("image/png"));
  }

  return dataUrls;
}

/**
 * Construye documento HTML con las imágenes del PDF, igual que kitchen ticket.
 */
function buildPdfPrintDocument(imageDataUrls: string[]): string {
  const imagesHtml = imageDataUrls
    .map(
      (src) =>
        `<img src="${src}" alt="" style="width:100%;height:auto;display:block;page-break-after:always;" />`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #fff;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img { max-width: 100%; height: auto; }
    img:last-child { page-break-after: auto !important; }
    @page { size: 80mm auto; margin: 0; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    }
  </style>
</head>
<body>${imagesHtml}</body>
</html>`;
}

/**
 * Imprime un PDF convirtiéndolo a imágenes y mostrándolas en un iframe con srcdoc.
 * Así la impresión captura solo el contenido del iframe (la boleta), no el modal.
 * Mismo patrón que el ticket de cocina.
 */
export async function printPdfBlobInHiddenIframe(pdfBlob: Blob): Promise<void> {
  const imageDataUrls = await pdfBlobToImageDataUrls(pdfBlob);
  const fullDocument = buildPdfPrintDocument(imageDataUrls);

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

