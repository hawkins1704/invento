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
    image: v.id("_storage"),
    categoryId: v.id("categories"),
    createdAt: v.number(),
  }).index("categoryId", ["categoryId"]),
  categories: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }).index("name", ["name"]),
  branches: defineTable({
    name: v.string(),
    address: v.string(),
    tables: v.number(),
    createdAt: v.number(),
  }).index("name", ["name"]),
  branchInventories: defineTable({
    branchId: v.id("branches"),
    productId: v.id("products"),
    stock: v.number(),
    updatedAt: v.number(),
  })
    .index("byBranch", ["branchId", "productId"])
    .index("byProduct", ["productId", "branchId"]),
})