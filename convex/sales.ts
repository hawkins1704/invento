/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server"
import { v, ConvexError } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id, Doc } from "./_generated/dataModel"
import type { QueryCtx, MutationCtx } from "./_generated/server"
const itemInputSchema = v.object({
  productId: v.id("products"),
  productName: v.optional(v.string()),
  quantity: v.number(),
  unitPrice: v.number(),
  notes: v.optional(v.string()),
})

const paymentMethodSchema = v.optional(
  v.union(v.literal("Contado"), v.literal("Credito"))
)

type ItemInput = {
  productId: string
  productName?: string
  quantity: number
  unitPrice: number
  notes?: string
}

type Totals = {
  subtotal: number
  total: number
}

const now = () => Date.now()

const calculateTotals = (items: ItemInput[]): Totals => {
  return items.reduce<Totals>(
    (acc, item) => {
      const lineSubtotal = item.quantity * item.unitPrice
      acc.subtotal += lineSubtotal
      acc.total += lineSubtotal
      return acc
    },
    { subtotal: 0, total: 0 }
  )
}

const normalizeNotes = (notes?: string) => notes?.trim() || undefined

const validateItems = async (ctx: any, items: ItemInput[]): Promise<ItemInput[]> => {
  if (
    items.some((item) => item.quantity <= 0 || item.unitPrice < 0)
  ) {
    throw new ConvexError("Los productos deben tener cantidades y precios válidos.")
  }

  await Promise.all(
    items.map(async (item) => {
      const product = await ctx.db.get(item.productId)
      if (!product) {
        throw new ConvexError("Uno de los productos seleccionados no existe.")
      }
    })
  )

  return items.map((item) => ({
    ...item,
    notes: normalizeNotes(item.notes),
  }))
}

const ensureSaleOpen = async (ctx: any, saleId: string) => {
  const sale = await ctx.db.get(saleId)
  if (!sale) {
    throw new ConvexError("La venta no existe.")
  }
  if (sale.status !== "open") {
    throw new ConvexError("La venta ya no está abierta.")
  }
  return sale
}

const releaseTable = async (ctx: any, tableId?: string, saleId?: string) => {
  if (!tableId) {
    return
  }
  const table = await ctx.db.get(tableId)
  if (!table) {
    return
  }
  if (saleId && table.currentSaleId && table.currentSaleId !== saleId) {
    return
  }
  await ctx.db.patch(tableId, {
    status: "available",
    currentSaleId: undefined,
  })
}

const findOpenShift = async (ctx: QueryCtx | MutationCtx, branchId: Id<"branches">) => {
  return await ctx.db
    .query("shifts")
    .withIndex("byBranchStatus", (q: any) => q.eq("branchId", branchId).eq("status", "open"))
    .first()
}

const getNextKitchenTicketNumber = async (ctx: QueryCtx | MutationCtx, shiftId: Id<"shifts">): Promise<number> => {
  // Buscar todas las ventas del turno que ya tienen número asignado
  const salesWithTicketNumber = await ctx.db
    .query("sales")
    .withIndex("byShift", (q: any) => q.eq("shiftId", shiftId))
    .collect()
  
  // Filtrar solo las que tienen kitchenTicketNumber asignado
  const ticketNumbers = salesWithTicketNumber
    .filter((sale: Doc<"sales">) => sale.kitchenTicketNumber !== undefined)
    .map((sale: Doc<"sales">) => sale.kitchenTicketNumber!)
  
  // Si no hay ninguna, empezar en 1, sino tomar el máximo y sumar 1
  if (ticketNumbers.length === 0) {
    return 1
  }
  
  const maxTicketNumber = Math.max(...ticketNumbers)
  return maxTicketNumber + 1
}

const occupyTable = async (ctx: any, tableId: string, saleId: string) => {
  const table = await ctx.db.get(tableId)
  if (!table) {
    throw new ConvexError("La mesa seleccionada no existe.")
  }
  if (table.currentSaleId && table.currentSaleId !== saleId) {
    throw new ConvexError("La mesa ya tiene una venta asignada.")
  }
  if (table.status === "out_of_service") {
    throw new ConvexError("La mesa está fuera de servicio.")
  }

  await ctx.db.patch(tableId, {
    status: "occupied",
    currentSaleId: saleId,
  })
}

const ensureStaffForBranch = async (ctx: any, branchId: string, staffId?: string) => {
  if (!staffId) {
    return undefined
  }
  const staffMember = await ctx.db.get(staffId)
  if (!staffMember) {
    throw new ConvexError("El miembro del personal no existe.")
  }
  if (!staffMember.active) {
    throw new ConvexError("El miembro del personal está inactivo.")
  }
  if (staffMember.branchId !== branchId) {
    throw new ConvexError("El miembro del personal pertenece a otra sucursal.")
  }
  return staffMember
}

const loadSaleItems = async (ctx: any, saleId: string) => {
  return ctx.db
    .query("saleItems")
    .withIndex("bySale", (q: any) => q.eq("saleId", saleId))
    .collect()
}

const recalcTotals = async (ctx: any, saleId: string) => {
  const items = await loadSaleItems(ctx, saleId)
  const totals = calculateTotals(
    items.map((item: any) => ({
      productId: item.productId as string,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes ?? undefined,
    }))
  )
  await ctx.db.patch(saleId, {
    subtotal: totals.subtotal,
    total: totals.total,
    updatedAt: now(),
  })
  return totals
}

// Reserva stock (resta) cuando se crean/actualizan items de una venta
const reserveInventoryForItems = async (
  ctx: any,
  branchId: Id<"branches">,
  items: ItemInput[]
) => {
  await Promise.all(
    items.map(async (item) => {
      // Obtener el producto para verificar si tiene inventario activado
      const product = await ctx.db.get(item.productId)
      const inventoryActivated = product?.inventoryActivated ?? false

      // Si el inventario no está activado, no hacer nada
      if (!inventoryActivated) {
        return
      }

      const inventory = await ctx.db
        .query("branchInventories")
        .withIndex("byBranch", (q: any) =>
          q.eq("branchId", branchId).eq("productId", item.productId)
        )
        .first()

      if (!inventory) {
        throw new ConvexError(
          "El inventario de la sucursal para uno de los productos no existe."
        )
      }

      // Obtener el producto para verificar si permite venta en negativo
      const allowNegativeSale = product?.allowNegativeSale ?? false

      // Solo validar stock si no permite venta en negativo
      if (!allowNegativeSale && inventory.stock < item.quantity) {
        throw new ConvexError(
          `No hay stock suficiente para el producto. Stock disponible: ${inventory.stock}, solicitado: ${item.quantity}`
        )
      }

      await ctx.db.patch(inventory._id, {
        stock: inventory.stock - item.quantity,
      })
    })
  )
}

// Restaura stock (suma) cuando se cancelan/modifican items de una venta
const restoreInventoryForItems = async (
  ctx: any,
  branchId: Id<"branches">,
  items: any[]
) => {
  await Promise.all(
    items.map(async (item: any) => {
      // Obtener el producto para verificar si tiene inventario activado
      const product = await ctx.db.get(item.productId)
      const inventoryActivated = product?.inventoryActivated ?? false

      // Si el inventario no está activado, no hacer nada
      if (!inventoryActivated) {
        return
      }

      const inventory = await ctx.db
        .query("branchInventories")
        .withIndex("byBranch", (q: any) =>
          q.eq("branchId", branchId).eq("productId", item.productId)
        )
        .first()

      if (inventory) {
        await ctx.db.patch(inventory._id, {
          stock: inventory.stock + item.quantity,
        })
      }
    })
  )
}

export const listLiveByBranch = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const branch = await ctx.db.get(args.branchId)
    // Si la branch no pertenece al usuario, retornar array vacío en lugar de lanzar error
    if (!branch || branch.userId !== userId) {
      return []
    }

    const sales = await ctx.db
      .query("sales")
      .withIndex("byBranchStatus", (q) =>
        q.eq("branchId", args.branchId).eq("status", "open")
      )
      .collect()

    // Filtrar solo las ventas del usuario
    const userSales = sales.filter((sale) => sale.userId === userId)

    return Promise.all(
      userSales.map(async (sale) => {
        const [items, table, staffMember] = await Promise.all([
          loadSaleItems(ctx, sale._id),
          sale.tableId ? ctx.db.get(sale.tableId) : undefined,
          sale.staffId ? ctx.db.get(sale.staffId) : undefined,
        ])

        return {
          sale,
          items,
          table,
          staff: staffMember,
        }
      })
    )
  },
})

const getStartOfCurrentMonthUTC = () => {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
}

export const getTotalSalesCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }
    const allSales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()
    return { total: allSales.length }
  },
})

export const getSalesCountThisMonth = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }
    const startOfMonth = getStartOfCurrentMonthUTC()
    const endOfNow = now()
    const allSales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()
    const count = allSales.filter(
      (s) => s.openedAt >= startOfMonth && s.openedAt <= endOfNow
    ).length
    return { count }
  },
})

export const getSalesByMonth = query({
  args: {
    monthsBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }
    const monthsBack = args.monthsBack ?? 12
    const allSales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()
    const byMonth = new Map<string, number>()
    const nowDate = new Date()
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      byMonth.set(key, 0)
    }
    for (const sale of allSales) {
      const d = new Date(sale.openedAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (byMonth.has(key)) {
        byMonth.set(key, (byMonth.get(key) ?? 0) + 1)
      }
    }
    const months = Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey]) => {
        const [y, m] = monthKey.split("-").map(Number)
        const date = new Date(y, m - 1, 1)
        const monthLabel = date.toLocaleDateString("es-PE", {
          month: "short",
          year: "2-digit",
        })
        return {
          month: monthKey,
          count: byMonth.get(monthKey) ?? 0,
          label: monthLabel,
        }
      })
    return { months }
  },
})

export const listHistory = query({
  args: {
    branchId: v.optional(v.id("branches")),
    staffId: v.optional(v.id("staff")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const from = args.from ?? 0
    const to = args.to ?? now()
    const limit = args.limit ?? 10
    const offset = args.offset ?? 0

    // Si se especifica branchId, verificar que pertenece al usuario
    if (args.branchId) {
      const branch = await ctx.db.get(args.branchId)
      if (!branch || branch.userId !== userId) {
        throw new ConvexError("La sucursal no pertenece a tu cuenta.")
      }
    }

    const sales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()

    const filtered = sales
      .filter((sale) => sale.status === "closed" && sale.closedAt && sale.closedAt >= from && sale.closedAt <= to)
      .filter((sale) => (args.branchId ? sale.branchId === args.branchId : true))
      .filter((sale) => (args.staffId ? sale.staffId === args.staffId : true))
      .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))

    // Obtener el total antes de paginar
    const total = filtered.length

    // Aplicar paginación
    const paginatedSales = filtered.slice(offset, offset + limit)

    const salesWithDetails = await Promise.all(
      paginatedSales.map(async (sale) => {
        const [items, table, staffMember] = await Promise.all([
          loadSaleItems(ctx, sale._id),
          sale.tableId ? ctx.db.get(sale.tableId) : undefined,
          sale.staffId ? ctx.db.get(sale.staffId) : undefined,
        ])

        return {
          sale,
          items,
          table,
          staff: staffMember,
        }
      })
    )

    return {
      sales: salesWithDetails,
      total,
    }
  },
})

export const get = query({
  args: {
    saleId: v.id("sales"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const sale = await ctx.db.get(args.saleId)
    if (!sale) {
      throw new ConvexError("La venta no existe.")
    }
    if (sale.userId !== userId) {
      throw new ConvexError("No tienes permiso para ver esta venta.")
    }

    const [items, table, staffMember, branch] = await Promise.all([
      loadSaleItems(ctx, sale._id),
      sale.tableId ? ctx.db.get(sale.tableId) : undefined,
      sale.staffId ? ctx.db.get(sale.staffId) : undefined,
      ctx.db.get(sale.branchId),
    ])

    return {
      sale,
      items,
      table,
      staff: staffMember,
      branch,
    }
  },
})

export const create = mutation({
  args: {
    branchId: v.id("branches"),
    tableId: v.optional(v.id("branchTables")),
    staffId: v.optional(v.id("staff")),
    notes: v.optional(v.string()),
    items: v.optional(v.array(itemInputSchema)),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const user = await ctx.db.get(userId)
    if (!user) {
      throw new ConvexError("Usuario no encontrado.")
    }

    // Límite de ventas por mes por plan: starter 2000/mes, negocio y pro ilimitado
    const saleLimitByPlan: Record<string, number | null> = {
      starter: 2000,
      negocio: null,
      pro: null,
    }
    // Normalizar el subscriptionType para manejar casos edge (espacios, mayúsculas, etc.)
    const subscriptionType = user.subscriptionType?.toLowerCase().trim();
    let saleLimit: number | null;
    
    if (subscriptionType && subscriptionType in saleLimitByPlan) {
      // Si el plan está en el mapa, usar su valor (puede ser null para "negocio" y "pro")
      saleLimit = saleLimitByPlan[subscriptionType];
    } else {
      // Si no hay subscriptionType o es un valor desconocido, tratar como starter
      saleLimit = 2000;
    }
    
    // Solo validar límite si hay un límite numérico definido (no null)
    if (saleLimit !== null) {
      const startOfMonth = getStartOfCurrentMonthUTC()
      const endOfNow = now()
      const allSales = await ctx.db
        .query("sales")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .collect()
      const salesThisMonth = allSales.filter(
        (s) => s.openedAt >= startOfMonth && s.openedAt <= endOfNow
      ).length
      if (salesThisMonth >= saleLimit) {
        throw new ConvexError(
          `Has alcanzado el límite de ${saleLimit} ventas del mes de tu plan. Actualiza tu plan o espera al próximo mes.`
        )
      }
    }

    const branch = await ctx.db.get(args.branchId)
    if (!branch) {
      throw new ConvexError("La sucursal no existe.")
    }
    if (branch.userId !== userId) {
      throw new ConvexError("La sucursal no pertenece a tu cuenta.")
    }

    const validatedItems = await validateItems(ctx, args.items ?? [])
    const totals = calculateTotals(validatedItems)
    const timestamp = now()

    if (args.tableId) {
      const table = await ctx.db.get(args.tableId)
      if (!table || table.branchId !== args.branchId) {
        throw new ConvexError("La mesa seleccionada no pertenece a la sucursal.")
      }
      if (table.currentSaleId) {
        throw new ConvexError("La mesa ya tiene una venta activa.")
      }
      if (table.status === "out_of_service") {
        throw new ConvexError("La mesa está fuera de servicio.")
      }
    }

    await ensureStaffForBranch(ctx, args.branchId, args.staffId)

    // Buscar el turno activo de la sucursal
    const activeShift = await findOpenShift(ctx, args.branchId)
    if (!activeShift) {
      throw new ConvexError("No hay un turno abierto en esta sucursal. Debes abrir un turno antes de crear ventas.")
    }

    // Obtener el siguiente número de ticket de cocina para este turno
    const kitchenTicketNumber = await getNextKitchenTicketNumber(ctx, activeShift._id)

    const saleId = await ctx.db.insert("sales", {
      branchId: args.branchId,
      tableId: args.tableId,
      staffId: args.staffId,
      userId: userId,
      status: "open",
      openedAt: timestamp,
      closedAt: undefined,
      subtotal: totals.subtotal,
      total: totals.total,
      paymentMethod: undefined,
      notes: normalizeNotes(args.notes),
      shiftId: activeShift._id,
      kitchenTicketNumber: kitchenTicketNumber,
      updatedAt: timestamp,
    })

    // Reservar inventario antes de crear los items
    if (validatedItems.length > 0) {
      await reserveInventoryForItems(ctx, args.branchId, validatedItems)
    }

    await Promise.all(
      validatedItems.map((item) =>
        ctx.db.insert("saleItems", {
          saleId,
          productId: item.productId as Id<"products">,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          notes: item.notes,
          createdAt: timestamp,
        })
      )
    )

    if (args.tableId) {
      await occupyTable(ctx, args.tableId, saleId)
    }

    return saleId
  },
})

export const setItems = mutation({
  args: {
    saleId: v.id("sales"),
    items: v.array(itemInputSchema),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const sale = await ensureSaleOpen(ctx, args.saleId)
    if (sale.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta venta.")
    }
    const validatedItems = await validateItems(ctx, args.items)
    const timestamp = now()

    const existingItems = await loadSaleItems(ctx, sale._id)
    
    // Restaurar inventario de items anteriores antes de actualizar
    if (existingItems.length > 0) {
      await restoreInventoryForItems(ctx, sale.branchId, existingItems)
    }
    
    // Eliminar items anteriores
    await Promise.all(existingItems.map((item: any) => ctx.db.delete(item._id)))

    // Reservar inventario para los nuevos items
    if (validatedItems.length > 0) {
      await reserveInventoryForItems(ctx, sale.branchId, validatedItems)
    }

    await Promise.all(
      validatedItems.map((item) =>
        ctx.db.insert("saleItems", {
          saleId: sale._id,
          productId: item.productId as Id<"products">,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          notes: item.notes,
          createdAt: timestamp,
        })
      )
    )

    await recalcTotals(ctx, sale._id)
  },
})

export const updateDetails = mutation({
  args: {
    saleId: v.id("sales"),
    tableId: v.optional(v.union(v.id("branchTables"), v.null())),
    staffId: v.optional(v.union(v.id("staff"), v.null())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const sale = await ensureSaleOpen(ctx, args.saleId)
    if (sale.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta venta.")
    }

    if (args.staffId !== undefined) {
      if (args.staffId) {
        await ensureStaffForBranch(ctx, sale.branchId, args.staffId)
      }
    }

    if (args.tableId !== undefined) {
      const newTableId = args.tableId ?? undefined
      if (newTableId) {
        const table = await ctx.db.get(newTableId)
        if (!table || table.branchId !== sale.branchId) {
          throw new ConvexError("La mesa seleccionada no pertenece a la sucursal.")
        }
        await occupyTable(ctx, newTableId, sale._id)
      }
      if (sale.tableId && sale.tableId !== newTableId) {
        await releaseTable(ctx, sale.tableId, sale._id)
      }
      await ctx.db.patch(sale._id, {
        tableId: newTableId,
      })
    }

    const updates: Record<string, any> = {
      updatedAt: now(),
    }

    if (args.staffId !== undefined) {
      updates.staffId = args.staffId ?? undefined
    }

    if (args.notes !== undefined) {
      updates.notes = normalizeNotes(args.notes)
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(sale._id, updates)
    }
  },
})

export const close = mutation({
  args: {
    saleId: v.id("sales"),
    paymentMethod: paymentMethodSchema,
    notes: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    documentType: v.optional(v.union(v.literal("01"), v.literal("03"))),
    /** Serie usada en el comprobante (ej. B001, F001). Se guarda antes de incrementar en la sucursal. */
    serie: v.optional(v.string()),
    /** Correlativo usado en el comprobante. Se guarda antes de incrementar en la sucursal. */
    correlativo: v.optional(v.number()),
    cdr: v.optional(v.string()),
    pdfA4: v.optional(v.string()),
    pdfTicket: v.optional(v.string()),
    xmlFirmado: v.optional(v.string()),
    xmlSinFirmar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const sale = await ensureSaleOpen(ctx, args.saleId)
    if (sale.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta venta.")
    }

    // Validar que si se emite factura, tenga cliente
    if (args.documentType === "01" && !args.customerId) {
      throw new ConvexError("Para emitir una factura es necesario registrar los datos del cliente.")
    }

    // Validar que el cliente existe si se proporciona
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId)
      if (!customer) {
        throw new ConvexError("El cliente seleccionado no existe.")
      }
    }

    const totals = await recalcTotals(ctx, sale._id)
    // El inventario ya fue reservado al crear la venta, no necesitamos ajustarlo aquí

    await ctx.db.patch(sale._id, {
      status: "closed",
      paymentMethod: (args.paymentMethod as "Contado" | "Credito" | undefined) ?? undefined,
      closedAt: now(),
      notes: args.notes !== undefined ? normalizeNotes(args.notes) : sale.notes,
      subtotal: totals.subtotal,
      total: totals.total,
      customerId: args.customerId,
      documentType: args.documentType,
      serie: args.serie,
      correlativo: args.correlativo,
      cdr: args.cdr,
      pdfA4: args.pdfA4,
      pdfTicket: args.pdfTicket,
      xmlFirmado: args.xmlFirmado,
      xmlSinFirmar: args.xmlSinFirmar,
      updatedAt: now(),
    })

    if (sale.tableId) {
      await releaseTable(ctx, sale.tableId, sale._id)
    }
  },
})

/**
 * Marca una venta cerrada como anulada (documento RA emitido correctamente).
 * Solo se llama después de que la API de anulación retorne success.
 */
export const markAsAnulado = mutation({
  args: {
    saleId: v.id("sales"),
    correlativoRA: v.number(),
    /** URL o contenido del XML RA (respuesta.mensaje) cuando la anulación fue exitosa. */
    xmlRA: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const sale = await ctx.db.get(args.saleId)
    if (!sale) {
      throw new ConvexError("La venta no existe.")
    }
    if (sale.userId !== userId) {
      throw new ConvexError("No tienes permiso para anular esta venta.")
    }
    if (sale.status !== "closed") {
      throw new ConvexError("Solo se puede anular una venta cerrada.")
    }
    if (!sale.documentType) {
      throw new ConvexError("La venta no tiene documento emitido para anular.")
    }
    if (sale.correlativoRA != null) {
      throw new ConvexError("El documento de esta venta ya fue anulado.")
    }

    await ctx.db.patch(args.saleId, {
      correlativoRA: args.correlativoRA,
      xmlRA: args.xmlRA,
      updatedAt: now(),
    })
  },
})

export const cancel = mutation({
  args: {
    saleId: v.id("sales"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const sale = await ensureSaleOpen(ctx, args.saleId)
    if (sale.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta venta.")
    }

    // Restaurar inventario de los items de la venta cancelada
    const items = await loadSaleItems(ctx, sale._id)
    if (items.length > 0) {
      await restoreInventoryForItems(ctx, sale.branchId, items)
    }

    await ctx.db.patch(sale._id, {
      status: "cancelled",
      closedAt: now(),
      notes: args.reason ? normalizeNotes(args.reason) : sale.notes,
      updatedAt: now(),
    })

    if (sale.tableId) {
      await releaseTable(ctx, sale.tableId, sale._id)
    }
  },
})

// Dashboard queries
export const getTodaySummary = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const now = Date.now()
    const from = args.from ?? (() => {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      return startOfDay.getTime()
    })()
    const to = args.to ?? (() => {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return endOfDay.getTime()
    })()

    // Obtener ventas cerradas de hoy usando índice
    const todaySales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()

    const closedSales = todaySales.filter(
      (sale) => sale.status === "closed" && sale.closedAt && sale.closedAt >= from && sale.closedAt <= to
    )
    
    // Obtener ventas abiertas usando índice porBranchStatus para cada sucursal del usuario
    const branches = await ctx.db
      .query("branches")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect()
    const openSalesByBranch = await Promise.all(
      branches.map((branch) =>
        ctx.db
          .query("sales")
          .withIndex("byBranchStatus", (q) =>
            q.eq("branchId", branch._id).eq("status", "open")
          )
          .collect()
      )
    )
    const openSales = openSalesByBranch.flat().filter((sale) => sale.userId === userId)

    const totalAmount = closedSales.reduce((sum, sale) => sum + sale.total, 0)
    const totalTickets = closedSales.length
    const averageTicket = totalTickets > 0 ? totalAmount / totalTickets : 0
    const openTickets = openSales.length

    return {
      totalAmount,
      totalTickets,
      averageTicket,
      openTickets,
    }
  },
})

export const getSummaryByBranch = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const now = Date.now()
    const from = args.from ?? (() => {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      return startOfDay.getTime()
    })()
    const to = args.to ?? (() => {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return endOfDay.getTime()
    })()

    const branches = await ctx.db
      .query("branches")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect()
    const todaySales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()

    // Obtener ventas abiertas y shifts usando índices por branch (más eficiente)
    return Promise.all(
      branches.map(async (branch) => {
        const [branchClosedSales, branchOpenSales, branchShifts] = await Promise.all([
          // Ventas cerradas de hoy para esta sucursal
          Promise.resolve(
            todaySales.filter(
              (sale) => sale.branchId === branch._id && sale.status === "closed" && sale.closedAt && sale.closedAt >= from && sale.closedAt <= to
            )
          ),
          // Ventas abiertas usando índice
          ctx.db
            .query("sales")
            .withIndex("byBranchStatus", (q) =>
              q.eq("branchId", branch._id).eq("status", "open")
            )
            .collect(),
          // Shifts abiertos usando índice
          ctx.db
            .query("shifts")
            .withIndex("byBranchStatus", (q) =>
              q.eq("branchId", branch._id).eq("status", "open")
            )
            .collect(),
        ])

        const totalAmount = branchClosedSales.reduce((sum, sale) => sum + sale.total, 0)
        const totalTickets = branchClosedSales.length
        const openTickets = branchOpenSales.length
        const hasActiveShift = branchShifts.length > 0

        return {
          branchId: branch._id,
          branchName: branch.name,
          totalAmount,
          totalTickets,
          openTickets,
          hasActiveShift,
        }
      })
    )
  },
})

export const getPaymentMethodBreakdown = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    branchId: v.optional(v.id("branches")),
    staffId: v.optional(v.id("staff")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const now = Date.now()
    const from = args.from ?? (() => {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      return startOfDay.getTime()
    })()
    const to = args.to ?? (() => {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return endOfDay.getTime()
    })()

    const todaySales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()

    let closedSales = todaySales.filter(
      (sale) => sale.status === "closed" && sale.closedAt && sale.closedAt >= from && sale.closedAt <= to
    )

    // Aplicar filtros opcionales
    if (args.branchId) {
      closedSales = closedSales.filter((sale) => sale.branchId === args.branchId)
    }

    if (args.staffId) {
      closedSales = closedSales.filter((sale) => sale.staffId === args.staffId)
    }

    const breakdown = new Map<string, number>()
    let total = 0

    closedSales.forEach((sale) => {
      const method = sale.paymentMethod ?? "Sin registrar"
      const current = breakdown.get(method) ?? 0
      breakdown.set(method, current + sale.total)
      total += sale.total
    })

    return Array.from(breakdown.entries()).map(([method, amount]) => ({
      method,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
  },
})

export const getTopBranches = query({
  args: {
    limit: v.optional(v.number()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const now = Date.now()
    const from = args.from ?? (() => {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      return startOfDay.getTime()
    })()
    const to = args.to ?? (() => {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return endOfDay.getTime()
    })()

    const branches = await ctx.db
      .query("branches")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect()
    const todaySales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()

    const closedSales = todaySales.filter(
      (sale) => sale.status === "closed" && sale.closedAt && sale.closedAt >= from && sale.closedAt <= to
    )

    const branchTotals = new Map<string, number>()

    closedSales.forEach((sale) => {
      const branchId = sale.branchId as string
      const current = branchTotals.get(branchId) ?? 0
      branchTotals.set(branchId, current + sale.total)
    })

    const branchData = branches
      .map((branch) => ({
        branchId: branch._id,
        branchName: branch.name,
        totalAmount: branchTotals.get(branch._id as string) ?? 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

    const limit = args.limit ?? 5
    return branchData.slice(0, limit)
  },
})

export const getTopProducts = query({
  args: {
    limit: v.optional(v.number()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    branchId: v.optional(v.id("branches")),
    staffId: v.optional(v.id("staff")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const now = Date.now()
    const from = args.from ?? (() => {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      return startOfDay.getTime()
    })()
    const to = args.to ?? (() => {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return endOfDay.getTime()
    })()

    const todaySales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()

    let closedSales = todaySales.filter(
      (sale) => sale.status === "closed" && sale.closedAt && sale.closedAt >= from && sale.closedAt <= to
    )

    // Aplicar filtros opcionales
    if (args.branchId) {
      closedSales = closedSales.filter((sale) => sale.branchId === args.branchId)
    }

    if (args.staffId) {
      closedSales = closedSales.filter((sale) => sale.staffId === args.staffId)
    }

    const saleIds = closedSales.map((sale) => sale._id)

    const productStats = new Map<string, { quantity: number; revenue: number; productName: string }>()

    await Promise.all(
      saleIds.map(async (saleId) => {
        const items = await ctx.db
          .query("saleItems")
          .withIndex("bySale", (q) => q.eq("saleId", saleId))
          .collect()

        items.forEach((item) => {
          const productId = item.productId as string
          const product = productStats.get(productId) ?? { quantity: 0, revenue: 0, productName: "" }
          product.quantity += item.quantity
          product.revenue += item.totalPrice
          productStats.set(productId, product)
        })
      })
    )

    // Obtener nombres de productos
    const productIds = Array.from(productStats.keys())
    await Promise.all(
      productIds.map(async (productId) => {
        const product = await ctx.db.get(productId as Id<"products">)
        if (product) {
          const stats = productStats.get(productId)!
          stats.productName = product.name
          productStats.set(productId, stats)
        }
      })
    )

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => ({
        productId,
        productName: stats.productName,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const limit = args.limit ?? 10
    return topProducts.slice(0, limit)
  },
})

export const getTopStaff = query({
  args: {
    limit: v.optional(v.number()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    branchId: v.optional(v.id("branches")),
    staffId: v.optional(v.id("staff")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const now = Date.now()
    const from = args.from ?? (() => {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      return startOfDay.getTime()
    })()
    const to = args.to ?? (() => {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return endOfDay.getTime()
    })()

    const todaySales = await ctx.db
      .query("sales")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect()

    let closedSales = todaySales.filter(
      (sale) => sale.status === "closed" && sale.closedAt && sale.closedAt >= from && sale.closedAt <= to
    )

    // Aplicar filtros opcionales
    if (args.branchId) {
      closedSales = closedSales.filter((sale) => sale.branchId === args.branchId)
    }

    if (args.staffId) {
      closedSales = closedSales.filter((sale) => sale.staffId === args.staffId)
    }

    // Agrupar por staff
    const staffTotals = new Map<string, number>()

    closedSales.forEach((sale) => {
      const staffId = sale.staffId ? (sale.staffId as string) : "sinStaff"
      const current = staffTotals.get(staffId) ?? 0
      staffTotals.set(staffId, current + sale.total)
    })

    // Obtener nombres de staff
    const staffIds = Array.from(staffTotals.keys()).filter((id) => id !== "sinStaff")
    const staffMembers = await Promise.all(
      staffIds.map(async (staffId) => {
        const staff = await ctx.db.get(staffId as Id<"staff">)
        return staff ? { id: staffId, name: staff.name } : null
      })
    )

    const topStaff = Array.from(staffTotals.entries())
      .map(([staffId, total]) => {
        if (staffId === "sinStaff") {
          return {
            staffId: "sinStaff" as const,
            staffName: "Sin asignar",
            totalAmount: total,
          }
        }
        const staffMember = staffMembers.find((s) => s?.id === staffId)
        return {
          staffId: staffId as Id<"staff">,
          staffName: staffMember?.name ?? "Personal",
          totalAmount: total,
        }
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)

    const limit = args.limit ?? 5
    return topStaff.slice(0, limit)
  },
})

export const getSalesByHour = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    branchId: v.optional(v.id("branches")),
    staffId: v.optional(v.id("staff")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const now = Date.now()
    const from = args.from ?? (() => {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      return startOfDay.getTime()
    })()
    const to = args.to ?? (() => {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return endOfDay.getTime()
    })()

    const todaySales = await ctx.db
      .query("sales")
      .withIndex("byClosedAt", (q) => q.gte("closedAt", from).lte("closedAt", to))
      .collect()

    let closedSales = todaySales.filter((sale) => sale.status === "closed" && sale.closedAt)

    // Aplicar filtros opcionales
    if (args.branchId) {
      closedSales = closedSales.filter((sale) => sale.branchId === args.branchId)
    }

    if (args.staffId) {
      closedSales = closedSales.filter((sale) => sale.staffId === args.staffId)
    }

    // Inicializar horas del día (0-23)
    const hourlyData = new Map<number, number>()
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.set(hour, 0)
    }

    closedSales.forEach((sale) => {
      if (sale.closedAt) {
        // Convertir a hora local de Perú (America/Lima, UTC-5)
        const date = new Date(sale.closedAt)
        // Usar toLocaleString para obtener la hora en la zona horaria de Lima
        const hourString = date.toLocaleString("en-US", {
          timeZone: "America/Lima",
          hour: "numeric",
          hour12: false,
        })
        const hour = parseInt(hourString, 10)
        const current = hourlyData.get(hour) ?? 0
        hourlyData.set(hour, current + 1) // Contar cantidad de ventas, no monto
      }
    })

    return Array.from(hourlyData.entries())
      .map(([hour, amount]) => ({
        hour,
        amount,
      }))
      .sort((a, b) => a.hour - b.hour)
  },
})


