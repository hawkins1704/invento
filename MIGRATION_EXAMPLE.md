# Ejemplo Práctico: Migrando NewSaleModal.tsx

Este documento muestra cómo migrar un componente completo paso a paso.

## Componente: NewSaleModal.tsx

### Paso 1: Identificar Colores a Migrar

Buscar en el archivo:
```bash
grep -n "bg-slate-\|text-white\|text-slate-\|border-slate-" src/components/NewSaleModal.tsx
```

### Paso 2: Migración Línea por Línea

#### Línea 130: Overlay/Backdrop
```tsx
// ANTES
className={`absolute inset-0 bg-slate-950/70 backdrop-blur ...`}

// DESPUÉS
className={`absolute inset-0 bg-black/40 backdrop-blur dark:bg-slate-950/70 ...`}
```

**Explicación:**
- Modo claro: `bg-black/40` (overlay oscuro sutil)
- Modo oscuro: `dark:bg-slate-950/70` (mantiene el estilo original)

#### Línea 133: Contenedor Principal del Modal
```tsx
// ANTES
className={`... border border-slate-800 bg-slate-900/95 ... text-white ...`}

// DESPUÉS
className={`... border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/95 ... text-slate-900 dark:text-white ...`}
```

**Explicación:**
- Borde: claro `border-slate-200`, oscuro `dark:border-slate-800`
- Fondo: claro `bg-white`, oscuro `dark:bg-slate-900/95`
- Texto: claro `text-slate-900`, oscuro `dark:text-white`

#### Línea 137: Título
```tsx
// ANTES
<h2 className="text-2xl font-semibold">Nueva venta</h2>

// DESPUÉS
<h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Nueva venta</h2>
```

#### Líneas 148-149: Botón Tab Activo/Inactivo
```tsx
// ANTES
activeTab === "catalogo"
    ? "border-[#fa7316] bg-[#fa7316]/10 text-white"
    : "border-transparent text-slate-400 hover:text-slate-300"

// DESPUÉS
activeTab === "catalogo"
    ? "border-[#fa7316] bg-[#fa7316]/10 text-slate-900 dark:text-white"
    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
```

**Explicación:**
- El color primario `[#fa7316]` se mantiene igual (funciona en ambos modos)
- Solo cambiamos los textos y bordes que dependen del tema

#### Línea 186: Card de Información
```tsx
// ANTES
<div className="flex-shrink-0 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
    <label className="... text-slate-200">

// DESPUÉS
<div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 p-4">
    <label className="... text-slate-700 dark:text-slate-200">
```

#### Línea 198: Input
```tsx
// ANTES
className="... border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white ..."

// DESPUÉS
className="... border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white ..."
```

#### Línea 314: Botón Secundario
```tsx
// ANTES
className="... border border-slate-700 px-5 py-3 text-slate-200 transition hover:border-[#fa7316] hover:text-white ..."

// DESPUÉS
className="... border border-slate-300 px-5 py-3 text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white ..."
```

### Paso 3: Código Completo Migrado

Aquí está el componente completo con todas las migraciones aplicadas:

```tsx
// Overlay
<div className={`absolute inset-0 bg-black/40 backdrop-blur dark:bg-slate-950/70 ...`} />

// Modal principal
<div className={`... border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/95 ... text-slate-900 dark:text-white ...`}>

    {/* Título */}
    <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Nueva venta</h2>

    {/* Tabs */}
    <button className={`
        ${activeTab === "catalogo"
            ? "border-[#fa7316] bg-[#fa7316]/10 text-slate-900 dark:text-white"
            : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }
    `}>

    {/* Cards */}
    <div className="... border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 ...">
        <label className="... text-slate-700 dark:text-slate-200">
    </div>

    {/* Inputs */}
    <input className="... border border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white ..." />

    {/* Botones */}
    <button className="... border border-slate-300 text-slate-700 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white ..." />
</div>
```

### Paso 4: Verificación

Después de migrar, verifica:

1. **En modo claro:**
   - Fondos son blancos/claros
   - Textos son oscuros (legibles)
   - Bordes son sutiles

2. **En modo oscuro:**
   - Fondos son oscuros
   - Textos son claros (legibles)
   - Mantiene el estilo original

3. **Transición:**
   - El cambio debe ser suave (ya configurado globalmente)

---

## 🎯 Regla de Oro

**Siempre sigue este patrón:**

```tsx
className="[modo-claro] dark:[modo-oscuro]"
```

Ejemplos:
- `bg-white dark:bg-slate-900`
- `text-slate-900 dark:text-white`
- `border-slate-200 dark:border-slate-800`

---

## 🔍 Búsqueda Rápida

Para encontrar componentes sin migrar:

```bash
# Buscar componentes con colores oscuros sin variante dark:
grep -r "bg-slate-9" src/ | grep -v "dark:bg"
grep -r "text-white" src/ | grep -v "dark:text"
grep -r "border-slate-8" src/ | grep -v "dark:border"
```

Esto te mostrará exactamente qué líneas necesitan migración.

