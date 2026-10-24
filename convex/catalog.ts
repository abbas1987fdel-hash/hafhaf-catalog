import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v, ConvexError } from "convex/values";
const fail = (s: string): never => {
  throw new ConvexError(s);
};
async function requireAdmin(ctx: any, token: string) {
  const s = await ctx.db
    .query("sessions")
    .withIndex("token", (q: any) => q.eq("token", token))
    .unique();
  if (!s || s.expires < Date.now()) fail("انتهت الجلسة، سجّل الدخول مجددًا");
}
export const login = mutation({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const now = Date.now();
    let a = await ctx.db
      .query("attempts")
      .withIndex("key", (q) => q.eq("key", "admin"))
      .unique();
    if (a && a.until > now && a.count >= 5)
      return { error: "محاولات كثيرة، انتظر خمس دقائق ثم حاول مجددًا" };
    if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
      if (a)
        await ctx.db.patch(a._id, {
          count: a.until > now ? a.count + 1 : 1,
          until: a.until > now ? a.until : now + 300000,
        });
      else
        await ctx.db.insert("attempts", {
          key: "admin",
          count: 1,
          until: now + 300000,
        });
      return { error: "رمز الدخول غير صحيح" };
    }
    if (a) await ctx.db.delete(a._id);
    const token = crypto.randomUUID() + crypto.randomUUID();
    await ctx.db.insert("sessions", { token, expires: now + 8 * 3600000 });
    return { token };
  },
});
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db
      .query("sessions")
      .withIndex("token", (q) => q.eq("token", token))
      .unique();
    if (s) await ctx.db.delete(s._id);
  },
});
export const catalog = query({
  args: {},
  handler: async (ctx) => {
    const cats = await ctx.db.query("categories").collect();
    const products = await ctx.db.query("products").collect();
    const settings = await ctx.db.query("settings").first();
    return {
      categories: await Promise.all(
        cats.map(async (c) => ({
          ...c,
          imageUrl: await ctx.storage.getUrl(c.image),
        })),
      ),
      products: await Promise.all(
        products.map(async (p) => ({
          ...p,
          imageUrl: await ctx.storage.getUrl(p.image),
        })),
      ),
      settings: settings
        ? {
            ...settings,
            bannerUrl: settings.banner
              ? await ctx.storage.getUrl(settings.banner)
              : null,
          }
        : null,
    };
  },
});
export const uploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return ctx.storage.generateUploadUrl();
  },
});
async function checkImage(ctx: any, id: any) {
  const meta = await ctx.db.system.get(id);
  if (!meta || meta.contentType !== "image/webp" || meta.size > 1500000)
    fail("الصورة يجب أن تكون WebP وبحجم أقل من 1.5 ميغابايت");
}
function clean(s: string, max = 100) {
  s = s.trim();
  if (!s || s.length > max) fail("تحقق من الحقول المطلوبة");
  return s;
}
export const saveCategory = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("categories")),
    name: v.string(),
    phone: v.string(),
    image: v.id("_storage"),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx, a.token);
    await checkImage(ctx, a.image);
    const phone = a.phone.replace(/[^0-9]/g, "");
    if (!/^\d{10,15}$/.test(phone)) fail("أدخل رقم واتساب مع رمز الدولة");
    const data = { name: clean(a.name), phone, image: a.image };
    if (a.id) {
      const old = await ctx.db.get(a.id);
      if (!old) fail("القسم غير موجود");
      await ctx.db.patch(a.id, data);
      if (old.image !== a.image) await ctx.storage.delete(old.image);
    } else await ctx.db.insert("categories", data);
  },
});
export const saveProduct = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("products")),
    category: v.id("categories"),
    title: v.string(),
    price: v.number(),
    quantity: v.optional(v.number()),
    available: v.boolean(),
    image: v.id("_storage"),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx, a.token);
    if (!(await ctx.db.get(a.category))) fail("اختر قسمًا موجودًا");
    await checkImage(ctx, a.image);
    if (!Number.isFinite(a.price) || a.price < 0 || a.price > 1e12)
      fail("السعر غير صحيح");
    if (
      a.quantity !== undefined &&
      (!Number.isInteger(a.quantity) || a.quantity < 0)
    )
      fail("الكمية غير صحيحة");
    const data = {
      category: a.category,
      title: clean(a.title, 160),
      price: a.price,
      quantity: a.quantity,
      available: a.quantity === 0 ? false : a.available,
      image: a.image,
    };
    if (a.id) {
      const old = await ctx.db.get(a.id);
      if (!old) fail("المنتج غير موجود");
      await ctx.db.patch(a.id, data);
      if (old.image !== a.image) await ctx.storage.delete(old.image);
    } else await ctx.db.insert("products", data);
  },
});
export const remove = mutation({
  args: {
    token: v.string(),
    category: v.optional(v.id("categories")),
    product: v.optional(v.id("products")),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx, a.token);
    if (a.category) {
      if (
        await ctx.db
          .query("products")
          .withIndex("category", (q) => q.eq("category", a.category!))
          .first()
      )
        fail("انقل أو احذف منتجات القسم أولًا");
      const c = await ctx.db.get(a.category);
      if (c) {
        await ctx.storage.delete(c.image);
        await ctx.db.delete(c._id);
      }
    } else if (a.product) {
      const p = await ctx.db.get(a.product);
      if (p) {
        await ctx.storage.delete(p.image);
        await ctx.db.delete(p._id);
      }
    }
  },
});
export const saveSettings = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    headline: v.string(),
    subtitle: v.string(),
    banner: v.optional(v.id("_storage")),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx, a.token);
    if (a.banner) await checkImage(ctx, a.banner);
    const old = await ctx.db.query("settings").first();
    const data = {
      name: clean(a.name),
      headline: clean(a.headline, 150),
      subtitle: clean(a.subtitle, 250),
      banner: a.banner,
    };
    if (old) {
      await ctx.db.patch(old._id, data);
      if (old.banner && old.banner !== a.banner)
        await ctx.storage.delete(old.banner);
    } else await ctx.db.insert("settings", data);
  },
});
export const discardUpload = mutation({
  args: { token: v.string(), image: v.id("_storage") },
  handler: async (ctx, a) => {
    await requireAdmin(ctx, a.token);
    const cats = await ctx.db.query("categories").collect();
    const ps = await ctx.db.query("products").collect();
    const s = await ctx.db.query("settings").first();
    if (
      cats.some((c) => c.image === a.image) ||
      ps.some((p) => p.image === a.image) ||
      s?.banner === a.image
    )
      return;
    await ctx.storage.delete(a.image);
  },
});
