import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getById = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch || branch.userId !== userId) {
      return null;
    }
    return branch;
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const allBranches = await ctx.db
      .query("branches")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    const sorted = allBranches.sort((a, b) => a.name.localeCompare(b.name));

    // Obtener el total antes de paginar
    const total = sorted.length;

    // Aplicar paginación
    const limit = args.limit ?? 10;
    const offset = args.offset ?? 0;
    const paginatedBranches = sorted.slice(offset, offset + limit);

    return {
      branches: paginatedBranches,
      total,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("Usuario no encontrado.");
    }

    // Límite de sucursales por plan: starter 1, negocio 5, pro ilimitado
    const branchLimitByPlan: Record<string, number | null> = {
      starter: 1,
      negocio: 5,
      pro: null,
    };
    // Normalizar el subscriptionType para manejar casos edge (espacios, mayúsculas, etc.)
    const subscriptionType = user.subscriptionType?.toLowerCase().trim();
    let branchLimit: number | null;
    
    if (subscriptionType && subscriptionType in branchLimitByPlan) {
      // Si el plan está en el mapa, usar su valor (puede ser null para "pro")
      branchLimit = branchLimitByPlan[subscriptionType];
    } else {
      // Si no hay subscriptionType o es un valor desconocido, tratar como starter
      branchLimit = 1;
    }
    
    // Solo validar límite si hay un límite numérico definido (no null)
    if (branchLimit !== null) {
      const currentBranches = await ctx.db
        .query("branches")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();
      if (currentBranches.length >= branchLimit) {
        throw new ConvexError(
          `Has alcanzado el límite de ${branchLimit} sucursal${branchLimit === 1 ? "" : "es"} de tu plan. Actualiza tu plan para agregar más.`
        );
      }
    }

    const existing = await ctx.db
      .query("branches")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), args.name.trim()))
      .first();

    if (existing) {
      throw new ConvexError("Ya existe una sucursal con ese nombre.");
    }

    await ctx.db.insert("branches", {
      userId,
      name: args.name.trim(),
      address: args.address.trim(),
      correlativoBoleta: 1,
      correlativoFactura: 1,
      correlativoRA: 1,
    });
  },
});

export const update = mutation({
  args: {
    branchId: v.id("branches"),
    name: v.string(),
    address: v.string(),
    serieBoleta: v.optional(v.string()),
    serieFactura: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new ConvexError("La sucursal no existe.");
    }
    if (branch.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta sucursal.");
    }
    if (branch.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta sucursal.");
    }

    const normalizedName = args.name.trim();
    const existing = await ctx.db
      .query("branches")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), normalizedName))
      .first();

    if (existing && existing._id !== args.branchId) {
      throw new ConvexError("Ya existe una sucursal con ese nombre.");
    }

    const updates: Record<string, unknown> = {
      name: normalizedName,
      address: args.address.trim(),
    };

    if (args.serieBoleta !== undefined) {
      updates.serieBoleta = args.serieBoleta.trim() || undefined;
    }
    if (args.serieFactura !== undefined) {
      updates.serieFactura = args.serieFactura.trim() || undefined;
    }

    await ctx.db.patch(args.branchId, updates);
  },
});

export const updateCorrelativo = mutation({
  args: {
    branchId: v.id("branches"),
    documentType: v.union(v.literal("01"), v.literal("03")),
    correlativo: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new ConvexError("La sucursal no existe.");
    }
    if (branch.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta sucursal.");
    }

    const updates: Record<string, unknown> = {};
    if (args.documentType === "03") {
      updates.correlativoBoleta = args.correlativo;
    } else {
      updates.correlativoFactura = args.correlativo;
    }

    await ctx.db.patch(args.branchId, updates);
  },
});

/**
 * Obtiene el correlativo RA a usar para esta anulación y reserva el siguiente para la próxima.
 * El valor devuelto es el que debe usarse en el documento RA y guardarse en sale.correlativoRA.
 * El contador se reinicia cada día. Pasa `clientDate` en formato YYYY-MM-DD según la fecha local.
 */
export const getNextCorrelativoRA = mutation({
  args: {
    branchId: v.id("branches"),
    /** Fecha del día actual en zona del usuario (YYYY-MM-DD). Si no se pasa, se usa UTC. */
    clientDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new ConvexError("La sucursal no existe.");
    }
    if (branch.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta sucursal.");
    }

    const today = args.clientDate ?? new Date().toISOString().slice(0, 10);
    const lastDate = branch.correlativoRALastDate;

    // Valor que vamos a usar en ESTA anulación (antes de incrementar)
    const valueToUse = lastDate !== today ? 1 : (branch.correlativoRA ?? 1);
    // Siguiente valor para la próxima anulación (guardamos en branch)
    const nextForBranch = valueToUse + 1;

    await ctx.db.patch(args.branchId, {
      correlativoRA: nextForBranch,
      correlativoRALastDate: today,
    });

    return valueToUse;
  },
});

/**
 * Revierte el correlativo RA cuando la anulación falla (API no retornó success).
 * El branch guarda el siguiente valor a usar; tras usar N quedó en N+1. Al revertir, volvemos a N.
 */
export const rollbackCorrelativoRA = mutation({
  args: {
    branchId: v.id("branches"),
    valueUsed: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new ConvexError("La sucursal no existe.");
    }
    if (branch.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta sucursal.");
    }

    const expectedNext = args.valueUsed + 1;
    if (branch.correlativoRA !== expectedNext) {
      throw new ConvexError(
        "No se puede revertir: el correlativo RA ya fue usado por otra operación."
      );
    }

    await ctx.db.patch(args.branchId, {
      correlativoRA: args.valueUsed,
    });
  },
});

export const remove = mutation({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new ConvexError("La sucursal no existe.");
    }
    if (branch.userId !== userId) {
      throw new ConvexError("No tienes permiso para eliminar esta sucursal.");
    }

    const openSale = await ctx.db
      .query("sales")
      .withIndex("byBranchStatus", (q) =>
        q.eq("branchId", args.branchId).eq("status", "open")
      )
      .first();

    if (openSale) {
      throw new ConvexError(
        "No puedes eliminar la sucursal mientras tenga ventas abiertas."
      );
    }

    const branchSale = await ctx.db
      .query("sales")
      .filter((q) => q.eq(q.field("branchId"), args.branchId))
      .first();

    if (branchSale) {
      throw new ConvexError(
        "No puedes eliminar la sucursal porque tiene ventas registradas."
      );
    }

    const branchShift = await ctx.db
      .query("shifts")
      .withIndex("byBranchStatus", (q) =>
        q.eq("branchId", args.branchId).eq("status", "open")
      )
      .first();

    if (branchShift) {
      throw new ConvexError(
        "No puedes eliminar la sucursal mientras tenga un turno abierto."
      );
    }

    const anyShift = await ctx.db
      .query("shifts")
      .withIndex("byBranch", (q) => q.eq("branchId", args.branchId))
      .first();

    if (anyShift) {
      throw new ConvexError(
        "No puedes eliminar la sucursal porque tiene turnos registrados."
      );
    }

    const branchStaff = await ctx.db
      .query("staff")
      .withIndex("byBranch", (q) => q.eq("branchId", args.branchId))
      .first();

    if (branchStaff) {
      throw new ConvexError(
        "No puedes eliminar la sucursal porque tiene personal asignado."
      );
    }

    const inventories = await ctx.db
      .query("branchInventories")
      .withIndex("byBranch", (q) => q.eq("branchId", args.branchId))
      .collect();

    for (const inv of inventories) {
      await ctx.db.delete(inv._id);
    }

    const tables = await ctx.db
      .query("branchTables")
      .withIndex("byBranch", (q) => q.eq("branchId", args.branchId))
      .collect();

    for (const table of tables) {
      await ctx.db.delete(table._id);
    }

    await ctx.db.delete(args.branchId);
  },
});
