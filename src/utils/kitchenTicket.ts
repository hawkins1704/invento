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
 * Genera el HTML del ticket de cocina para impresión en impresora térmica
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
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket de Cocina #${ticketNumber}</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 8mm;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 8mm;
      border: 1px solid rgb(195, 195, 195);
    }
    
    .ticket {
      width: 100%;
    }
    
    .header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    
    .header h1 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    
    .header .ticket-number {
      font-size: 16px;
      font-weight: bold;
      margin: 4px 0;
    }
    .header .ticket-notes {
      font-size: 12px;
      font-weight: bold;
      margin: 4px 0;
    }
    
    .info-section {
      margin: 8px 0;
      font-size: 11px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    
    .info-label {
      font-weight: bold;
    }
    
    .info-value {
      text-align: right;
      text-transform: uppercase;
      
    }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    
    .products-header {
      font-weight: bold;
      text-transform: uppercase;
      margin: 8px 0 4px 0;
      font-size: 11px;
    }
    
    .product-item {
      margin: 6px 0;
      padding-bottom: 6px;
    }
    
    .product-item:last-child {
      border-bottom: none;
    }
    
    .product-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    
    .product-quantity-name {
      font-weight: bold;
      font-size: 12px;
    }
    
 
    
    .product-description {
      font-size: 10px;
      color: #333;
      margin-top: 2px;
      padding-left: 0;
      font-style: italic;
    }

 
    

    
    @media print {
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
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
        <span class="info-label">Mesa:</span>
        <span class="info-value">${tableLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha:</span>
        <span class="info-value">${createdAt}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Atiende:</span>
        <span class="info-value">${staffName}</span>
      </div>
    </div>
    

    
   
    
    <div class="divider"></div>
    
  
    
  
  </div>
</body>
</html>
  `.trim();
}

/**
 * Crea un blob con el HTML del ticket y lo muestra en un iframe para impresión
 */
export function printKitchenTicketInIframe(
    sale: LiveSale,
    products: Map<string, ProductWithDescription>,
    companyName?: string,
): void {
    const html = generateKitchenTicketHTML(sale, products, companyName);
    const blob = new Blob([html], { type: "text/html" });
    const objectUrl = URL.createObjectURL(blob);

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

        // Fallback
        window.focus();
        window.print();
        window.setTimeout(cleanup, 15000);
    };

    document.body.appendChild(iframe);
}
