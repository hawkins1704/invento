    # Guía de Dark Mode - Sistema de Temas

## 📚 Cómo Funciona el Sistema de Temas

### 1. **Arquitectura del Sistema**

El sistema de temas funciona en 3 capas:

```
┌─────────────────────────────────────┐
│  1. Hook useTheme (Estado React)     │
│     - Maneja el estado del tema     │
│     - Persiste en localStorage       │
└──────────────┬────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Clase 'dark' en <html>          │
│     - Se agrega/remueve dinámicamente│
│     - Detectada por Tailwind         │
└──────────────┬────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Variantes dark: en Tailwind     │
│     - dark:bg-slate-900             │
│     - dark:text-white               │
└─────────────────────────────────────┘
```

### 2. **Flujo de Datos**

```
Usuario hace clic en ThemeToggle
    │
    ▼
toggleTheme() cambia el estado
    │
    ▼
useEffect detecta el cambio
    │
    ▼
Se agrega/remueve clase 'dark' en <html>
    │
    ▼
localStorage guarda la preferencia
    │
    ▼
Tailwind aplica estilos dark: automáticamente
```

### 3. **Persistencia con localStorage**

**¿Dónde se guarda?**
- **Clave:** `"theme"`
- **Valores:** `"light"` o `"dark"`
- **Ubicación:** `localStorage` del navegador

**¿Cuándo se guarda?**
- Cada vez que cambias el tema (en `useTheme.ts` línea 31)
- Al inicializar la app (en `main.tsx` línea 19)

**¿Cómo se lee?**
1. Al cargar la página: `main.tsx` lee `localStorage` ANTES del render
2. En el hook: `useTheme.ts` lee `localStorage` al inicializar el estado

**Ejemplo de localStorage:**
```javascript
// Ver en consola del navegador:
localStorage.getItem("theme")  // "dark" o "light"
localStorage.setItem("theme", "light")  // Cambiar manualmente
```

### 4. **Configuración de Tailwind CSS v4**

En `src/index.css`:
```css
@custom-variant dark (&:where(.dark, .dark *));
```

Esto le dice a Tailwind:
- "Cuando veas la clase `.dark` en cualquier elemento padre"
- "Aplica las variantes `dark:` a todos sus hijos"

**Por qué es necesario:**
- Tailwind v4 requiere esta configuración explícita
- Sin esto, las clases `dark:` no funcionan

---

## 🔄 Cómo Migrar Componentes

### Patrón Básico de Migración

**ANTES (solo modo oscuro):**
```tsx
<div className="bg-slate-900 text-white">
  Contenido
</div>
```

**DESPUÉS (soporta ambos modos):**
```tsx
<div className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
  Contenido
</div>
```

### Guía de Conversión de Colores

| Modo Oscuro Actual | Modo Claro | Modo Oscuro | Ejemplo |
|-------------------|-----------|-------------|---------|
| `bg-slate-950` | `bg-white` | `dark:bg-slate-950` | `bg-white dark:bg-slate-950` |
| `bg-slate-900` | `bg-slate-50` | `dark:bg-slate-900` | `bg-slate-50 dark:bg-slate-900` |
| `bg-slate-800` | `bg-slate-100` | `dark:bg-slate-800` | `bg-slate-100 dark:bg-slate-800` |
| `text-white` | `text-slate-900` | `dark:text-white` | `text-slate-900 dark:text-white` |
| `text-slate-100` | `text-slate-900` | `dark:text-slate-100` | `text-slate-900 dark:text-slate-100` |
| `text-slate-300` | `text-slate-600` | `dark:text-slate-300` | `text-slate-600 dark:text-slate-300` |
| `text-slate-400` | `text-slate-500` | `dark:text-slate-400` | `text-slate-500 dark:text-slate-400` |
| `border-slate-800` | `border-slate-200` | `dark:border-slate-800` | `border-slate-200 dark:border-slate-800` |
| `border-slate-700` | `border-slate-300` | `dark:border-slate-700` | `border-slate-300 dark:border-slate-700` |

### Ejemplos Prácticos

#### Ejemplo 1: Contenedor Principal
```tsx
// ANTES
<div className="bg-slate-950 text-white">

// DESPUÉS
<div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
```

#### Ejemplo 2: Card/Box
```tsx
// ANTES
<div className="bg-slate-900 border border-slate-800 text-white">

// DESPUÉS
<div className="bg-slate-50 border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white">
```

#### Ejemplo 3: Input
```tsx
// ANTES
<input className="bg-slate-900 border-slate-800 text-white" />

// DESPUÉS
<input className="bg-white border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white" />
```

#### Ejemplo 4: Botón Secundario
```tsx
// ANTES
<button className="border-slate-700 text-slate-300 hover:bg-slate-800">

// DESPUÉS
<button className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
```

#### Ejemplo 5: Overlay/Backdrop
```tsx
// ANTES
<div className="bg-slate-950/70 backdrop-blur">

// DESPUÉS
<div className="bg-black/40 backdrop-blur dark:bg-slate-950/70">
```

### Checklist de Migración

Para cada componente:

- [ ] Identificar todos los colores oscuros (`bg-slate-9xx`, `text-white`, etc.)
- [ ] Agregar variante claro primero: `bg-white dark:bg-slate-900`
- [ ] Agregar variante oscura después: `text-slate-900 dark:text-white`
- [ ] Probar en ambos modos (clic en el botón de tema)
- [ ] Verificar que las transiciones sean suaves

### Componentes que Necesitan Migración

Basado en la búsqueda, estos componentes aún necesitan migración:

1. **NewSaleModal.tsx** - Modal de nueva venta
2. **CloseSaleDialog.tsx** - Diálogo de cerrar venta
3. **SaleEditorDrawer.tsx** - Drawer de edición de venta
4. **EditItemModal.tsx** - Modal de edición de items
5. **ProductGrid.tsx** - Grid de productos
6. **DataTable.tsx** - Tabla de datos
7. **OrderItemsList.tsx** - Lista de items de orden
8. Y otros componentes en `src/pages/`

---

## 🛠️ Herramientas Útiles

### Buscar Componentes sin Migrar

```bash
# Buscar todos los componentes con colores oscuros
grep -r "bg-slate-9" src/
grep -r "bg-slate-950" src/
grep -r "text-white" src/ | grep -v "dark:"
```

### Verificar localStorage

```javascript
// En la consola del navegador
console.log(localStorage.getItem("theme"));
console.log(document.documentElement.classList.contains("dark"));
```

### Debug del Tema

El hook `useTheme` ya tiene logs de debug. Verás en consola:
- `Theme changed to: dark` o `light`
- `HTML has dark class: true` o `false`

---

## 💡 Buenas Prácticas

1. **Siempre define ambos modos**: No dejes colores sin variante `dark:`
2. **Usa colores contrastantes**: En modo claro usa `slate-900`, en oscuro `white`
3. **Mantén consistencia**: Usa la misma paleta de colores en toda la app
4. **Prueba ambos modos**: Siempre verifica que se vea bien en claro y oscuro
5. **Transiciones suaves**: Ya están configuradas globalmente en `index.css`

---

## 🎨 Paleta de Colores Recomendada

### Fondos
- **Claro:** `bg-white`, `bg-slate-50`, `bg-slate-100`
- **Oscuro:** `dark:bg-slate-950`, `dark:bg-slate-900`, `dark:bg-slate-800`

### Textos
- **Claro:** `text-slate-900`, `text-slate-700`, `text-slate-600`
- **Oscuro:** `dark:text-white`, `dark:text-slate-100`, `dark:text-slate-300`

### Bordes
- **Claro:** `border-slate-200`, `border-slate-300`
- **Oscuro:** `dark:border-slate-800`, `dark:border-slate-700`

### Overlays
- **Claro:** `bg-black/40`
- **Oscuro:** `dark:bg-slate-950/70`

