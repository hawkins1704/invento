import type { Doc, Id } from "../../convex/_generated/dataModel";
import { formatCurrency, formatDateTime } from "./format";

type LiveSale = {
    sale: Doc<"sales">;
    items: Doc<"saleItems">[];
    table?: Doc<"branchTables"> | null;
    staff?: Doc<"staff"> | null;
    notes?: string | null;
};

type ProductWithDescription = {
    _id: Id<"products">;
    name: string;
    description?: string;
};

/**
 * Genera el HTML del contenido del ticket de cocina para impresión en impresora térmica
 */
export function generateKitchenTicketHTML(
    sale: LiveSale,
    products: Map<string, ProductWithDescription>,
    companyName?: string,
): string {
    const ticketNumber = sale.sale.kitchenTicketNumber
        ? String(sale.sale.kitchenTicketNumber).padStart(2, "0")
        : "N/A";

    const tableLabel = sale.table?.label ?? "VENTA SIN MESA";
    const staffName = sale.staff?.name ?? "Sin asignar";
    const createdAt = formatDateTime(sale.sale.openedAt);

    const productsList = sale.items
        .map((item) => {
            const product = products.get(item.productId as string);
            const productName = item.productName || product?.name || "Producto";
            const description = product?.description || "";
            const quantity = item.quantity;
            const unitPrice = formatCurrency(item.unitPrice);
            const totalPrice = formatCurrency(item.totalPrice);

            return {
                name: productName,
                description,
                quantity,
                unitPrice,
                totalPrice,
            };
        })
        .filter((item) => item.quantity > 0);

    return `
    <div class="ticket">
      <div class="header">
        ${companyName ? `<h1>${companyName}</h1>` : ""}
        <div class="ticket-number">TICKET DE COCINA #${ticketNumber}</div>
        <div class="ticket-notes">NOTAS: ${sale.notes ?? ""}</div>
      </div>
       <div class="products-header">PRODUCTOS</div>
      
      ${productsList
          .map(
              (product) => `
        <div class="product-item">
          <div class="product-header">
            <span class="product-quantity-name">${product.quantity}x ${product.name}</span>
          </div>
          ${product.description ? `<div class="product-description">${product.description}</div>` : ""}
      
        </div>
      `,
          )
          .join("")}

      <div class="divider"></div>

      <div class="info-section">
        <div class="info-row">
          <div class="info-label">Mesa</div>
          <div class="info-value">${tableLabel}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Fecha</div>
          <div class="info-value">${createdAt}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Atiende</div>
          <div class="info-value">${staffName}</div>
        </div>
      </div>
      
      <div class="divider"></div>
    </div>
  `.trim();
}

/**
 * Genera un documento HTML completo para impresión en iframe.
 * Incluye estilos inline para máxima compatibilidad en Android.
 */
function buildPrintDocument(ticketBodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=80mm">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 8mm;
      background: #fff;
      font-family: 'Courier New', Courier, monospace;
      font-size: 16px;
      line-height: 1.5;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .header h1 { font-size: 18px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; }
    .ticket-number { font-size: 20px; font-weight: bold; margin: 6px 0; }
    .ticket-notes { font-size: 17px; font-weight: bold; margin: 6px 0; }
    .info-section { margin: 10px 0; font-size: 16px; }
    .info-row { margin: 8px 0; }
    .info-label { font-weight: bold; font-size: 15px; margin-bottom: 2px; text-transform: uppercase; }
    .info-value { font-size: 17px; text-transform: uppercase; }
    .divider { border-top: 1px dashed #000; margin: 10px 0; }
    .products-header { font-weight: bold; text-transform: uppercase; margin: 10px 0 6px 0; font-size: 17px; }
    .product-item { margin: 8px 0; padding-bottom: 8px; }
    .product-header { margin-bottom: 2px; }
    .product-quantity-name { font-weight: bold; font-size: 18px; }
    .product-description { font-size: 18px; color: #333; margin-top: 4px; font-style: italic; font-weight: bold; }
    @page { size: 80mm auto; margin: 0; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      .ticket { page-break-inside: avoid !important; }
    }
  </style>
</head>
<body>${ticketBodyHtml}</body>
</html>`;
}

/**
 * Imprime el ticket de cocina usando un iframe aislado.
 *
 * IMPORTANTE - Bug en Chrome Android:
 * El evento `afterprint` se dispara INMEDIATAMENTE al abrir el diálogo de impresión,
 * no al cerrarlo. Por eso NO usamos afterprint para limpiar; solo setTimeout.
 * Si se usara afterprint, el contenido se borraría antes de que el usuario imprima,
 * causando: preview en blanco al cambiar impresoras, e impresión en blanco.
 */
export async function printKitchenTicketInIframe(
    sale: LiveSale,
    products: Map<string, ProductWithDescription>,
    companyName?: string,
): Promise<void> {
    const ticketBodyHtml = generateKitchenTicketHTML(sale, products, companyName);
    const fullDocument = buildPrintDocument(ticketBodyHtml);

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
        // NO usar afterprint: en Chrome Android se dispara al abrir el diálogo,
        // borrando el contenido antes de que el usuario pueda imprimir.
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
