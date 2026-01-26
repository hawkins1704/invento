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
    return branch ?? null;
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

    const allBranches = await ctx.db.query("branches").collect();
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

    const existing = await ctx.db
      .query("branches")
      .withIndex("name", (q) => q.eq("name", args.name.trim()))
      .first();

    if (existing) {
      throw new ConvexError("Ya existe una sucursal con ese nombre.");
    }

    await ctx.db.insert("branches", {
      name: args.name.trim(),
      address: args.address.trim(),
      correlativoBoleta: 1,
      correlativoFactura: 1,
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

    const normalizedName = args.name.trim();
    const existing = await ctx.db
      .query("branches")
      .withIndex("name", (q) => q.eq("name", normalizedName))
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

    const updates: Record<string, unknown> = {};
    if (args.documentType === "03") {
      updates.correlativoBoleta = args.correlativo;
    } else {
      updates.correlativoFactura = args.correlativo;
    }

    await ctx.db.patch(args.branchId, updates);
  },
});

