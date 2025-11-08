import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const categories = query({
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
      throw new ConvexError("Sucursal no encontrada.");
    }

    const [categories, products] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db.query("products").collect(),
    ]);

    const productCounts = products.reduce<Record<string, number>>((acc, product) => {
      const key = product.categoryId as unknown as string;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return categories
      .map((category) => ({
        category,
        productCount: productCounts[category._id as unknown as string] ?? 0,
      }))
      .sort((a, b) => a.category.name.localeCompare(b.category.name));
  },
});

export const productsByCategory = query({
  args: {
    branchId: v.id("branches"),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const [branch, category] = await Promise.all([
      ctx.db.get(args.branchId),
      ctx.db.get(args.categoryId),
    ]);

    if (!branch) {
      throw new ConvexError("Sucursal no encontrada.");
    }
    if (!category) {
      throw new ConvexError("Categoría no encontrada.");
    }

    const products = await ctx.db
      .query("products")
      .withIndex("categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    return Promise.all(
      products.map(async (product) => {
        const inventory = await ctx.db
          .query("branchInventories")
          .withIndex("byBranch", (q) =>
            q.eq("branchId", args.branchId).eq("productId", product._id)
          )
          .first();

        return {
          product,
          stock: inventory?.stock ?? 0,
          inventoryId: inventory?._id ?? null,
          imageUrl: (await ctx.storage.getUrl(product.image)) ?? null,
        };
      })
    );
  },
});

export const updateStock = mutation({
  args: {
    branchId: v.id("branches"),
    productId: v.id("products"),
    stock: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new ConvexError("Sucursal no encontrada.");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError("Producto no encontrado.");
    }

    if (args.stock < 0) {
      throw new ConvexError("El inventario no puede ser negativo.");
    }

    const existing = await ctx.db
      .query("branchInventories")
      .withIndex("byBranch", (q) => q.eq("branchId", args.branchId).eq("productId", args.productId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stock: args.stock,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("branchInventories", {
        branchId: args.branchId,
        productId: args.productId,
        stock: args.stock,
        updatedAt: Date.now(),
      });
    }
  },
});

