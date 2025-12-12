/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server"
import { v, ConvexError } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"
const itemInputSchema = v.object({
  productId: v.id("products"),
  quantity: v.number(),
  unitPrice: v.number(),
  discountAmount: v.optional(v.number()),
  notes: v.optional(v.string()),
})

const paymentMethodSchema = v.optional(
  v.union(v.literal("Contado"), v.literal("Tarjeta"), v.literal("Transferencia"), v.literal("Otros"))
)

type ItemInput = {
  productId: string
  quantity: number
  unitPrice: number
  discountAmount?: number
  notes?: string
}

type Totals = {
  subtotal: number
  discounts: number
  total: number
}

const now = () => Date.now()

const calculateTotals = (items: ItemInput[]): Totals => {
  return items.reduce<Totals>(
    (acc, item) => {
      const discount = Math.max(0, item.discountAmount ?? 0)
      const lineSubtotal = item.quantity * item.unitPrice
      acc.subtotal += lineSubtotal
      acc.discounts += discount
      acc.total += Math.max(0, lineSubtotal - discount)
      return acc
    },
    { subtotal: 0, discounts: 0, total: 0 }
  )
}

const normalizeNotes = (notes?: string) => notes?.trim() || undefined

const validateItems = async (ctx: any, items: ItemInput[]): Promise<ItemInput[]> => {
  if (
    items.some((item) => item.quantity <= 0 || item.unitPrice < 0 || (item.discountAmount ?? 0) < 0)
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
    discountAmount: item.discountAmount ?? 0,
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
      discountAmount: item.discountAmount ?? 0,
      notes: item.notes ?? undefined,
    }))
  )
  await ctx.db.patch(saleId, {
    subtotal: totals.subtotal,
    discounts: totals.discounts > 0 ? totals.discounts : undefined,
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

    const sales = await ctx.db
      .query("sales")
      .withIndex("byBranchStatus", (q) =>
        q.eq("branchId", args.branchId).eq("status", "open")
      )
      .collect()

    return Promise.all(
      sales.map(async (sale) => {
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

    const sales = await ctx.db
      .query("sales")
      .withIndex("byClosedAt", (q) => q.gte("closedAt", from).lte("closedAt", to))
      .collect()

    const filtered = sales
      .filter((sale) => sale.status === "closed")
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

    const branch = await ctx.db.get(args.branchId)
    if (!branch) {
      throw new ConvexError("La sucursal no existe.")
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

    const saleId = await ctx.db.insert("sales", {
      branchId: args.branchId,
      tableId: args.tableId,
      staffId: args.staffId,
      creatorUserId: userId,
      status: "open",
      openedAt: timestamp,
      closedAt: undefined,
      subtotal: totals.subtotal,
      discounts: totals.discounts > 0 ? totals.discounts : undefined,
      total: totals.total,
      paymentMethod: undefined,
      notes: normalizeNotes(args.notes),
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
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount ?? 0,
          totalPrice: Math.max(0, item.quantity * item.unitPrice - (item.discountAmount ?? 0)),
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
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount ?? 0,
          totalPrice: Math.max(0, item.quantity * item.unitPrice - (item.discountAmount ?? 0)),
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const sale = await ensureSaleOpen(ctx, args.saleId)

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
      paymentMethod: args.paymentMethod ?? undefined,
      closedAt: now(),
      notes: args.notes !== undefined ? normalizeNotes(args.notes) : sale.notes,
      discounts: totals.discounts > 0 ? totals.discounts : undefined,
      subtotal: totals.subtotal,
      total: totals.total,
      customerId: args.customerId,
      documentType: args.documentType,
      updatedAt: now(),
    })

    if (sale.tableId) {
      await releaseTable(ctx, sale.tableId, sale._id)
    }
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

export const updateDocumentId = mutation({
  args: {
    saleId: v.id("sales"),
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const sale = await ctx.db.get(args.saleId)
    if (!sale) {
      throw new ConvexError("La venta no existe")
    }

    await ctx.db.patch(args.saleId, {
      documentId: args.documentId,
      updatedAt: now(),
    })
  },
})


