import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("Usuario no encontrado");
    }

    const companyLogoUrl = user.companyLogo
      ? await ctx.storage.getUrl(user.companyLogo)
      : null;

    return {
      ...user,
      companyLogoUrl,
    };
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

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    administratorCode: v.optional(v.string()),
    salesCode: v.optional(v.string()),
    companyName: v.optional(v.string()),
    ruc: v.optional(v.string()),
    companyLogo: v.optional(v.id("_storage")),
    removeCompanyLogo: v.optional(v.boolean()),
    personaId: v.optional(v.string()),
    personaToken: v.optional(v.string()),
    serieBoleta: v.optional(v.string()),
    serieFactura: v.optional(v.string()),
    IGVPercentage: v.optional(v.union(v.literal(10), v.literal(18))),
    companyCommercialName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyDistrict: v.optional(v.string()),
    companyProvince: v.optional(v.string()),
    companyDepartment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("Usuario no encontrado");
    }

    let companyLogoField = user.companyLogo ?? undefined;

    if (args.companyLogo) {
      if (user.companyLogo && user.companyLogo !== args.companyLogo) {
        await ctx.storage.delete(user.companyLogo);
      }
      companyLogoField = args.companyLogo;
    } else if (args.removeCompanyLogo && user.companyLogo) {
      await ctx.storage.delete(user.companyLogo);
      companyLogoField = undefined;
    }

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) {
      updates.name = args.name.trim() || undefined;
    }
    if (args.administratorCode !== undefined) {
      updates.administratorCode = args.administratorCode.trim() || undefined;
    }
    if (args.salesCode !== undefined) {
      updates.salesCode = args.salesCode.trim() || undefined;
    }
    if (args.companyName !== undefined) {
      updates.companyName = args.companyName.trim() || undefined;
    }
    if (args.ruc !== undefined) {
      updates.ruc = args.ruc.trim() || undefined;
    }
    if (companyLogoField !== undefined) {
      updates.companyLogo = companyLogoField;
    }
    if (args.personaId !== undefined) {
      updates.personaId = args.personaId.trim() || undefined;
    }
    if (args.personaToken !== undefined) {
      updates.personaToken = args.personaToken.trim() || undefined;
    }
    if (args.serieBoleta !== undefined) {
      updates.serieBoleta = args.serieBoleta.trim() || undefined;
    }
    if (args.serieFactura !== undefined) {
      updates.serieFactura = args.serieFactura.trim() || undefined;
    }
    if (args.IGVPercentage !== undefined) {
      updates.IGVPercentage = args.IGVPercentage;
    }
    if (args.companyName !== undefined) {
      updates.companyName = args.companyName.trim() || undefined;
    }
    if (args.companyCommercialName !== undefined) {
      updates.companyCommercialName = args.companyCommercialName.trim() || undefined;
    }
    if (args.companyAddress !== undefined) {
      updates.companyAddress = args.companyAddress.trim() || undefined;
    }
    if (args.companyDistrict !== undefined) {
      updates.companyDistrict = args.companyDistrict.trim() || undefined;
    }
    if (args.companyProvince !== undefined) {
      updates.companyProvince = args.companyProvince.trim() || undefined;
    }
    if (args.companyDepartment !== undefined) {
      updates.companyDepartment = args.companyDepartment.trim() || undefined;
    }

    await ctx.db.patch(userId, updates);
  },
});

