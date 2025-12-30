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
    administratorCode: v.string(),
    salesCode: v.string(),
    inventoryCode: v.string(),
    IGVPercentage: v.optional(v.union(v.literal(10), v.literal(18))),
    personaId: v.optional(v.string()),
    personaToken: v.optional(v.string()),
    companyName: v.optional(v.string()),
    companyCommercialName: v.optional(v.string()),
    ruc: v.optional(v.string()),
    companyLogo: v.optional(v.id("_storage")),
    companyAddress: v.optional(v.string()),
    companyDistrict: v.optional(v.string()),
    companyProvince: v.optional(v.string()),
    companyDepartment: v.optional(v.string()),
    printFormat: v.optional(v.union(v.literal("A4"), v.literal("A5"), v.literal("ticket58mm"), v.literal("ticket80mm"))),
    subscriptionType: v.optional(v.union(v.literal("starter"), v.literal("negocio"), v.literal("pro"))),
  }).index("email", ["email"]),
  products: defineTable({
    name: v.string(),
    description: v.string(),
    unitValue: v.optional(v.number()),
    igv: v.optional(v.number()),
    price: v.number(),
    image: v.optional(v.id("_storage")),
    categoryId: v.id("categories"),
    inventoryActivated: v.optional(v.boolean()),
    allowNegativeSale: v.optional(v.boolean()),
  }).index("categoryId", ["categoryId"]),
  categories: defineTable({
    name: v.string(),
  }).index("name", ["name"]),
  branches: defineTable({
    name: v.string(),
    address: v.string(),
    serieBoleta: v.optional(v.string()),
    serieFactura: v.optional(v.string()),
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
    customerId: v.optional(v.id("customers")),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("cancelled")
    ),
    openedAt: v.number(),
    closedAt: v.optional(v.number()),
    subtotal: v.number(),
    total: v.number(),
    paymentMethod: v.optional(
      v.union(
        v.literal("Contado"),
        v.literal("Tarjeta"),
        v.literal("Transferencia"),
        v.literal("Otros")
      )
    ),
    notes: v.optional(v.string()),
    documentId: v.optional(v.string()),
    documentType: v.optional(v.union(v.literal("01"), v.literal("03"))),
    updatedAt: v.number(),
  })
    .index("byBranchStatus", ["branchId", "status", "openedAt"])
    .index("byClosedAt", ["closedAt"])
    .index("byStaff", ["staffId", "status"]),
  saleItems: defineTable({
    saleId: v.id("sales"),
    productId: v.id("products"),
    productName: v.optional(v.string()),
    quantity: v.number(),
    unitPrice: v.number(),
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
  customers: defineTable({
    documentType: v.union(v.literal("RUC"), v.literal("DNI")),
    documentNumber: v.string(),
    name: v.string(),
    address: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  })
    .index("byDocument", ["documentType", "documentNumber"]),
})