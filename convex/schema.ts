import { textStyles } from "./textStyle";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  categoryPins: defineTable({
    category: v.id("categories"),
    code: v.string(),
    version: v.string(),
  }).index("category", ["category"]),
  categoryAccess: defineTable({
    adminSession: v.optional(v.string()),
    category: v.id("categories"),
    token: v.string(),
    version: v.string(),
    expires: v.number(),
  }).index("token", ["token"]),
  categories: defineTable({
    name: v.string(),
    phone: v.string(),
    image: v.id("_storage"),
  }),
  products: defineTable({
    category: v.id("categories"),
    title: v.string(),
    price: v.optional(v.number()),
    quantity: v.optional(v.number()),
    available: v.boolean(),
    image: v.id("_storage"),
  }).index("category", ["category"]),
  settings: defineTable({
    name: v.string(),
    banner: v.optional(v.id("_storage")),
    banners: v.optional(v.array(v.id("_storage"))),
    textStyles: v.optional(textStyles),
    headline: v.string(),
    subtitle: v.string(),
  }),
  sessions: defineTable({ token: v.string(), expires: v.number() }).index(
    "token",
    ["token"],
  ),
  attempts: defineTable({
    key: v.string(),
    count: v.number(),
    until: v.number(),
  }).index("key", ["key"]),
});
