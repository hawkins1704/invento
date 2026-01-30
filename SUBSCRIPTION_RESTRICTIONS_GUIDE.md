# Guía: Restricciones por `subscriptionType`

Esta guía describe cómo aplicar límites o restricciones según el plan del usuario (`subscriptionType`) en nuevas secciones de la app. El patrón ya está implementado en **Inventario (productos)**; aquí se resume para replicarlo en otras partes.

---

## 1. Tipos de suscripción (schema)

En `convex/schema.ts`, el usuario tiene:

```ts
subscriptionType: v.optional(v.union(
  v.literal("starter"),
  v.literal("negocio"),
  v.literal("pro")
))
```

- **starter** — Plan base (límites más bajos).
- **negocio** — Plan intermedio.
- **pro** — Plan alto (puede ser ilimitado en algunos casos).

Si `subscriptionType` no está definido, conviene tratar como `starter` para no permitir más de lo previsto.

---

## 2. Dónde implementar

Siempre en **dos lugares**:

| Lugar | Propósito |
|-------|-----------|
| **Backend (Convex)** | Garantizar el límite aunque se llame la mutación desde otro cliente, API o DevTools. |
| **Frontend (React)** | Deshabilitar acciones y mostrar mensajes/toasts para mejor UX. |

El frontend no sustituye al backend: las reglas de negocio se validan en el servidor.

---

## 3. Backend (Convex)

### 3.1 Dónde poner la validación

En la **mutación** que realiza la acción restringida (crear, editar, etc.), después de obtener el usuario autenticado.

### 3.2 Pasos

1. Obtener el usuario (ya suele estar en la mutación):

   ```ts
   const user = await ctx.db.get(userId);
   if (!user) throw new ConvexError("Usuario no encontrado.");
   ```

2. Definir el límite por plan (o reutilizar  constantes si las tienes):

   ```ts
   const limitByPlan: Record<string, number | null> = {
     starter: 100,
     negocio: 300,
     pro: null,  // null = ilimitado
   };
   const limit = user.subscriptionType
     ? limitByPlan[user.subscriptionType] ?? 100
     : 100;
   ```

3. Si hay límite, contar el recurso actual y validar:

   ```ts
   if (limit !== null) {
     const currentItems = await ctx.db.query("nombreDeLaTabla").collect();
     if (currentItems.length >= limit) {
       throw new ConvexError(
         `Has alcanzado el límite de ${limit} [recurso] de tu plan. Actualiza tu plan para agregar más.`
       );
     }
   }
   ```

4. Seguir con el resto de la lógica de la mutación (insert, update, etc.).

### 3.3 Ejemplo de referencia

Ver `convex/products.ts` → mutación `create`: validación de límite de productos por plan antes de `ctx.db.insert("products", ...)`.

---

## 4. Frontend (React)

### 4.1 Obtener usuario y plan

En la página o componente:

```ts
const currentUser = useQuery(api.users.getCurrent) as Doc<"users"> | undefined;
const subscriptionType = currentUser?.subscriptionType;
```

### 4.2 Calcular límite y estado “al límite”

Definir una función (o constante) con los mismos valores que en el backend:

```ts
const getLimit = (subscriptionType: string | undefined): number | null => {
  if (!subscriptionType) return 100;
  switch (subscriptionType) {
    case "starter": return 100;
    case "negocio": return 300;
    case "pro": return null;
    default: return 100;
  }
};

const limit = getLimit(currentUser?.subscriptionType);
const currentCount = totalItems; // según tu query (ej. totalProducts, totalBranches)
const atLimit = limit !== null && currentCount >= limit;
const planLabel = { starter: "Starter", negocio: "Negocio", pro: "Pro" }[subscriptionType ?? "starter"] ?? "Starter";
```

### 4.3 Acción al hacer clic: solo Toast, sin mensaje debajo del botón

- **Botón de acción (ej. “Agregar …”)**  
  Si al hacer clic el usuario está al límite, no ejecutar la acción y **mostrar solo un toast** (no agregar texto ni mensaje debajo del botón):

  ```ts
  const { error: toastError } = useToast();

  const handleAction = () => {
    if (atLimit && limit !== null) {
      toastError(
        `Has alcanzado el límite de ${limit} [recurso] de tu plan ${planLabel}. Actualiza tu plan para agregar más.`
      );
      return;
    }
    // abrir modal, navegar, etc.
  };
  ```

- El botón sigue habilitado para que el usuario pueda hacer clic y ver el toast. No deshabilitar el botón ni mostrar un mensaje inline debajo.

### 4.4 Validar en el submit del formulario

Si la acción es “crear/editar” desde un formulario, validar también al enviar (por si el límite se alcanza entre abrir el modal y enviar). Mostrar el mensaje **solo en toast** (y opcionalmente en `formError` dentro del modal si quieres feedback ahí también):

```ts
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  if (atLimit && limit !== null) {
    const msg = `Has alcanzado el límite...`;
    toastError(msg);
    setFormError(msg); // opcional: dentro del modal
    return;
  }
  // ... resto del submit
};
```

### 4.5 Ejemplo de referencia

Ver `src/pages/admin/AdminInventory.tsx`:

- `getProductLimit`, `PLAN_LABELS`, `productLimit`, `atProductLimit`, `planLabel`
- `handleOpenCreateProduct` (toast al hacer clic si está al límite)
- Validación en `handleCreateProduct` antes de llamar a la mutación
- Uso de `useToast()` para mensajes

---

## 5. Checklist para una nueva restricción

- [ ] **Schema:** Confirmar que `users.subscriptionType` existe y tiene los valores `starter` | `negocio` | `pro`.
- [ ] **Backend:** En la mutación correspondiente, después de obtener el usuario:
  - [ ] Definir límites por plan (mismo criterio que en frontend).
  - [ ] Si `limit !== null`, contar recursos actuales y lanzar `ConvexError` si `count >= limit`.
- [ ] **Frontend:** En la página/componente:
  - [ ] Obtener `currentUser` con `api.users.getCurrent`.
  - [ ] Calcular `limit` y `atLimit` con la misma lógica que el backend.
  - [ ] En la acción (clic o submit): si `atLimit`, mostrar **solo toast** (no mensaje debajo del botón) y no ejecutar la acción.
  - [ ] Opcional: deshabilitar botón cuando `atLimit` (por defecto el botón sigue habilitado para poder mostrar el toast al hacer clic).

---

## 6. Posible centralización de límites

Si quieres que los números no se dupliquen entre Convex y React, puedes:

- En **Convex:** definir un módulo o constante con los límites por recurso y por plan, y usarlo en las mutaciones.
- En **frontend:** no hay imports directos de Convex en runtime para “constantes compartidas”, así que o bien:
  - Mantener una copia de los mismos números en un archivo tipo `src/constants/subscriptionLimits.ts`, o
  - Exponer los límites desde una query de Convex (por ejemplo `api.users.getSubscriptionLimits`) y consumirla en la página.

El ejemplo actual (Inventario) duplica los valores en backend y frontend; es válido y claro para pocas restricciones.

---

## 7. Resumen por recurso (ejemplo)

| Recurso   | starter | negocio | pro   | Dónde (backend)      | Dónde (frontend)        |
|----------|---------|---------|-------|-----------------------|-------------------------|
| Productos| 100     | 300     | ∞     | `convex/products.ts`  | `AdminInventory.tsx`    |
| Sucursales | 1     | 5       | ∞     | `convex/branches.ts`  | `AdminBranches.tsx`     |
| Ventas (por mes) | 2000/mes | ∞ | ∞ | `convex/sales.ts` | `NewSaleModal.tsx` |
| (futuro) | …       | …       | …     | mutación correspond.  | página correspondiente  |

Usa esta tabla (o una similar en el repo) para ir anotando cada nueva restricción que implementes.
