# Archivos que aún dependen de SunatAPI

Este documento lista todos los archivos que aún tienen dependencias con la API obsoleta de SunatAPI y necesitan ser migrados a MiAPI.

**Fecha de verificación**: 2024-12-19

---

## 📋 Resumen Ejecutivo

**Total de archivos pendientes**: 7 archivos
- ✅ **Migrados parcialmente**: 1 archivo (`SalesTables.tsx` - usa MiAPI para generar/enviar XML, pero aún usa SunatAPI para PDFs)
- ⚠️ **Pendientes de migración**: 6 archivos

---

## 📁 Archivos Pendientes de Migración

### 1. **`src/services/apisunat.ts`** ⚠️ CRÍTICO
**Estado**: ⚠️ Completamente obsoleto
**Dependencias**: Usado por múltiples componentes

**Referencias encontradas**:
- Línea 15: `const APISUNAT_BASE_URL = import.meta.env.VITE_APISUNAT_BASE_URL`
- Línea 20: `class APISUNATClient`
- Línea 270: `export const apisunatClient = new APISUNATClient()`

**Métodos que aún se usan**:
- ✅ `getLastDocument()` - **OBSOLETO** (ya no se usa, correlativos vienen de branches)
- ✅ `emitDocument()` - **OBSOLETO** (reemplazado por MiAPI)
- ⚠️ `listDocuments()` - **AÚN SE USA** en `AdminDocuments.tsx`
- ⚠️ `getDocument()` - **AÚN SE USA** en `AdminSales.tsx` y `AdminDocuments.tsx`
- ⚠️ `downloadPDF()` - **AÚN SE USA** en `AdminSales.tsx` y `AdminDocuments.tsx`
- ⚠️ `printPDF()` - **AÚN SE USA** en `SalesTables.tsx`

**Acción requerida**: 
- Migrar `listDocuments()`, `getDocument()`, `downloadPDF()`, `printPDF()` a MiAPI
- Eliminar métodos obsoletos `getLastDocument()` y `emitDocument()`
- Eliminar archivo una vez completada la migración

---

### 2. **`src/hooks/useAPISUNAT.ts`** ⚠️ CRÍTICO
**Estado**: ⚠️ Parcialmente obsoleto
**Dependencias**: Usado por 3 componentes

**Referencias encontradas**:
- Línea 2: `import { apisunatClient } from "../services/apisunat"`
- Línea 28: `export function useAPISUNAT()`

**Funciones expuestas**:
- ✅ `getLastDocument()` - **OBSOLETO** (no se usa)
- ✅ `emitDocument()` - **OBSOLETO** (reemplazado por MiAPI)
- ⚠️ `listDocuments()` - **AÚN SE USA** en `AdminDocuments.tsx`
- ⚠️ `getDocument()` - **AÚN SE USA** en `AdminSales.tsx` y `AdminDocuments.tsx`
- ⚠️ `downloadPDF()` - **AÚN SE USA** en `AdminSales.tsx` y `AdminDocuments.tsx`
- ⚠️ `printPDF()` - **AÚN SE USA** en `SalesTables.tsx`

**Acción requerida**:
- Migrar funciones restantes a MiAPI o crear nuevo hook `useMiAPI()`
- Eliminar funciones obsoletas
- Eliminar archivo una vez completada la migración

---

### 3. **`src/types/apisunat.ts`** ⚠️ CRÍTICO
**Estado**: ⚠️ Parcialmente obsoleto
**Dependencias**: Usado por múltiples archivos

**Tipos definidos**:
- `EmitDocumentRequest` - **OBSOLETO** (usa `personaId` y `personaToken`)
- `EmitDocumentResponse` - **OBSOLETO**
- `LastDocumentRequest` - **OBSOLETO** (usa `personaId` y `personaToken`)
- `LastDocumentResponse` - **OBSOLETO**
- ⚠️ `APISUNATDocument` - **AÚN SE USA** en `AdminSales.tsx` y `AdminDocuments.tsx`
- ⚠️ `ListDocumentsParams` - **AÚN SE USA** en `AdminDocuments.tsx`
- ⚠️ `PDFFormat` - **AÚN SE USA** en múltiples archivos
- ⚠️ `APISUNATError` - **AÚN SE USA** en `apisunat.ts`
- `DocumentBody`, `InvoiceLine`, etc. (UBL) - **REVISAR** (puede seguir siendo útil si MiAPI usa UBL)

**Acción requerida**:
- Crear tipos equivalentes para MiAPI si es necesario
- Mantener tipos UBL si MiAPI los usa
- Eliminar tipos obsoletos una vez completada la migración

---

### 4. **`src/pages/sales/SalesTables.tsx`** ⚠️ PARCIALMENTE MIGRADO
**Estado**: ✅ Migrado para generar/enviar XML | ⚠️ Pendiente para PDFs

**Referencias encontradas**:
- Línea 14: `import { useAPISUNAT } from "../../hooks/useAPISUNAT"`
- Línea 104: `const { getLastDocument, emitDocument, printPDF } = useAPISUNAT()`
- Línea 1112: `import.meta.env.VITE_APISUNAT_BASE_URL`

**Funcionalidad migrada**:
- ✅ Generación de XML (usa `miapiClient.generarXMLComprobante()`)
- ✅ Envío a SUNAT (usa `miapiClient.enviarXMLASUNAT()`)
- ✅ Validaciones (usa `secretKey` y `currency` en lugar de `personaId`/`personaToken`)
- ✅ Correlativos (obtenidos desde `branches`)

**Funcionalidad pendiente**:
- ⚠️ `printPDF()` - **AÚN USA** `useAPISUNAT()` (línea 104)
- ⚠️ URL base para WhatsApp - **AÚN USA** `VITE_APISUNAT_BASE_URL` (línea 1112)

**Acción requerida**:
- Reemplazar `printPDF()` con equivalente de MiAPI
- Actualizar URL base para WhatsApp con URL de MiAPI
- Eliminar import de `useAPISUNAT` una vez completado

---

### 5. **`src/pages/admin/AdminSales.tsx`** ⚠️ CRÍTICO
**Estado**: ⚠️ Completamente pendiente

**Referencias encontradas**:
- Línea 21: `import { useAPISUNAT } from "../../hooks/useAPISUNAT"`
- Línea 648: `const { getDocument, downloadPDF } = useAPISUNAT()`
- Línea 659: `if (!entry.sale.documentId || !currentUser?.personaToken)`
- Línea 673: `currentUser.personaToken`
- Línea 706: `!currentUser?.personaToken`

**Funcionalidad que usa SunatAPI**:
- ⚠️ `getDocument()` - Obtener información del documento (línea 671-673)
- ⚠️ `downloadPDF()` - Descargar PDF del documento (línea 714+)
- ⚠️ Validación de `personaToken` (líneas 659, 706)

**Acción requerida**:
- Migrar `getDocument()` a MiAPI
- Migrar `downloadPDF()` a MiAPI
- Eliminar validaciones de `personaToken` (ya no existe en schema)
- Actualizar para usar nuevas credenciales de MiAPI si es necesario

---

### 6. **`src/pages/admin/AdminDocuments.tsx`** ⚠️ CRÍTICO
**Estado**: ⚠️ Completamente pendiente

**Referencias encontradas**:
- Línea 5: `import { useAPISUNAT } from "../../hooks/useAPISUNAT"`
- Línea 6: `import type { APISUNATDocument, PDFFormat } from "../../types/apisunat"`
- Línea 67: `const { listDocuments, downloadPDF, isLoading, error } = useAPISUNAT()`
- Línea 68: `const [documents, setDocuments] = useState<APISUNATDocument[]>([])`
- Línea 72: `const [selectedDocument, setSelectedDocument] = useState<APISUNATDocument | null>(null)`
- Línea 79: `if (!currentUser?.personaId || !currentUser?.personaToken)`
- Línea 86-87: `currentUser.personaId, currentUser.personaToken`
- Línea 113: `if (currentUser?.personaId && currentUser?.personaToken)`
- Línea 116: `[currentUser?.personaId, currentUser?.personaToken, ...]`
- Línea 138: `if (!selectedDocument || !currentUser?.personaToken)`
- Línea 171: `if (!currentUser.personaId || !currentUser.personaToken)`
- Línea 177: Descripción menciona "APISUNAT"
- Línea 378: `document: APISUNATDocument`

**Funcionalidad que usa SunatAPI**:
- ⚠️ `listDocuments()` - Listar todos los documentos emitidos (línea 85-93)
- ⚠️ `downloadPDF()` - Descargar PDF del documento (línea 124+)
- ⚠️ Validaciones de `personaId` y `personaToken` (múltiples líneas)
- ⚠️ Tipo `APISUNATDocument` usado en estado y props

**Acción requerida**:
- Migrar `listDocuments()` a MiAPI
- Migrar `downloadPDF()` a MiAPI
- Eliminar todas las validaciones de `personaId` y `personaToken`
- Crear nuevo tipo para documentos de MiAPI o adaptar `APISUNATDocument`
- Actualizar descripción de la página

---

### 7. **`src/utils/sunat.ts`** ⚠️ REVISAR
**Estado**: ⚠️ Depende de estructura UBL

**Referencias encontradas**:
- Línea 14: `import type { DocumentBody, InvoiceLine } from "../types/apisunat"`

**Funcionalidad**:
- Construye estructura UBL para documentos SUNAT
- Usa tipos de `apisunat.ts` (`DocumentBody`, `InvoiceLine`)

**Acción requerida**:
- **Si MiAPI usa UBL**: Mantener archivo, solo actualizar imports de tipos
- **Si MiAPI NO usa UBL**: Reescribir completamente según formato de MiAPI
- Verificar compatibilidad con estructura de MiAPI

---

## 🔍 Referencias a Campos Obsoletos

### `personaId` y `personaToken`
Estos campos fueron eliminados del schema pero aún se referencian en:

1. **`src/pages/admin/AdminSales.tsx`**:
   - Línea 659: `currentUser?.personaToken`
   - Línea 673: `currentUser.personaToken`
   - Línea 706: `currentUser?.personaToken`

2. **`src/pages/admin/AdminDocuments.tsx`**:
   - Línea 79: `currentUser?.personaId || !currentUser?.personaToken`
   - Línea 86-87: `currentUser.personaId, currentUser.personaToken`
   - Línea 113: `currentUser?.personaId && currentUser?.personaToken`
   - Línea 116: `currentUser?.personaId, currentUser?.personaToken`
   - Línea 138: `currentUser?.personaToken`
   - Línea 171: `currentUser.personaId || !currentUser.personaToken`

**Acción requerida**: Eliminar todas estas referencias ya que estos campos no existen en el schema actual.

---

## 📊 Resumen por Prioridad

### 🔴 Alta Prioridad (Bloquean funcionalidad)
1. `AdminSales.tsx` - Descarga de PDFs no funciona sin `personaToken`
2. `AdminDocuments.tsx` - Listado y descarga de documentos no funciona sin `personaId`/`personaToken`
3. `SalesTables.tsx` - Función `printPDF()` aún usa SunatAPI

### 🟡 Media Prioridad (Funcionalidad parcial)
4. `apisunat.ts` - Servicios base que necesitan migración
5. `useAPISUNAT.ts` - Hook que necesita migración
6. `types/apisunat.ts` - Tipos que necesitan actualización

### 🟢 Baja Prioridad (Revisión necesaria)
7. `utils/sunat.ts` - Depende de si MiAPI usa UBL o no

---

## ✅ Checklist de Migración

### Fase 1: Migrar funcionalidades críticas
- [ ] Migrar `listDocuments()` a MiAPI en `AdminDocuments.tsx`
- [ ] Migrar `getDocument()` a MiAPI en `AdminSales.tsx` y `AdminDocuments.tsx`
- [ ] Migrar `downloadPDF()` a MiAPI en `AdminSales.tsx` y `AdminDocuments.tsx`
- [ ] Migrar `printPDF()` a MiAPI en `SalesTables.tsx`

### Fase 2: Actualizar validaciones
- [ ] Eliminar validaciones de `personaId` en `AdminDocuments.tsx`
- [ ] Eliminar validaciones de `personaToken` en `AdminSales.tsx` y `AdminDocuments.tsx`
- [ ] Actualizar para usar `secretKey` si es necesario

### Fase 3: Limpieza
- [ ] Eliminar métodos obsoletos de `apisunat.ts` (`getLastDocument`, `emitDocument`)
- [ ] Eliminar funciones obsoletas de `useAPISUNAT.ts`
- [ ] Eliminar tipos obsoletos de `types/apisunat.ts`
- [ ] Eliminar imports de `useAPISUNAT` en archivos migrados
- [ ] Eliminar referencia a `VITE_APISUNAT_BASE_URL` en `SalesTables.tsx`
- [ ] Actualizar descripciones que mencionan "APISUNAT"

### Fase 4: Eliminación final
- [ ] Eliminar `src/services/apisunat.ts`
- [ ] Eliminar `src/hooks/useAPISUNAT.ts`
- [ ] Eliminar o actualizar `src/types/apisunat.ts` (mantener solo tipos UBL si es necesario)
- [ ] Verificar y actualizar `src/utils/sunat.ts` según formato de MiAPI

---

## 📝 Notas Adicionales

1. **Endpoints de MiAPI pendientes de implementar**:
   - Listar documentos emitidos
   - Obtener documento específico
   - Descargar PDFs (A4, ticket)
   - Obtener CDR

2. **Variables de entorno**:
   - `VITE_APISUNAT_BASE_URL` aún se usa en `SalesTables.tsx` (línea 1112)
   - Debe reemplazarse por URL de MiAPI cuando se migre `printPDF()`

3. **Tipos**:
   - `PDFFormat` puede mantenerse si MiAPI usa los mismos formatos
   - `APISUNATDocument` necesita migración o reemplazo por tipo de MiAPI

---

**Última actualización**: 2024-12-19
