import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getById = query({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.userId !== userId) {
      return null;
    }
    return category;
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

    const allCategories = await ctx.db
      .query("categories")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    const sorted = allCategories.sort((a, b) => a.name.localeCompare(b.name));

    // Obtener el total antes de paginar
    const total = sorted.length;

    // Aplicar paginación
    const limit = args.limit ?? 10;
    const offset = args.offset ?? 0;
    const paginatedCategories = sorted.slice(offset, offset + limit);

    return {
      categories: paginatedCategories,
      total,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const existing = await ctx.db
      .query("categories")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), args.name.trim()))
      .first();

    if (existing) {
      throw new ConvexError("Ya existe una categoría con ese nombre.");
    }

    await ctx.db.insert("categories", {
      userId,
      name: args.name.trim(),
    });
  },
});

export const update = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Categoría no encontrada.");
    }
    if (category.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar esta categoría.");
    }

    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new ConvexError("El nombre de la categoría no puede estar vacío.");
    }

    const duplicate = await ctx.db
      .query("categories")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), trimmedName))
      .first();

    if (duplicate && duplicate._id !== args.categoryId) {
      throw new ConvexError("Ya existe una categoría con ese nombre.");
    }

    await ctx.db.patch(args.categoryId, { name: trimmedName });
  },
});

export const remove = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Categoría no encontrada.");
    }
    if (category.userId !== userId) {
      throw new ConvexError("No tienes permiso para eliminar esta categoría.");
    }

    const linkedProduct = await ctx.db
      .query("products")
      .withIndex("categoryId", (q) => q.eq("categoryId", args.categoryId))
      .first();

    if (linkedProduct) {
      throw new ConvexError(
        "No puedes eliminar esta categoría porque hay productos asociados."
      );
    }

    await ctx.db.delete(args.categoryId);
  },
});

