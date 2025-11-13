import { mutation, query } from "./_generated/server"
import { v, ConvexError } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

const ensureAuthenticated = async (ctx: any) => {
  const userId = await getAuthUserId(ctx)
  if (userId === null) {
    throw new ConvexError("No autenticado")
  }
  return userId
}

const findOpenShift = async (ctx: any, branchId: Id<"branches">) => {
  return await ctx.db
    .query("shifts")
    .withIndex("byBranchStatus", (q: any) => q.eq("branchId", branchId).eq("status", "open"))
    .first()
}

const computeCashSalesTotal = async (ctx: any, branchId: Id<"branches">, from: number, to?: number) => {
  const sales = await ctx.db
    .query("sales")
    .withIndex("byClosedAt", (q: any) => q.gte("closedAt", from))
    .collect()

  return sales
    .filter(
      (sale: any) =>
        sale.status === "closed" &&
        sale.paymentMethod === "cash" &&
        sale.branchId === branchId &&
        typeof sale.closedAt === "number" &&
        sale.closedAt >= from &&
        (to === undefined || sale.closedAt <= to)
    )
    .reduce((sum: number, sale: any) => sum + sale.total, 0)
}

export const active = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    await ensureAuthenticated(ctx)
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
    await ensureAuthenticated(ctx)

    const branch = await ctx.db.get(args.branchId)
    if (!branch) {
      throw new ConvexError("La sucursal no existe.")
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
    await ensureAuthenticated(ctx)

    const shift = await ctx.db.get(args.shiftId)
    if (!shift) {
      throw new ConvexError("El turno no existe.")
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
    await ensureAuthenticated(ctx)
    const limit = args.limit ?? 20

    const shifts = await ctx.db
      .query("shifts")
      .withIndex("byBranch", (q: any) => q.eq("branchId", args.branchId))
      .collect()

    return shifts
      .sort((a: any, b: any) => b.openedAt - a.openedAt)
      .slice(0, limit)
      .map((shift: any) => ({
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


