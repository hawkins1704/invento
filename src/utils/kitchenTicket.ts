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
  `.trim();
}

/**
 * Inyecta los estilos CSS para el ticket y la impresión (solo una vez)
 */
function injectPrintStyles(): void {
    const styleId = "kitchen-ticket-print-styles";
    
    // Evitar duplicar estilos
    if (document.getElementById(styleId)) {
        return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
        /* Ocultar el contenedor de impresión por defecto */
        #print {
            display: none;
        }
        
        /* Estilos del ticket */
        #print .ticket {
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 8mm;
            background: #fff;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
        }
        
        #print .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        
        #print .header h1 {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        
        #print .header .ticket-number {
            font-size: 16px;
            font-weight: bold;
            margin: 4px 0;
        }
        
        #print .header .ticket-notes {
            font-size: 12px;
            font-weight: bold;
            margin: 4px 0;
        }
        
        #print .info-section {
            margin: 8px 0;
            font-size: 11px;
        }
        
        #print .info-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
        }
        
        #print .info-label {
            font-weight: bold;
        }
        
        #print .info-value {
            text-align: right;
            text-transform: uppercase;
        }
        
        #print .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }
        
        #print .products-header {
            font-weight: bold;
            text-transform: uppercase;
            margin: 8px 0 4px 0;
            font-size: 11px;
        }
        
        #print .product-item {
            margin: 6px 0;
            padding-bottom: 6px;
        }
        
        #print .product-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
        
        #print .product-quantity-name {
            font-weight: bold;
            font-size: 12px;
        }
        
        #print .product-description {
            font-size: 10px;
            color: #333;
            margin-top: 2px;
            padding-left: 0;
            font-style: italic;
        }
        
        /* Estilos para impresión - ocultar todo excepto #print */
        @media print {
            @page {
                size: 80mm auto;
                margin: 0;
            }
            
            /* Ocultar todo el contenido del body excepto #print */
            body > *:not(#print) {
                display: none !important;
            }
            
            /* Mostrar solo el contenedor de impresión */
            #print {
                display: block !important;
                visibility: visible !important;
            }
            
            /* Resetear estilos del body y html para impresión */
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                width: 100% !important;
            }
            
            /* Asegurar que el ticket no se divida en páginas */
            #print .ticket {
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Imprime el ticket de cocina usando un div con id "print"
 * Patrón simple y estable: el div #print siempre está en el DOM, oculto por defecto
 * Al imprimir, CSS @media print muestra solo #print y oculta el resto
 */
export async function printKitchenTicketInIframe(
    sale: LiveSale,
    products: Map<string, ProductWithDescription>,
    companyName?: string,
): Promise<void> {
    // Inyectar estilos (solo una vez)
    injectPrintStyles();
    
    // Obtener o crear el contenedor de impresión
    let printContainer = document.getElementById("print");
    if (!printContainer) {
        printContainer = document.createElement("div");
        printContainer.id = "print";
        document.body.appendChild(printContainer);
    }
    
    // Generar y insertar el contenido del ticket
    const ticketContent = generateKitchenTicketHTML(sale, products, companyName);
    printContainer.innerHTML = ticketContent;
    
    // Importante: esperar un frame para que el layout se aplique
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
    
    // Iniciar impresión
    window.focus();
    window.print();
    
    // Limpieza después de imprimir
    window.onafterprint = () => {
        // Limpiar el contenido del contenedor
        if (printContainer) {
            printContainer.innerHTML = "";
        }
        
        // Remover el event listener
        window.onafterprint = null;
    };
    
    // Fallback: limpiar después de 15 segundos si no se detecta el evento afterprint
    setTimeout(() => {
        if (printContainer && printContainer.innerHTML) {
            printContainer.innerHTML = "";
            window.onafterprint = null;
        }
    }, 15000);
}
