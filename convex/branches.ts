import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const branches = await ctx.db.query("branches").collect();
    return branches.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    tables: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    if (args.tables < 0) {
      throw new ConvexError("La cantidad de mesas debe ser un número positivo.");
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
      tables: Math.floor(args.tables),
    });
  },
});

export const update = mutation({
  args: {
    branchId: v.id("branches"),
    name: v.string(),
    address: v.string(),
    tables: v.number(),
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

    if (args.tables < 0) {
      throw new ConvexError("La cantidad de mesas debe ser un número positivo.");
    }

    const normalizedName = args.name.trim();
    const existing = await ctx.db
      .query("branches")
      .withIndex("name", (q) => q.eq("name", normalizedName))
      .first();

    if (existing && existing._id !== args.branchId) {
      throw new ConvexError("Ya existe una sucursal con ese nombre.");
    }

    await ctx.db.patch(args.branchId, {
      name: normalizedName,
      address: args.address.trim(),
      tables: Math.floor(args.tables),
    });
  },
});

