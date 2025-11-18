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
    const sorted = products.sort((a, b) => b._creationTime - a._creationTime);

    return await Promise.all(
      sorted.map(async (product) => {
        const category = await ctx.db.get(product.categoryId);
        const inventories = await ctx.db
          .query("branchInventories")
          .withIndex("byProduct", (q) => q.eq("productId", product._id))
          .collect();

        const stockByBranch = await Promise.all(
          inventories.map(async (inventory) => {
            const branch = await ctx.db.get(inventory.branchId);
            return {
              branchId: inventory.branchId,
              branchName: branch?.name ?? "Sucursal sin nombre",
              stock: inventory.stock,
            };
          })
        );

        const totalStock = stockByBranch.reduce((sum, item) => sum + item.stock, 0);

        const imageUrl = product.image
          ? await ctx.storage.getUrl(product.image)
          : null;

        return {
          ...product,
          categoryName: category?.name ?? "Sin categoría",
          imageUrl,
          totalStock,
          stockByBranch,
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
    unitValue: v.number(),
    stockByBranch: v.array(
      v.object({
        branchId: v.id("branches"),
        stock: v.number(),
      })
    ),
    image: v.optional(v.id("_storage")),
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

    const IGVPercentage = user.IGVPercentage ?? 18; // Default a 18% si no está configurado
    
    // Función para redondear a 2 decimales (centavos)
    const roundToCents = (value: number): number => {
      return Math.round(value * 100) / 100;
    };
    
    const unitValue = roundToCents(args.unitValue);
    const igv = roundToCents((unitValue * IGVPercentage) / 100);
    const price = roundToCents(unitValue + igv);

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

    const { stockByBranch, image, ...productData } = args;

    const productId = await ctx.db.insert("products", {
      ...productData,
      igv,
      price,
      ...(image ? { image } : {}),
    });

    await Promise.all(
      stockByBranch.map((entry) =>
        ctx.db.insert("branchInventories", {
          branchId: entry.branchId,
          productId,
          stock: entry.stock,
        })
      )
    );
  },
});

export const update = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    unitValue: v.number(),
    stockByBranch: v.array(
      v.object({
        branchId: v.id("branches"),
        stock: v.number(),
      })
    ),
    image: v.optional(v.id("_storage")),
    removeImage: v.optional(v.boolean()),
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

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError("Producto no encontrado.");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError("Categoría no encontrada.");
    }

    const IGVPercentage = user.IGVPercentage ?? 18; // Default a 18% si no está configurado
    
    // Función para redondear a 2 decimales (centavos)
    const roundToCents = (value: number): number => {
      return Math.round(value * 100) / 100;
    };
    
    const unitValue = roundToCents(args.unitValue);
    const igv = roundToCents((unitValue * IGVPercentage) / 100);
    const price = roundToCents(unitValue + igv);

    const branchIds = new Set(args.stockByBranch.map((item) => item.branchId));
    if (branchIds.size !== args.stockByBranch.length) {
      throw new ConvexError("No repitas sucursales en el stock actualizado.");
    }

    const branches = await Promise.all(
      args.stockByBranch.map((entry) => ctx.db.get(entry.branchId))
    );

    if (branches.some((branch) => !branch)) {
      throw new ConvexError("Una de las sucursales seleccionadas no existe.");
    }

    let imageField = product.image ?? undefined;

    if (args.image) {
      if (product.image && product.image !== args.image) {
        await ctx.storage.delete(product.image);
      }
      imageField = args.image;
    } else if (args.removeImage && product.image) {
      await ctx.storage.delete(product.image);
      imageField = undefined;
    }

    await ctx.db.patch(args.productId, {
      name: args.name,
      description: args.description,
      categoryId: args.categoryId,
      unitValue,
      igv,
      price,
      ...(imageField !== undefined ? { image: imageField } : { image: undefined }),
    });

    const existingInventories = await ctx.db
      .query("branchInventories")
      .withIndex("byProduct", (q) => q.eq("productId", args.productId))
      .collect();

    const existingByBranch = new Map(
      existingInventories.map((inventory) => [inventory.branchId, inventory])
    );

    const updatedBranchIds = new Set<string>();

    for (const entry of args.stockByBranch) {
      updatedBranchIds.add(entry.branchId as string);
      const existing = existingByBranch.get(entry.branchId);

      if (existing) {
        await ctx.db.patch(existing._id, {
          stock: entry.stock,
        });
      } else {
        await ctx.db.insert("branchInventories", {
          branchId: entry.branchId,
          productId: args.productId,
          stock: entry.stock,
        });
      }
    }

    for (const inventory of existingInventories) {
      if (!updatedBranchIds.has(inventory.branchId as string)) {
        await ctx.db.delete(inventory._id);
      }
    }
  },
});

export const remove = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError("Producto no encontrado.");
    }

    const inventories = await ctx.db
      .query("branchInventories")
      .withIndex("byProduct", (q) => q.eq("productId", args.productId))
      .collect();

    await Promise.all(inventories.map((inventory) => ctx.db.delete(inventory._id)));
    await ctx.db.delete(args.productId);

    if (product.image) {
      await ctx.storage.delete(product.image);
    }
  },
});

