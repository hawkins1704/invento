import { mutation, query } from "./_generated/server"
import { v, ConvexError } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id, Doc } from "./_generated/dataModel"
import type { QueryCtx, MutationCtx } from "./_generated/server"

const ensureAuthenticated = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx)
  if (userId === null) {
    throw new ConvexError("No autenticado")
  }
  return userId
}

const findOpenShift = async (ctx: QueryCtx | MutationCtx, branchId: Id<"branches">) => {
  return await ctx.db
    .query("shifts")
    .withIndex("byBranchStatus", (q) => q.eq("branchId", branchId).eq("status", "open"))
    .first()
}

const computeCashSalesTotal = async (ctx: QueryCtx | MutationCtx, branchId: Id<"branches">, from: number, to?: number) => {
  const sales = await ctx.db
    .query("sales")
    .withIndex("byClosedAt", (q) => q.gte("closedAt", from))
    .collect()

  return sales
    .filter(
      (sale: Doc<"sales">) =>
        sale.status === "closed" &&
        sale.paymentMethod === "Contado" &&
        sale.branchId === branchId &&
        typeof sale.closedAt === "number" &&
        sale.closedAt >= from &&
        (to === undefined || sale.closedAt <= to)
    )
    .reduce((sum: number, sale: Doc<"sales">) => sum + sale.total, 0)
}

export const active = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx)
    const branch = await ctx.db.get(args.branchId)
    // Si la branch no existe o no pertenece al usuario, retornar null en lugar de lanzar error
    // Esto permite que el frontend maneje la situación de forma más elegante
    if (!branch || branch.userId !== userId) {
      return null
    }
    const shift = await findOpenShift(ctx, args.branchId)
    if (!shift) {
      return null
    }

    const cashSalesTotal = await computeCashSalesTotal(ctx, args.branchId, shift.openedAt)
    const expectedCash = shift.openingCash + cashSalesTotal

    return {
      shift,
      cashSalesTotal,
      expectedCash,
    }
  },
})

export const open = mutation({
  args: {
    branchId: v.id("branches"),
    staffId: v.optional(v.id("staff")),
    openingCash: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx)

    const branch = await ctx.db.get(args.branchId)
    if (!branch) {
      throw new ConvexError("La sucursal no existe.")
    }
    if (branch.userId !== userId) {
      throw new ConvexError("La sucursal no pertenece a tu cuenta.")
    }

    const existingShift = await findOpenShift(ctx, args.branchId)
    if (existingShift) {
      throw new ConvexError("Ya hay un turno abierto en esta sucursal.")
    }

    if (args.openingCash < 0) {
      throw new ConvexError("El monto inicial debe ser positivo.")
    }

    const now = Date.now()

    const shiftId = await ctx.db.insert("shifts", {
      branchId: args.branchId,
      staffId: args.staffId ?? undefined,
      openedAt: now,
      openingCash: Math.floor(args.openingCash * 100) / 100,
      status: "open" as const,
      updatedAt: now,
    })

    return shiftId
  },
})

export const close = mutation({
  args: {
    shiftId: v.id("shifts"),
    actualCash: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx)

    const shift = await ctx.db.get(args.shiftId)
    if (!shift) {
      throw new ConvexError("El turno no existe.")
    }

    const branch = await ctx.db.get(shift.branchId)
    if (!branch || branch.userId !== userId) {
      throw new ConvexError("No tienes permiso para cerrar este turno.")
    }

    if (shift.status !== "open") {
      throw new ConvexError("Este turno ya fue cerrado.")
    }

    const now = Date.now()

    const cashSalesTotal = await computeCashSalesTotal(ctx, shift.branchId, shift.openedAt, now)
    const expectedCash = shift.openingCash + cashSalesTotal

    const actualCash = Math.floor(args.actualCash * 100) / 100
    const difference = actualCash - expectedCash

    await ctx.db.patch(args.shiftId, {
      status: "closed",
      closedAt: now,
      closingActualCash: actualCash,
      closingExpectedCash: expectedCash,
      closingDiff: difference,
      notes: args.notes?.trim() || undefined,
      updatedAt: now,
    })

    return {
      expectedCash,
      cashSalesTotal,
      closingDiff: difference,
    }
  },
})

export const history = query({
  args: {
    branchId: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx)
    const limit = args.limit ?? 20

    const branch = await ctx.db.get(args.branchId)
    if (!branch || branch.userId !== userId) {
      throw new ConvexError("La sucursal no pertenece a tu cuenta.")
    }

    const shifts = await ctx.db
      .query("shifts")
      .withIndex("byBranch", (q) => q.eq("branchId", args.branchId))
      .collect()

    return shifts
      .sort((a: Doc<"shifts">, b: Doc<"shifts">) => b.openedAt - a.openedAt)
      .slice(0, limit)
      .map((shift: Doc<"shifts">) => ({
        ...shift,
        cashSalesTotal:
          shift.status === "open"
            ? undefined
            : shift.closingExpectedCash !== undefined
            ? shift.closingExpectedCash - shift.openingCash
            : undefined,
      }))
  },
})


