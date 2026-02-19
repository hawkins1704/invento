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

    // Verificar si ya existe un cliente con ese documento para este usuario
    const existing = await ctx.db
      .query("customers")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("documentType"), args.documentType),
          q.eq(q.field("documentNumber"), normalizedDocumentNumber)
        )
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
      userId,
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
      .withIndex("userId", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("documentType"), args.documentType),
          q.eq(q.field("documentNumber"), normalizedDocumentNumber)
        )
      )
      .first();

    return customer;
  },
});

export const update = mutation({
  args: {
    customerId: v.id("customers"),
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

    // Verificar que el cliente existe
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new ConvexError("Cliente no encontrado");
    }
    if (customer.userId !== userId) {
      throw new ConvexError("No tienes permiso para modificar este cliente.");
    }

    // Actualizar el cliente
    await ctx.db.patch(args.customerId, {
      name: args.name.trim(),
      address: args.address?.trim(),
      email: args.email?.trim().toLowerCase(),
      phone: args.phone?.trim(),
    });

    return args.customerId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const customers = await ctx.db
      .query("customers")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    return customers.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listWithStats = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal("name"),
        v.literal("salesCount"),
        v.literal("salesTotal")
      )
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const allCustomers = await ctx.db
      .query("customers")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    const customersWithStats = await Promise.all(
      allCustomers.map(async (customer) => {
        const sales = await ctx.db
          .query("sales")
          .withIndex("byCustomer", (q) => q.eq("customerId", customer._id))
          .filter((q) => q.eq(q.field("status"), "closed"))
          .collect();

        const salesCount = sales.length;
        const salesTotal = sales.reduce((sum, s) => sum + s.total, 0);

        return {
          ...customer,
          salesCount,
          salesTotal,
        };
      })
    );

    const sortBy = args.sortBy ?? "name";
    const sortOrder = args.sortOrder ?? "asc";

    const sorted = [...customersWithStats].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === "salesCount") {
        cmp = a.salesCount - b.salesCount;
      } else {
        cmp = a.salesTotal - b.salesTotal;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const total = sorted.length;
    const limit = args.limit ?? 10;
    const offset = args.offset ?? 0;
    const paginated = sorted.slice(offset, offset + limit);

    return {
      customers: paginated,
      total,
    };
  },
});

