import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    documentType: v.union(v.literal("RUC"), v.literal("DNI")),
    documentNumber: v.string(),
    name: v.string(),
    address: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    // Normalizar número de documento
    const normalizedDocumentNumber = args.documentNumber.trim();

    if (!normalizedDocumentNumber) {
      throw new ConvexError("El número de documento es requerido.");
    }

    // Verificar si ya existe un cliente con ese documento
    const existing = await ctx.db
      .query("customers")
      .withIndex("byDocument", (q) =>
        q.eq("documentType", args.documentType).eq("documentNumber", normalizedDocumentNumber)
      )
      .first();

    if (existing) {
      // Si existe, actualizar en lugar de crear
      await ctx.db.patch(existing._id, {
        name: args.name.trim(),
        address: args.address?.trim(),
        email: args.email?.trim().toLowerCase(),
        phone: args.phone?.trim(),
      });
      return existing._id;
    }

    // Crear nuevo cliente
    const customerId = await ctx.db.insert("customers", {
      documentType: args.documentType,
      documentNumber: normalizedDocumentNumber,
      name: args.name.trim(),
      address: args.address?.trim(),
      email: args.email?.trim().toLowerCase(),
      phone: args.phone?.trim(),
    });

    return customerId;
  },
});

export const getByDocument = query({
  args: {
    documentType: v.union(v.literal("RUC"), v.literal("DNI")),
    documentNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const normalizedDocumentNumber = args.documentNumber.trim();

    const customer = await ctx.db
      .query("customers")
      .withIndex("byDocument", (q) =>
        q.eq("documentType", args.documentType).eq("documentNumber", normalizedDocumentNumber)
      )
      .first();

    return customer;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const customers = await ctx.db.query("customers").collect();
    return customers.sort((a, b) => a.name.localeCompare(b.name));
  },
});

