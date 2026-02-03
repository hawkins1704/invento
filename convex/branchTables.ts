import { mutation, query } from "./_generated/server"
import { v, ConvexError } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

const normalizeLabel = (label: string) => label.trim()

export const list = query({
  args: {
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    // Si se especifica branchId, verificar que pertenece al usuario
    // Si no pertenece, retornar array vacío en lugar de lanzar error
    if (args.branchId) {
      const branch = await ctx.db.get(args.branchId)
      if (!branch || branch.userId !== userId) {
        return []
      }
    }

    const tablesQuery = args.branchId
      ? ctx.db
          .query("branchTables")
          .withIndex("byBranch", (q) => q.eq("branchId", args.branchId as Id<"branches">))
      : ctx.db.query("branchTables")

    const tables = await tablesQuery.collect()
    
    // Filtrar por branches del usuario si no se especifica branchId
    if (!args.branchId) {
      const userBranches = await ctx.db
        .query("branches")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect()
      const userBranchIds = new Set(userBranches.map((b) => b._id as string))
      return tables
        .filter((table) => userBranchIds.has(table.branchId as string))
        .sort((a, b) => {
          if (a.branchId === b.branchId) {
            return a.label.localeCompare(b.label)
          }
          return (a.branchId as string).localeCompare(b.branchId as string)
        })
    }

    return tables.sort((a, b) => {
      if (a.branchId === b.branchId) {
        return a.label.localeCompare(b.label)
      }
      return (a.branchId as string).localeCompare(b.branchId as string)
    })
  },
})

export const create = mutation({
  args: {
    branchId: v.id("branches"),
    label: v.string(),
    capacity: v.optional(v.number()),
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
    if (branch.userId !== userId) {
      throw new ConvexError("La sucursal no pertenece a tu cuenta.")
    }

    const normalizedLabel = normalizeLabel(args.label)
    if (!normalizedLabel) {
      throw new ConvexError("El nombre de la mesa no puede estar vacío.")
    }

    if (args.capacity !== undefined && args.capacity < 0) {
      throw new ConvexError("La capacidad debe ser un número positivo.")
    }

    const existing = await ctx.db
      .query("branchTables")
      .withIndex("byBranch", (q) =>
        q.eq("branchId", args.branchId as Id<"branches">).eq("label", normalizedLabel)
      )
      .first()

    if (existing) {
      throw new ConvexError("Ya existe una mesa con ese nombre en la sucursal.")
    }

    await ctx.db.insert("branchTables", {
      branchId: args.branchId,
      label: normalizedLabel,
      capacity:
        args.capacity !== undefined ? Math.max(0, Math.floor(args.capacity)) : undefined,
      status: "available",
    })
  },
})

export const update = mutation({
  args: {
    tableId: v.id("branchTables"),
    label: v.string(),
    capacity: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("occupied"),
        v.literal("reserved"),
        v.literal("out_of_service")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const table = await ctx.db.get(args.tableId)
    if (!table) {
      throw new ConvexError("La mesa no existe.")
    }

    const normalizedLabel = normalizeLabel(args.label)
    if (!normalizedLabel) {
      throw new ConvexError("El nombre de la mesa no puede estar vacío.")
    }

    if (args.capacity !== undefined && args.capacity < 0) {
      throw new ConvexError("La capacidad debe ser un número positivo.")
    }

    if (normalizedLabel !== table.label) {
      const duplicate = await ctx.db
        .query("branchTables")
        .withIndex("byBranch", (q) =>
          q.eq("branchId", table.branchId as Id<"branches">).eq("label", normalizedLabel)
        )
        .first()

      if (duplicate && duplicate._id !== args.tableId) {
        throw new ConvexError("Ya existe una mesa con ese nombre en la sucursal.")
      }
    }

    if (args.status && args.status !== table.status) {
      if (args.status === "available" && table.currentSaleId) {
        const sale = await ctx.db.get(table.currentSaleId)
        if (sale && sale.status === "open") {
          throw new ConvexError(
            "No puedes liberar la mesa porque tiene una venta activa asignada."
          )
        }
      }
    }

    await ctx.db.patch(args.tableId, {
      label: normalizedLabel,
      capacity:
        args.capacity !== undefined ? Math.max(0, Math.floor(args.capacity)) : undefined,
      ...(args.status ? { status: args.status } : {}),
    })
  },
})

export const remove = mutation({
  args: {
    tableId: v.id("branchTables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const table = await ctx.db.get(args.tableId)
    if (!table) {
      throw new ConvexError("La mesa no existe.")
    }

    if (table.currentSaleId) {
      const sale = await ctx.db.get(table.currentSaleId)
      if (sale && sale.status === "open") {
        throw new ConvexError("No puedes eliminar una mesa con una venta abierta.")
      }
    }

    await ctx.db.delete(args.tableId)
  },
})


