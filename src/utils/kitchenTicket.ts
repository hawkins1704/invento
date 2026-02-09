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
 * Genera un HTML completo con estilos embebidos para impresión en una nueva ventana
 * Esta función es específica para Android que no respeta bien @media print
 */
function generateFullPrintHTML(
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

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket de Cocina #${ticketNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      width: 100%;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
    }
    
    .ticket {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 8mm;
      background: #fff;
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
  
  <script>
    // Auto-imprimir cuando la ventana esté lista
    window.onload = function() {
      setTimeout(function() {
        window.print();
        // Cerrar la ventana después de imprimir (opcional)
        window.onafterprint = function() {
          window.close();
        };
      }, 250);
    };
  </script>
</body>
</html>`;
}

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
 * Extrae los estilos del HTML completo
 */
function extractStyles(fullHTML: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHTML, "text/html");
    const styleElement = doc.querySelector("head style");
    return styleElement ? styleElement.textContent || "" : "";
}

/**
 * Inyecta los estilos CSS para impresión del ticket (solo una vez)
 * Incluye los estilos del ticket y los estilos de impresión
 */
function injectPrintTicketStyles(ticketStyles: string): void {
    const styleId = "print-ticket-styles";
    
    // Remover estilos anteriores si existen
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
        existingStyle.remove();
    }

    // Ajustar los estilos del ticket para que funcionen dentro de #print-ticket
    // CRÍTICO: Todos los estilos deben estar scoped a #print-ticket para no afectar la página principal
    
    // Primero, reemplazar el selector universal * que afecta a todos los elementos
    let adjustedStyles = ticketStyles.replace(/^\s*\*\s*\{/gm, '#print-ticket * {');
    
    // Reemplazar selectores html, body por #print-ticket
    adjustedStyles = adjustedStyles
        .replace(/html,\s*body/g, "#print-ticket")
        .replace(/^html\s*\{/gm, "#print-ticket {")
        .replace(/^body\s*\{/gm, "#print-ticket {");
    
    // Asegurar que todos los estilos de clases estén scoped a #print-ticket
    // Agregar #print-ticket como prefijo a selectores que no lo tengan
    adjustedStyles = adjustedStyles.replace(/(^|\n)(\.ticket|\.header|\.product-item|\.info-section|\.divider|\.products-header|\.info-row|\.info-label|\.info-value|\.product-header|\.product-quantity-name|\.product-description)/gm, '$1#print-ticket $2');
    
    // Asegurar que selectores anidados también estén scoped
    adjustedStyles = adjustedStyles.replace(/(\.header|\.product-header)\s+(h1|span)/g, '#print-ticket $1 $2');
    
    // Asegurar que el ticket tenga el tamaño correcto dentro de #print-ticket
    adjustedStyles = adjustedStyles.replace(/#print-ticket\s*\.ticket\s*\{/g, '#print-ticket .ticket {\n      width: 80mm !important;\n      max-width: 80mm !important;');
    
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
        /* CRÍTICO: Todos los estilos están scoped a #print-ticket para NO afectar la página principal */
        
        /* Estilos del ticket cuando está visible (solo afecta a #print-ticket) */
        #print-ticket {
            display: none !important;
        }
        
        /* Estilos del contenido del ticket (ajustados y scoped SOLO a #print-ticket) */
        /* Estos estilos solo se aplican dentro de #print-ticket, nunca afectan elementos fuera */
        ${adjustedStyles}
        
        /* Estilos para impresión - SOLO dentro de @media print */
        @media print {
            @page {
                size: 80mm auto;
                margin: 0;
            }
            
            /* Ocultar todo el contenido del body EXCEPTO #print-ticket */
            body > *:not(#print-ticket) {
                visibility: hidden !important;
                display: none !important;
            }
            
            /* Mostrar solo el contenedor del ticket y su contenido */
            #print-ticket,
            #print-ticket * {
                visibility: visible !important;
            }
            
            /* Posicionar y mostrar el ticket - evitar saltos de página */
            #print-ticket {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                display: block !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                height: auto !important;
                min-height: auto !important;
                max-height: none !important;
            }
            
            /* Asegurar que el contenido del ticket no se divida en páginas */
            #print-ticket .ticket {
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                width: 100% !important;
                max-width: 100% !important;
            }
            
            /* Evitar saltos de página en elementos internos */
            #print-ticket .header,
            #print-ticket .product-item,
            #print-ticket .info-section {
                page-break-inside: avoid !important;
            }
            
            /* Resetear estilos del body y html SOLO durante impresión */
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                width: 100% !important;
                height: auto !important;
            }
        }
        
        /* IMPORTANTE: Estilos fuera de @media print NO deben afectar la página principal */
        /* Los estilos del ticket solo se aplican dentro de #print-ticket */
    `;
    
    document.head.appendChild(style);
}

/**
 * Extrae el contenido del body del HTML completo (sin scripts)
 */
function extractBodyContent(fullHTML: string): string {
    // Crear un documento temporal para parsear el HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHTML, "text/html");
    
    // Extraer el contenido del body (sin scripts)
    const bodyElement = doc.querySelector("body");
    if (!bodyElement) {
        return "";
    }
    
    // Remover scripts del contenido
    const scripts = bodyElement.querySelectorAll("script");
    scripts.forEach((script) => script.remove());
    
    return bodyElement.innerHTML;
}

/**
 * Imprime el ticket de cocina usando un contenedor oculto #print-ticket
 * Esta es la forma más estable según la investigación, especialmente en mobile
 * 
 * Ventajas:
 * - Mucho más estable en mobile que iframe.print()
 * - No abre nueva pestaña
 * - Controlas 100% qué se imprime
 */
export async function printKitchenTicketInIframe(
    sale: LiveSale,
    products: Map<string, ProductWithDescription>,
    companyName?: string,
): Promise<void> {
    // Generar HTML completo con estilos embebidos
    const fullHTML = generateFullPrintHTML(sale, products, companyName);
    
    // Extraer los estilos y el contenido del body
    const ticketStyles = extractStyles(fullHTML);
    const bodyContent = extractBodyContent(fullHTML);
    
    // Inyectar estilos de impresión (incluye estilos del ticket)
    injectPrintTicketStyles(ticketStyles);
    
    // Obtener o crear el contenedor de impresión
    let printContainer = document.getElementById("print-ticket");
    if (!printContainer) {
        printContainer = document.createElement("div");
        printContainer.id = "print-ticket";
        printContainer.style.display = "none";
        document.body.appendChild(printContainer);
    }
    
    // Insertar el contenido del ticket
    printContainer.innerHTML = bodyContent;
    
    // Mostrar el contenedor temporalmente (aunque esté oculto con display:none, 
    // los estilos de impresión lo harán visible al imprimir)
    printContainer.style.display = "block";
    
    // Importante: esperar un frame para que el layout se aplique
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
    
    // Iniciar impresión
    window.focus();
    window.print();
    
    // Función de limpieza completa
    const cleanup = () => {
        // Pequeño delay para asegurar que el navegador termine de procesar la impresión
        // Esto es especialmente importante en PC donde el evento puede dispararse muy rápido
        setTimeout(() => {
            // Limpiar el contenido del contenedor
            if (printContainer) {
                printContainer.innerHTML = "";
                printContainer.style.display = "none";
            }
            
            // Remover los estilos inyectados para que no afecten la página principal
            const styleElement = document.getElementById("print-ticket-styles");
            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }
            
            // Forzar múltiples reflows para que los estilos de la página principal se restauren
            // Esto es crítico en PC donde los estilos pueden quedar cacheados
            void document.body.offsetHeight;
            void document.documentElement.offsetHeight;
            
            // Forzar un segundo reflow después de un micro-delay
            requestAnimationFrame(() => {
                void document.body.offsetHeight;
                void document.documentElement.offsetHeight;
                
                // Disparar un evento resize para forzar al navegador a recalcular todos los estilos
                // Esto ayuda especialmente en PC donde los estilos pueden quedar cacheados
                window.dispatchEvent(new Event('resize'));
            });
        }, 100);
    };
    
    // Limpieza después de imprimir (mejor en onafterprint)
    window.onafterprint = () => {
        cleanup();
        // Remover el event listener
        window.onafterprint = null;
    };
    
    // Fallback: limpiar después de 15 segundos si no se detecta el evento afterprint
    setTimeout(() => {
        if (printContainer && printContainer.innerHTML) {
            cleanup();
            window.onafterprint = null;
        }
    }, 15000);
}
