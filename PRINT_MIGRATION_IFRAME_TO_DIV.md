# Migración de Impresión: De iframe a div

## Resumen

Este documento describe el proceso de migración de la funcionalidad de impresión de tickets de cocina desde un enfoque basado en `iframe` a uno basado en un `div` oculto con estilos CSS `@media print`. Esta migración fue necesaria debido a problemas de compatibilidad con tablets y dispositivos Android.

## Problema Original

### Implementación con iframe

La implementación original usaba un `iframe` oculto para renderizar el contenido del ticket y luego imprimirlo:

```typescript
const iframe = document.createElement("iframe");
iframe.style.position = "fixed";
iframe.style.right = "0";
iframe.style.bottom = "0";
iframe.style.width = "0";
iframe.style.height = "0";
iframe.style.border = "0";
iframe.style.visibility = "hidden";
iframe.src = objectUrl; // Blob URL con HTML completo

iframe.onload = () => {
    iframe.contentWindow?.print();
};
```

### Problemas Encontrados

1. **Incompatibilidad en Android/Tablets**: El `iframe` no funcionaba correctamente en dispositivos Android, mostrando páginas en blanco al intentar imprimir.

2. **Problemas con Blob URLs**: Algunos navegadores móviles tienen limitaciones con `URL.createObjectURL()` y `Blob` objects.

3. **Falta de control**: Difícil controlar exactamente qué se imprime cuando el contenido está en un iframe separado.

## Solución Implementada

### Enfoque: Contenedor oculto con CSS @media print

La nueva implementación utiliza un `div` oculto en el documento principal y aprovecha los estilos CSS `@media print` para controlar qué se imprime.

### Arquitectura de la Solución

```
┌─────────────────────────────────────┐
│  Documento Principal (body)         │
│  ┌───────────────────────────────┐  │
│  │  Contenido de la App          │  │
│  │  (visible en pantalla)        │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  #print-ticket (oculto)       │  │
│  │  └─ Contenido del ticket     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

Durante @media print:
┌─────────────────────────────────────┐
│  body > *:not(#print-ticket)        │
│  → visibility: hidden              │
│                                     │
│  #print-ticket                      │
│  → visibility: visible             │
│  → Solo esto se imprime             │
└─────────────────────────────────────┘
```

### Componentes Clave

#### 1. Contenedor de Impresión

```typescript
// Crear o obtener el contenedor
let printContainer = document.getElementById("print-ticket");
if (!printContainer) {
    printContainer = document.createElement("div");
    printContainer.id = "print-ticket";
    printContainer.style.display = "none";
    document.body.appendChild(printContainer);
}
```

**Características:**
- ID único: `print-ticket`
- Oculto por defecto: `display: none`
- Agregado directamente al `body` del documento principal

#### 2. Inyección de Estilos

```typescript
function injectPrintTicketStyles(ticketStyles: string): void {
    const styleId = "print-ticket-styles";
    
    // Remover estilos anteriores si existen
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // Ajustar estilos para que estén scoped a #print-ticket
    const adjustedStyles = adjustStylesForContainer(ticketStyles);
    
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
        /* Estilos del contenedor */
        #print-ticket {
            display: none !important;
        }
        
        /* Estilos del contenido (scoped a #print-ticket) */
        ${adjustedStyles}
        
        /* Estilos de impresión */
        @media print {
            /* Ocultar todo excepto #print-ticket */
            body > *:not(#print-ticket) {
                visibility: hidden !important;
                display: none !important;
            }
            
            /* Mostrar solo el ticket */
            #print-ticket,
            #print-ticket * {
                visibility: visible !important;
            }
            
            /* Posicionar y mostrar el ticket */
            #print-ticket {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 80mm !important;
                display: block !important;
            }
        }
    `;
    
    document.head.appendChild(style);
}
```

#### 3. Ajuste de Estilos (Scoping)

**Problema crítico**: Los estilos del ticket deben estar completamente scoped a `#print-ticket` para no afectar la página principal.

```typescript
function adjustStylesForContainer(ticketStyles: string): string {
    let adjusted = ticketStyles;
    
    // 1. Scopear selector universal *
    adjusted = adjusted.replace(/^\s*\*\s*\{/gm, '#print-ticket * {');
    
    // 2. Reemplazar html, body por #print-ticket
    adjusted = adjusted
        .replace(/html,\s*body/g, "#print-ticket")
        .replace(/^html\s*\{/gm, "#print-ticket {")
        .replace(/^body\s*\{/gm, "#print-ticket {");
    
    // 3. Scopear todas las clases al contenedor
    adjusted = adjusted.replace(
        /(^|\n)(\.ticket|\.header|\.product-item|\.info-section)/gm,
        '$1#print-ticket $2'
    );
    
    // 4. Scopear selectores anidados
    adjusted = adjusted.replace(
        /(\.header|\.product-header)\s+(h1|span)/g,
        '#print-ticket $1 $2'
    );
    
    return adjusted;
}
```

**Por qué es crítico:**
- Si los estilos no están scoped, pueden afectar elementos de la página principal
- El selector universal `*` es especialmente peligroso
- Después de imprimir, los estilos pueden quedar aplicados si no están correctamente scoped

#### 4. Función de Impresión

```typescript
export async function printKitchenTicketInIframe(
    sale: LiveSale,
    products: Map<string, ProductWithDescription>,
    companyName?: string,
): Promise<void> {
    // 1. Generar HTML completo con estilos
    const fullHTML = generateFullPrintHTML(sale, products, companyName);
    
    // 2. Extraer estilos y contenido
    const ticketStyles = extractStyles(fullHTML);
    const bodyContent = extractBodyContent(fullHTML);
    
    // 3. Inyectar estilos
    injectPrintTicketStyles(ticketStyles);
    
    // 4. Obtener o crear contenedor
    let printContainer = document.getElementById("print-ticket");
    if (!printContainer) {
        printContainer = document.createElement("div");
        printContainer.id = "print-ticket";
        printContainer.style.display = "none";
        document.body.appendChild(printContainer);
    }
    
    // 5. Insertar contenido
    printContainer.innerHTML = bodyContent;
    printContainer.style.display = "block";
    
    // 6. Esperar un frame para que el layout se aplique
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
    
    // 7. Iniciar impresión
    window.focus();
    window.print();
    
    // 8. Limpieza después de imprimir
    window.onafterprint = () => {
        cleanup();
        window.onafterprint = null;
    };
}
```

#### 5. Limpieza Post-Impresión

```typescript
const cleanup = () => {
    // Delay para asegurar que el navegador termine de procesar
    setTimeout(() => {
        // 1. Limpiar contenido del contenedor
        if (printContainer) {
            printContainer.innerHTML = "";
            printContainer.style.display = "none";
        }
        
        // 2. Remover estilos inyectados
        const styleElement = document.getElementById("print-ticket-styles");
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }
        
        // 3. Forzar reflows para restaurar estilos de la página principal
        void document.body.offsetHeight;
        void document.documentElement.offsetHeight;
        
        // 4. Disparar evento resize para forzar recálculo
        requestAnimationFrame(() => {
            void document.body.offsetHeight;
            window.dispatchEvent(new Event('resize'));
        });
    }, 100);
};
```

**Por qué el delay y múltiples reflows:**
- En PC, el evento `onafterprint` puede dispararse muy rápido
- Los navegadores pueden cachear estilos
- Múltiples reflows aseguran que los estilos se restauren correctamente

## Problemas Específicos Resueltos

### 1. Páginas en Blanco en Android

**Problema**: Android mostraba páginas en blanco al intentar imprimir.

**Solución**: 
- Usar `visibility: hidden` en lugar de `display: none` para ocultar elementos
- Asegurar que el contenido esté físicamente presente en el DOM
- Usar `position: absolute` en lugar de `position: fixed` para mejor compatibilidad

### 2. Dos Páginas en Lugar de Una

**Problema**: El ticket se dividía en dos páginas en Android.

**Solución**:
```css
@media print {
    #print-ticket {
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
    }
    
    #print-ticket .ticket {
        page-break-inside: avoid !important;
    }
}
```

### 3. Pérdida de Estilos Después de Imprimir

**Problema**: Después de cerrar el diálogo de impresión, la página principal perdía estilos (padding, margins, etc.).

**Solución**:
- Scoping completo de todos los estilos a `#print-ticket`
- Remover estilos inyectados después de imprimir
- Múltiples reflows y evento resize para forzar recálculo

### 4. Selector Universal Afectando la Página Principal

**Problema**: El selector `* { margin: 0; padding: 0; }` afectaba toda la página.

**Solución**:
```typescript
// Antes: *
// Después: #print-ticket *
adjustedStyles = adjustedStyles.replace(/^\s*\*\s*\{/gm, '#print-ticket * {');
```

## Ventajas de la Nueva Implementación

1. ✅ **Compatibilidad Mobile**: Funciona correctamente en Android y tablets
2. ✅ **Sin Nueva Pestaña**: Todo ocurre en la misma página
3. ✅ **Control Total**: Controlas exactamente qué se imprime
4. ✅ **Mejor Rendimiento**: No necesita crear Blob URLs ni iframes
5. ✅ **Más Estable**: Menos problemas de timing y carga

## Desventajas y Consideraciones

1. ⚠️ **Estilos Globales**: Requiere cuidado extremo con el scoping de estilos
2. ⚠️ **Limpieza Compleja**: Necesita limpieza cuidadosa después de imprimir
3. ⚠️ **Compatibilidad CSS**: Algunos navegadores pueden tener problemas con `@media print`

## Mejores Prácticas

### 1. Scoping de Estilos

**SIEMPRE** scopea todos los estilos al contenedor:

```css
/* ❌ MAL */
.ticket { ... }
* { margin: 0; }

/* ✅ BIEN */
#print-ticket .ticket { ... }
#print-ticket * { margin: 0; }
```

### 2. Limpieza Post-Impresión

**SIEMPRE** limpia después de imprimir:

```typescript
window.onafterprint = () => {
    // 1. Limpiar contenido
    // 2. Remover estilos
    // 3. Forzar reflows
    // 4. Disparar eventos si es necesario
};
```

### 3. Esperar Renderizado

**SIEMPRE** espera al menos un frame antes de imprimir:

```typescript
await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
        resolve();
    });
});
window.print();
```

### 4. Prevención de Saltos de Página

Para contenido que debe estar en una sola página:

```css
@media print {
    .content {
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
    }
}
```

## Aplicación a PDF

Para aplicar este enfoque a la generación de PDF:

### Similitudes

1. **Contenedor Oculto**: Usar el mismo patrón de `#print-pdf` oculto
2. **Estilos Scoped**: Aplicar el mismo scoping de estilos
3. **Limpieza**: Misma estrategia de limpieza post-generación

### Diferencias Clave

1. **No usar `window.print()`**: En su lugar, usar una librería como:
   - `jsPDF` con `html2canvas`
   - `Puppeteer` (backend)
   - `html-pdf-node`
   - `pdfmake`

2. **Captura del Contenedor**: En lugar de imprimir, capturar el contenido:

```typescript
// Ejemplo con html2canvas + jsPDF
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const element = document.getElementById('print-pdf');
const canvas = await html2canvas(element);
const imgData = canvas.toDataURL('image/png');

const pdf = new jsPDF();
pdf.addImage(imgData, 'PNG', 0, 0);
pdf.save('documento.pdf');

// Limpieza
cleanup();
```

3. **Tamaño de Página**: Configurar el tamaño del PDF:

```typescript
const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297] // 80mm ancho (térmica), altura automática
});
```

## Checklist para Migración a PDF

- [ ] Crear contenedor `#print-pdf` oculto
- [ ] Inyectar estilos scoped a `#print-pdf`
- [ ] Generar contenido HTML del PDF
- [ ] Insertar contenido en el contenedor
- [ ] Capturar con `html2canvas` o similar
- [ ] Generar PDF con `jsPDF` o similar
- [ ] Limpiar contenedor y estilos después
- [ ] Probar en diferentes navegadores
- [ ] Probar en mobile/tablet
- [ ] Verificar que no afecte la página principal

## Referencias

- [MDN: @media print](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/print)
- [MDN: window.print()](https://developer.mozilla.org/en-US/docs/Web/API/Window/print)
- [MDN: window.onafterprint](https://developer.mozilla.org/en-US/docs/Web/API/Window/onafterprint)
- [CSS Page-break properties](https://developer.mozilla.org/en-US/docs/Web/CSS/page-break-inside)

## Conclusión

La migración de iframe a div con `@media print` proporciona una solución más robusta y compatible para la impresión en web, especialmente en dispositivos móviles. La clave del éxito está en:

1. **Scoping correcto** de todos los estilos
2. **Limpieza cuidadosa** después de la operación
3. **Prevención de saltos de página** con CSS apropiado
4. **Manejo de timing** con `requestAnimationFrame`

Este mismo patrón puede aplicarse a la generación de PDFs con las adaptaciones necesarias para la librería de PDF elegida.
