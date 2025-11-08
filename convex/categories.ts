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

    const categories = await ctx.db.query("categories").collect();
    return categories.sort((a, b) => a.name.localeCompare(b.name));
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
      .withIndex("name", (q) => q.eq("name", args.name.trim()))
      .first();

    if (existing) {
      throw new ConvexError("Ya existe una categoría con ese nombre.");
    }

    await ctx.db.insert("categories", {
      name: args.name.trim(),
      createdAt: Date.now(),
    });
  },
});

