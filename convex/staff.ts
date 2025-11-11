import { mutation, query } from "./_generated/server"
import { v, ConvexError } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

const normalize = (value: string) => value.trim()

export const list = query({
  args: {
    branchId: v.optional(v.id("branches")),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const includeInactive = args.includeInactive ?? false
    const staffQuery = args.branchId
      ? ctx.db.query("staff").withIndex("byBranch", (q) => q.eq("branchId", args.branchId))
      : ctx.db.query("staff")

    const result = await staffQuery.collect()

    return result
      .filter((member) => includeInactive || member.active)
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const create = mutation({
  args: {
    branchId: v.id("branches"),
    name: v.string(),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const branch = await ctx.db.get(args.branchId)
    if (!branch) {
      throw new ConvexError("La sucursal no existe.")
    }

    const normalizedName = normalize(args.name)
    if (!normalizedName) {
      throw new ConvexError("El nombre del personal no puede estar vacío.")
    }

    const normalizedEmail = args.email ? args.email.trim().toLowerCase() : undefined

    if (normalizedEmail) {
      const duplicate = await ctx.db
        .query("staff")
        .filter((q) => q.eq(q.field("email"), normalizedEmail))
        .first()

      if (duplicate) {
        throw new ConvexError("Ya existe un miembro del personal con ese correo.")
      }
    }

    await ctx.db.insert("staff", {
      branchId: args.branchId,
      name: normalizedName,
      role: args.role ? normalize(args.role) : undefined,
      phone: args.phone?.trim(),
      email: normalizedEmail,
      active: true,
      userId: args.userId,
    })
  },
})

export const update = mutation({
  args: {
    staffId: v.id("staff"),
    branchId: v.id("branches"),
    name: v.string(),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    active: v.boolean(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const staffMember = await ctx.db.get(args.staffId)
    if (!staffMember) {
      throw new ConvexError("El miembro del personal no existe.")
    }

    const branch = await ctx.db.get(args.branchId)
    if (!branch) {
      throw new ConvexError("La sucursal no existe.")
    }

    const normalizedName = normalize(args.name)
    if (!normalizedName) {
      throw new ConvexError("El nombre del personal no puede estar vacío.")
    }

    const normalizedEmail = args.email ? args.email.trim().toLowerCase() : undefined
    const branchChanged = staffMember.branchId !== args.branchId
    if (normalizedEmail) {
      const duplicate = await ctx.db
        .query("staff")
        .filter((q) => q.eq(q.field("email"), normalizedEmail))
        .first()

      if (duplicate && duplicate._id !== args.staffId) {
        throw new ConvexError("Ya existe un miembro del personal con ese correo.")
      }
    }

    if (!args.active || branchChanged) {
      const openSale = await ctx.db
        .query("sales")
        .withIndex("byStaff", (q) =>
          q.eq("staffId", args.staffId).eq("status", "open")
        )
        .first()

      if (openSale) {
        throw new ConvexError(
          branchChanged
            ? "No puedes cambiar la sucursal porque el personal tiene ventas abiertas."
            : "No puedes desactivar al personal porque tiene ventas abiertas asignadas."
        )
      }
    }

    await ctx.db.patch(args.staffId, {
      branchId: args.branchId,
      name: normalizedName,
      role: args.role ? normalize(args.role) : undefined,
      phone: args.phone?.trim(),
      email: normalizedEmail,
      active: args.active,
      userId: args.userId,
    })
  },
})

export const remove = mutation({
  args: {
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError("No autenticado")
    }

    const staffMember = await ctx.db.get(args.staffId)
    if (!staffMember) {
      throw new ConvexError("El miembro del personal no existe.")
    }

    const relatedSale = await ctx.db
      .query("sales")
      .withIndex("byStaff", (q) => q.eq("staffId", args.staffId).eq("status", "open"))
      .first()

    if (relatedSale) {
      throw new ConvexError(
        "No puedes eliminar al personal porque tiene ventas abiertas asignadas."
      )
    }

    await ctx.db.delete(args.staffId)
  },
})


