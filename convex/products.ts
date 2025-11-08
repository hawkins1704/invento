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

    const products = await ctx.db.query("products").collect();
    const sorted = products.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      sorted.map(async (product) => {
        const category = await ctx.db.get(product.categoryId);
        const inventories = await ctx.db
          .query("branchInventories")
          .withIndex("byProduct", (q) => q.eq("productId", product._id))
          .collect();

        const totalStock = inventories.reduce((sum, item) => sum + item.stock, 0);

        return {
          ...product,
          categoryName: category?.name ?? "Sin categoría",
          imageUrl: (await ctx.storage.getUrl(product.image)) ?? null,
          totalStock,
        };
      })
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    price: v.number(),
    stockByBranch: v.array(
      v.object({
        branchId: v.id("branches"),
        stock: v.number(),
      })
    ),
    image: v.id("_storage"),
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

    const branchIds = new Set(args.stockByBranch.map((item) => item.branchId));
    if (branchIds.size !== args.stockByBranch.length) {
      throw new ConvexError("No repitas sucursales en el stock inicial.");
    }

    const branches = await Promise.all(
      args.stockByBranch.map((entry) => ctx.db.get(entry.branchId))
    );

    if (branches.some((branch) => !branch)) {
      throw new ConvexError("Una de las sucursales seleccionadas no existe.");
    }

    const { stockByBranch, ...productData } = args;

    const productId = await ctx.db.insert("products", {
      ...productData,
      createdAt: Date.now(),
    });

    await Promise.all(
      stockByBranch.map((entry) =>
        ctx.db.insert("branchInventories", {
          branchId: entry.branchId,
          productId,
          stock: entry.stock,
          updatedAt: Date.now(),
        })
      )
    );
  },
});

