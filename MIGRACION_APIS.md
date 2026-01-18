# Guía de Migración de APIs: Decolecta y SunatAPI

Este documento identifica todas las partes del código que utilizan las APIs de **Decolecta** (búsqueda DNI/RUC) y **SunatAPI** (facturación electrónica), y documenta los cambios necesarios para migrar a nuevas APIs.

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [API Decolecta - Referencias y Cambios](#api-decolecta)
3. [API SunatAPI - Referencias y Cambios](#api-sunatapi)
4. [Datos en Convex (Schema)](#datos-en-convex-schema)
5. [Variables de Entorno](#variables-de-entorno)
6. [Checklist de Migración](#checklist-de-migración)

---

## 📊 Resumen Ejecutivo

### API Decolecta
- **Propósito**: Consulta de datos por RUC y DNI
- **Archivos afectados**: 6 archivos
- **Endpoints utilizados**:
  - `GET /v1/sunat/ruc?numero={ruc}` - Consulta RUC
  - `GET /v1/reniec/dni?numero={dni}` - Consulta DNI

### API SunatAPI
- **Propósito**: Facturación electrónica (emisión de facturas y boletas)
- **Archivos afectados**: 7 archivos
- **Endpoints utilizados**:
  - `POST /personas/lastDocument` - Obtener número correlativo
  - `POST /personas/v1/sendBill` - Emitir documento
  - `GET /documents/getAll` - Listar documentos
  - `GET /documents/:documentId/getById` - Obtener documento
  - `GET /documents/:documentId/getPDF/:format/:fileName` - Descargar PDF

### Keys en Convex (Perfil de Usuario)
- **personaId**: ID de persona en SunatAPI (ya no se usará)
- **personaToken**: Token de autenticación SunatAPI (ya no se usará)
- **Nuevas keys**: Se necesitarán nuevas credenciales según la nueva API de facturación

---

## 🔍 API Decolecta

### Archivos que utilizan Decolecta

#### 1. **`convex/decolecta.ts`** ⚠️ CRÍTICO
**Descripción**: Acciones de Convex que actúan como proxy para Decolecta (evita CORS)

**Cambios necesarios**:
- [ ] Reemplazar `process.env.DECOLECTA_BASE_URL` por la nueva URL base
- [ ] Reemplazar `process.env.DECOLECTA_API_TOKEN` por el nuevo token/credenciales
- [ ] Actualizar endpoint `/v1/sunat/ruc` según nueva API
- [ ] Actualizar endpoint `/v1/reniec/dni` según nueva API
- [ ] Verificar estructura de respuesta y mapeo de datos
- [ ] Actualizar manejo de errores según nueva API

**Código actual**:
```typescript
// Líneas 23-24, 83-84
const baseUrl = process.env.DECOLECTA_BASE_URL;
const apiToken = process.env.DECOLECTA_API_TOKEN;

// Línea 38 - Endpoint RUC
const url = `${baseUrl}/v1/sunat/ruc?numero=${encodeURIComponent(rucLimpio)}`;

// Línea 100 - Endpoint DNI
const url = `${baseUrl}/v1/reniec/dni?numero=${encodeURIComponent(dniLimpio)}`;
```

---

#### 2. **`src/hooks/useDecolecta.ts`** ⚠️ CRÍTICO
**Descripción**: Hook React que expone funciones para consultar RUC y DNI

**Cambios necesarios**:
- [ ] Verificar que las acciones de Convex (`api.decolecta.consultarRUC`, `api.decolecta.consultarDNI`) sigan funcionando
- [ ] Actualizar tipos de respuesta si la nueva API devuelve estructura diferente
- [ ] Actualizar manejo de errores si es necesario

**Código actual**:
```typescript
// Líneas 27-28
const consultarRUCAction = useAction(api.decolecta.consultarRUC);
const consultarDNIAction = useAction(api.decolecta.consultarDNI);
```

---

#### 3. **`src/types/decolecta.ts`** ⚠️ CRÍTICO
**Descripción**: Tipos TypeScript para las respuestas de Decolecta

**Cambios necesarios**:
- [ ] Actualizar `RUCResponse` según estructura de respuesta de la nueva API
- [ ] Actualizar `DNIResponse` según estructura de respuesta de la nueva API
- [ ] Actualizar `DecolectaError` si la nueva API tiene estructura de error diferente

**Campos actuales que se mapean**:

**RUCResponse** (líneas 6-29):
- `razon_social` → Se mapea a `name` en formularios
- `direccion` → Se mapea a `address` en formularios
- `distrito`, `provincia`, `departamento` → Se usan en EditProfile

**DNIResponse** (líneas 34-41):
- `full_name` → Se mapea a `name` en formularios
- `first_name`, `first_last_name`, `second_last_name` → Se usan para construir nombre completo

---

#### 4. **`src/components/CloseSaleDialog.tsx`** ⚠️ CRÍTICO
**Descripción**: Diálogo para cerrar ventas que consulta datos de clientes

**Cambios necesarios**:
- [ ] Verificar mapeo de datos RUC (líneas 298-317)
- [ ] Verificar mapeo de datos DNI (líneas 325-353)
- [ ] Actualizar comentarios que mencionan "Decolecta" (líneas 298, 318, 325, 354, 399)

**Código actual**:
```typescript
// Línea 124
const { consultarRUC, consultarDNI } = useDecolecta();

// Líneas 296-321 - Mapeo RUC
if (documentType === "RUC") {
  const response = await consultarRUC(documentNumber);
  if (response) {
    const rucResponse = response as RUCResponse;
    if (rucResponse.razon_social) {
      updated.name = rucResponse.razon_social;
    }
    if (rucResponse.direccion) {
      updated.address = rucResponse.direccion;
    }
  }
}

// Líneas 322-357 - Mapeo DNI
else if (documentType === "DNI") {
  const response = await consultarDNI(documentNumber);
  if (response) {
    const dniResponse = response as DNIResponse;
    if (dniResponse.full_name) {
      updated.name = dniResponse.full_name;
    }
    // ... construcción de nombre desde campos individuales
  }
}
```

---

#### 5. **`src/pages/admin/EditProfile.tsx`** ⚠️ CRÍTICO
**Descripción**: Página de edición de perfil que consulta datos de RUC automáticamente

**Cambios necesarios**:
- [ ] Verificar mapeo de datos RUC (líneas 137-168)
- [ ] Actualizar comentarios que mencionan "Decolecta" (línea 137)

**Código actual**:
```typescript
// Línea 66
const { consultarRUC } = useDecolecta();

// Líneas 135-168 - Mapeo RUC
const response = await consultarRUC(rucNumber);
if (response) {
  const rucResponse = response as RUCResponse;
  if (rucResponse.razon_social) {
    updated.companyName = rucResponse.razon_social;
  }
  if (rucResponse.direccion) {
    updated.companyAddress = rucResponse.direccion;
  }
  if (rucResponse.distrito) {
    updated.companyDistrict = rucResponse.distrito;
  }
  // ... mapeo de provincia y departamento
}
```

---

#### 6. **`convex/_generated/api.d.ts`** ⚠️ AUTO-GENERADO
**Descripción**: Archivo generado automáticamente por Convex

**Cambios necesarios**:
- [ ] No modificar manualmente - se regenerará automáticamente después de actualizar `convex/decolecta.ts`

---

## 💰 API SunatAPI

### Archivos que utilizan SunatAPI

#### 1. **`src/services/apisunat.ts`** ⚠️ CRÍTICO
**Descripción**: Cliente HTTP para interactuar con SunatAPI

**Cambios necesarios**:
- [ ] Reemplazar `VITE_APISUNAT_BASE_URL` por la nueva URL base
- [ ] Actualizar método `getLastDocument()` - endpoint `/personas/lastDocument` (líneas 39-63)
- [ ] Actualizar método `emitDocument()` - endpoint `/personas/v1/sendBill` (líneas 72-96)
- [ ] Actualizar método `listDocuments()` - endpoint `/documents/getAll` (líneas 107-165)
- [ ] Actualizar método `getDocument()` - endpoint `/documents/:documentId/getById` (líneas 183-211)
- [ ] Actualizar método `downloadPDF()` - endpoint `/documents/:documentId/getPDF/:format/:fileName` (líneas 221-243)
- [ ] Actualizar método `printPDF()` - endpoint `/documents/:documentId/getPDF/:format/:fileName` (líneas 245-266)
- [ ] Verificar autenticación (actualmente usa `personaToken` en algunos endpoints)
- [ ] Actualizar manejo de errores según nueva API

**Código actual**:
```typescript
// Línea 15
const APISUNAT_BASE_URL = import.meta.env.VITE_APISUNAT_BASE_URL as string;

// Línea 44 - getLastDocument
await this.axiosInstance.post<LastDocumentResponse>("/personas/lastDocument", request);

// Línea 79 - emitDocument
await this.axiosInstance.post<EmitDocumentResponse>("/personas/v1/sendBill", document);

// Línea 147 - listDocuments
await this.axiosInstance.get<APISUNATDocument[]>(`/documents/getAll?${queryParams.toString()}`);

// Línea 189 - getDocument
await this.axiosInstance.get<APISUNATDocument>(`/documents/${documentId}/getById`, {
  headers: { Authorization: `Bearer ${personaToken}` }
});

// Líneas 235, 259 - downloadPDF/printPDF
const pdfUrl = `${baseUrl}/documents/${documentId}/getPDF/${format}/${fileNameWithExtension}`;
```

---

#### 2. **`src/hooks/useAPISUNAT.ts`** ⚠️ CRÍTICO
**Descripción**: Hook React que expone funciones para facturación electrónica

**Cambios necesarios**:
- [ ] Verificar que el cliente `apisunatClient` siga funcionando correctamente
- [ ] Actualizar tipos si la nueva API tiene estructura diferente
- [ ] Actualizar manejo de errores si es necesario

**Funciones expuestas**:
- `getLastDocument()` - Obtener número correlativo
- `emitDocument()` - Emitir documento
- `listDocuments()` - Listar documentos
- `getDocument()` - Obtener documento específico
- `downloadPDF()` - Descargar PDF
- `printPDF()` - Imprimir PDF

---

#### 3. **`src/types/apisunat.ts`** ⚠️ CRÍTICO
**Descripción**: Tipos TypeScript para SunatAPI

**Cambios necesarios**:
- [ ] Actualizar `EmitDocumentRequest` si la nueva API requiere campos diferentes (líneas 202-208)
- [ ] Actualizar `EmitDocumentResponse` si la respuesta cambia (líneas 213-216)
- [ ] Actualizar `LastDocumentRequest` si cambian los parámetros (líneas 221-226)
- [ ] Actualizar `LastDocumentResponse` si la respuesta cambia (líneas 231-238)
- [ ] Actualizar `APISUNATDocument` si la estructura del documento cambia (líneas 243-257)
- [ ] Actualizar `ListDocumentsParams` si cambian los filtros disponibles (líneas 264-274)
- [ ] Actualizar `APISUNATError` si la estructura de error cambia (líneas 279-283)
- [ ] Verificar tipos UBL (`DocumentBody`, `InvoiceLine`, etc.) - pueden mantenerse si la nueva API también usa UBL

**Campos críticos**:
- `personaId` y `personaToken` en requests (serán reemplazados por nuevas credenciales)
- Estructura UBL completa en `DocumentBody` (verificar compatibilidad)

---

#### 4. **`src/pages/sales/SalesTables.tsx`** ⚠️ CRÍTICO
**Descripción**: Página principal de ventas que emite facturas y boletas

**Cambios necesarios**:
- [ ] Actualizar validación de credenciales (líneas 665-673, 880-888) - reemplazar `personaId` y `personaToken` por nuevas keys
- [ ] Actualizar llamadas a `getLastDocument()` (líneas 676-681, 891-896)
- [ ] Actualizar llamadas a `emitDocument()` (líneas 767-773, 978-984)
- [ ] Actualizar construcción de URL de PDF para WhatsApp (línea 1073) - reemplazar `VITE_APISUNAT_BASE_URL`
- [ ] Verificar que `buildDocumentBody()` siga siendo compatible con la nueva API

**Código actual**:
```typescript
// Línea 100
const { getLastDocument, emitDocument, printPDF } = useAPISUNAT();

// Líneas 665-673 - Validación para boleta
if (!currentUser?.personaId || !currentUser?.personaToken || !currentUser?.ruc || !branch.serieBoleta) {
  throw new Error("Faltan datos de configuración...");
}

// Líneas 676-681 - Obtener número correlativo
const lastDocResponse = await getLastDocument({
  personaId: currentUser.personaId,
  personaToken: currentUser.personaToken,
  type: "03", // Boleta
  serie: branch.serieBoleta,
});

// Líneas 767-773 - Emitir documento
const emitResponse = await emitDocument({
  personaId: currentUser.personaId,
  personaToken: currentUser.personaToken,
  fileName,
  documentBody,
  ...(customerEmail && { customerEmail }),
});

// Línea 1073 - URL para WhatsApp
const baseUrl = import.meta.env.VITE_APISUNAT_BASE_URL as string;
```

---

#### 5. **`src/pages/admin/AdminSales.tsx`** ⚠️ CRÍTICO
**Descripción**: Panel de administración de ventas que descarga PDFs

**Cambios necesarios**:
- [ ] Actualizar validación de `personaToken` (líneas 659, 673, 706)
- [ ] Verificar que `getDocument()` y `downloadPDF()` sigan funcionando

**Código actual**:
```typescript
// Línea 648
const { getDocument, downloadPDF } = useAPISUNAT();

// Línea 659
if (!entry.sale.documentId || !currentUser?.personaToken) {
  return;
}

// Línea 673
const document = await getDocument(entry.sale.documentId, currentUser.personaToken);
```

---

#### 6. **`src/pages/admin/AdminDocuments.tsx`** ⚠️ CRÍTICO
**Descripción**: Página que lista todos los documentos emitidos

**Cambios necesarios**:
- [ ] Actualizar validación de `personaId` y `personaToken` (líneas 79, 86-87, 113, 116, 138, 171)
- [ ] Verificar que `listDocuments()` y `downloadPDF()` sigan funcionando

**Código actual**:
```typescript
// Línea 67
const { listDocuments, downloadPDF, isLoading, error } = useAPISUNAT();

// Líneas 79-87
if (!currentUser?.personaId || !currentUser?.personaToken) {
  return;
}
const result = await listDocuments(currentUser.personaId, currentUser.personaToken, {...});

// Línea 138
if (!selectedDocument || !currentUser?.personaToken) {
  return;
}
```

---

#### 7. **`src/utils/sunat.ts`** ⚠️ REVISAR
**Descripción**: Utilidades para construir documentos UBL

**Cambios necesarios**:
- [ ] Verificar compatibilidad de estructura UBL con la nueva API
- [ ] Si la nueva API no usa UBL, será necesario reescribir completamente este archivo
- [ ] Si la nueva API usa UBL pero con variaciones, actualizar según especificación

**Nota**: Este archivo construye la estructura completa UBL para documentos SUNAT. Si la nueva API de facturación también usa UBL, puede que solo necesite ajustes menores. Si usa otro formato (JSON, XML diferente), requerirá reescritura completa.

---

## 🗄️ Datos en Convex (Schema)

### Archivo: `convex/schema.ts`

**Campos actuales en tabla `users`** (líneas 19-20):
```typescript
personaId: v.optional(v.string()),
personaToken: v.optional(v.string()),
```

**Cambios necesarios**:
- [ ] **Eliminar** `personaId` y `personaToken` (ya no se usarán)
- [ ] **Agregar** nuevos campos para las credenciales de la nueva API de facturación
  - Ejemplo: `newApiKey: v.optional(v.string())` o `newApiToken: v.optional(v.string())`
  - Dependerá de cómo la nueva API maneje la autenticación

---

### Archivo: `convex/users.ts`

**Función `updateProfile`** (líneas 51-52, 117-121):
```typescript
personaId: v.optional(v.string()),
personaToken: v.optional(v.string()),

// En la función updateProfile:
if (args.personaId !== undefined) {
  updates.personaId = args.personaId.trim() || undefined;
}
if (args.personaToken !== undefined) {
  updates.personaToken = args.personaToken.trim() || undefined;
}
```

**Cambios necesarios**:
- [ ] Eliminar validación y actualización de `personaId` y `personaToken`
- [ ] Agregar validación y actualización de las nuevas credenciales

---

### Archivo: `src/pages/admin/EditProfile.tsx`

**Formulario de perfil** (líneas 22-23, 41-42, 82-83, 266-267, 550-584):
```typescript
// Estado del formulario
personaId: string;
personaToken: string;

// Inicialización
personaId: "",
personaToken: "",

// Carga desde currentUser
personaId: currentUser.personaId ?? "",
personaToken: currentUser.personaToken ?? "",

// Envío al backend
personaId: formState.personaId.trim() || undefined,
personaToken: formState.personaToken.trim() || undefined,

// Campos en el formulario (líneas 550-584)
// Inputs para "Persona ID" y "Persona Token"
```

**Cambios necesarios**:
- [ ] Eliminar campos `personaId` y `personaToken` del estado del formulario
- [ ] Eliminar inputs del formulario (sección "Datos de Facturación")
- [ ] Agregar nuevos campos según las credenciales requeridas por la nueva API
- [ ] Actualizar etiquetas y placeholders según la nueva API
- [ ] Actualizar descripción de la sección (línea 545: "Configuración para la emisión de comprobantes electrónicos con APISUNAT")

---

## 🔐 Variables de Entorno

### Variables actuales

#### Frontend (`.env` o `.env.local`)
```bash
VITE_APISUNAT_BASE_URL=https://api.sunatapi.com  # Ejemplo
```

**Cambios necesarios**:
- [ ] Reemplazar `VITE_APISUNAT_BASE_URL` por la nueva variable de entorno
- [ ] Ejemplo: `VITE_NEW_FACTURATION_API_BASE_URL`

---

#### Backend (Convex - Variables de entorno en dashboard)
```bash
DECOLECTA_BASE_URL=https://api.decolecta.com  # Ejemplo
DECOLECTA_API_TOKEN=token_abc123  # Ejemplo
```

**Cambios necesarios**:
- [ ] Reemplazar `DECOLECTA_BASE_URL` por la nueva URL base
- [ ] Reemplazar `DECOLECTA_API_TOKEN` por el nuevo token/credenciales
- [ ] Ejemplo: `NEW_DNI_RUC_API_BASE_URL` y `NEW_DNI_RUC_API_TOKEN`

---

## ✅ Checklist de Migración

### Fase 1: Preparación
- [ ] Obtener documentación de la nueva API de Decolecta (DNI/RUC)
- [ ] Obtener documentación de la nueva API de facturación
- [ ] Identificar nuevas credenciales requeridas
- [ ] Configurar nuevas variables de entorno en desarrollo

### Fase 2: Migración de Decolecta
- [ ] Actualizar `convex/decolecta.ts` con nuevos endpoints y autenticación
- [ ] Actualizar `src/types/decolecta.ts` con nuevas estructuras de respuesta
- [ ] Verificar mapeo de datos en `CloseSaleDialog.tsx`
- [ ] Verificar mapeo de datos en `EditProfile.tsx`
- [ ] Probar consultas de RUC
- [ ] Probar consultas de DNI

### Fase 3: Migración de SunatAPI
- [ ] Actualizar `src/services/apisunat.ts` con nuevos endpoints
- [ ] Actualizar `src/types/apisunat.ts` con nuevas estructuras
- [ ] Verificar compatibilidad de `src/utils/sunat.ts` (estructura UBL)
- [ ] Actualizar `SalesTables.tsx` con nuevas credenciales
- [ ] Actualizar `AdminSales.tsx` con nuevas credenciales
- [ ] Actualizar `AdminDocuments.tsx` con nuevas credenciales
- [ ] Probar emisión de boletas
- [ ] Probar emisión de facturas
- [ ] Probar descarga de PDFs
- [ ] Probar listado de documentos

### Fase 4: Actualización de Schema y Perfil
- [ ] Actualizar `convex/schema.ts` - eliminar `personaId` y `personaToken`, agregar nuevas keys
- [ ] Actualizar `convex/users.ts` - eliminar manejo de `personaId` y `personaToken`
- [ ] Actualizar `EditProfile.tsx` - eliminar campos antiguos, agregar nuevos
- [ ] Crear script de migración de datos (si es necesario migrar datos existentes)
- [ ] Probar actualización de perfil con nuevas credenciales

### Fase 5: Variables de Entorno
- [ ] Actualizar `.env.local` con nuevas variables
- [ ] Actualizar variables de entorno en Convex Dashboard (producción)
- [ ] Documentar nuevas variables de entorno en README o documentación

### Fase 6: Testing
- [ ] Probar flujo completo de consulta RUC → creación cliente → emisión boleta
- [ ] Probar flujo completo de consulta DNI → creación cliente → emisión boleta
- [ ] Probar emisión de factura con RUC
- [ ] Probar descarga de PDFs en diferentes formatos
- [ ] Probar listado de documentos
- [ ] Probar envío de PDFs por WhatsApp
- [ ] Probar envío de comprobantes por correo

### Fase 7: Limpieza
- [ ] Eliminar código comentado relacionado con APIs antiguas
- [ ] Actualizar comentarios que mencionen "Decolecta" o "SunatAPI"
- [ ] Verificar que no queden referencias a `personaId` o `personaToken` en el código
- [ ] Actualizar documentación del proyecto

---

## 📝 Notas Adicionales

### Estructura UBL
El archivo `src/utils/sunat.ts` construye documentos en formato UBL (Universal Business Language) según el estándar SUNAT. Si la nueva API de facturación:
- **Usa UBL**: Solo necesitará ajustes menores según la especificación
- **No usa UBL**: Requerirá reescritura completa de `buildDocumentBody()` y funciones relacionadas

### Mapeo de Datos Decolecta
Los datos de Decolecta se mapean directamente a formularios:
- **RUC**: `razon_social` → `name`, `direccion` → `address`, etc.
- **DNI**: `full_name` → `name` (o construcción desde campos individuales)

Si la nueva API devuelve estructura diferente, actualizar el mapeo en:
- `CloseSaleDialog.tsx` (líneas 298-357)
- `EditProfile.tsx` (líneas 137-168)

### Autenticación
Actualmente SunatAPI usa:
- `personaId` + `personaToken` en requests
- `personaToken` como Bearer token en algunos endpoints

La nueva API puede requerir:
- API Key diferente
- OAuth2
- JWT tokens
- Otro método de autenticación

Verificar documentación de la nueva API y actualizar según corresponda.

---

## 🔗 Archivos Relacionados (No Requieren Cambios Directos)

Estos archivos importan los hooks o tipos pero no necesitan cambios directos (se actualizarán automáticamente cuando cambien las dependencias):

- `src/components/CloseSaleDialog.tsx` - Ya listado arriba
- `src/pages/admin/EditProfile.tsx` - Ya listado arriba
- `src/pages/sales/SalesTables.tsx` - Ya listado arriba
- `src/pages/admin/AdminSales.tsx` - Ya listado arriba
- `src/pages/admin/AdminDocuments.tsx` - Ya listado arriba

---

**Última actualización**: [Fecha de creación del documento]
**Versión**: 1.0
