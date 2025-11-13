import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    administratorCode: v.optional(v.string()),
    salesCode: v.optional(v.string()),
  }).index("email", ["email"]),
  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    image: v.optional(v.id("_storage")),
    categoryId: v.id("categories"),
  }).index("categoryId", ["categoryId"]),
  categories: defineTable({
    name: v.string(),
  }).index("name", ["name"]),
  branches: defineTable({
    name: v.string(),
    address: v.string(),
  }).index("name", ["name"]),
  branchInventories: defineTable({
    branchId: v.id("branches"),
    productId: v.id("products"),
    stock: v.number(),
  })
    .index("byBranch", ["branchId", "productId"])
    .index("byProduct", ["productId", "branchId"]),
  branchTables: defineTable({
    branchId: v.id("branches"),
    label: v.string(),
    capacity: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("occupied"),
        v.literal("reserved"),
        v.literal("out_of_service")
      )
    ),
    currentSaleId: v.optional(v.id("sales")),
  })
    .index("byBranch", ["branchId", "label"])
    .index("byCurrentSale", ["currentSaleId"]),
  staff: defineTable({
    branchId: v.id("branches"),
    name: v.string(),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    active: v.boolean(),
    userId: v.optional(v.id("users")),
  })
    .index("byBranch", ["branchId"])
    .index("byUser", ["userId"]),
  sales: defineTable({
    branchId: v.id("branches"),
    tableId: v.optional(v.id("branchTables")),
    staffId: v.optional(v.id("staff")),
    creatorUserId: v.optional(v.id("users")),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("cancelled")
    ),
    openedAt: v.number(),
    closedAt: v.optional(v.number()),
    subtotal: v.number(),
    discounts: v.optional(v.number()),
    total: v.number(),
    paymentMethod: v.optional(
      v.union(
        v.literal("cash"),
        v.literal("card"),
        v.literal("transfer"),
        v.literal("other")
      )
    ),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("byBranchStatus", ["branchId", "status", "openedAt"])
    .index("byClosedAt", ["closedAt"])
    .index("byStaff", ["staffId", "status"]),
  saleItems: defineTable({
    saleId: v.id("sales"),
    productId: v.id("products"),
    quantity: v.number(),
    unitPrice: v.number(),
    discountAmount: v.optional(v.number()),
    totalPrice: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("bySale", ["saleId"]),
  shifts: defineTable({
    branchId: v.id("branches"),
    staffId: v.optional(v.id("staff")),
    openedAt: v.number(),
    closedAt: v.optional(v.number()),
    openingCash: v.number(),
    closingExpectedCash: v.optional(v.number()),
    closingActualCash: v.optional(v.number()),
    closingDiff: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed")),
    updatedAt: v.number(),
  })
    .index("byBranchStatus", ["branchId", "status", "openedAt"])
    .index("byBranch", ["branchId", "openedAt"])
    .index("byStaff", ["staffId", "openedAt"]),
})