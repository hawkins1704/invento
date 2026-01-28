export async function fetchPdfBlobFromUrl(pdfUrl: string): Promise<Blob> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error("No se pudo descargar el PDF.");
  }
  return await response.blob();
}

export function printPdfBlobInHiddenIframe(pdfBlob: Blob): void {
  const objectUrl = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.src = objectUrl;

  const cleanup = () => {
    try {
      URL.revokeObjectURL(objectUrl);
    } finally {
      iframe.remove();
    }
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (win) {
      win.focus();
      try {
        win.addEventListener("afterprint", cleanup, { once: true });
      } catch {
        // ignore
      }
      win.print();
      window.setTimeout(cleanup, 15000);
      return;
    }

    // Fallback (imprime la página, no el PDF)
    window.focus();
    window.print();
    window.setTimeout(cleanup, 15000);
  };

  document.body.appendChild(iframe);
}

export async function printPdfFromUrl(pdfUrl: string): Promise<void> {
  const blob = await fetchPdfBlobFromUrl(pdfUrl);
  printPdfBlobInHiddenIframe(blob);
}

