import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const verifyAreaCode = query({
  args: {
    area: v.union(v.literal("admin"), v.literal("sales")),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return { valid: false, reason: "notConfigured" as const };
    }

    const normalizedCode = args.code.trim();

    if (!normalizedCode) {
      return { valid: false, reason: "missing" as const };
    }

    const administratorCode = user.administratorCode?.trim() ?? null;
    const salesCode = user.salesCode?.trim() ?? null;

    const expectedCode = args.area === "admin" ? administratorCode : salesCode;

    if (!expectedCode) {
      return { valid: false, reason: "notConfigured" as const };
    }

    const matches = expectedCode === normalizedCode;
    return {
      valid: matches,
      reason: matches ? undefined : ("mismatch" as const),
    };
  },
});

