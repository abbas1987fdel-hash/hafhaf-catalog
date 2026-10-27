import { describe, it, expect, beforeEach, vi } from "vitest";
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "../convex/schema";
import { phoneNumber, whatsapp } from "../src/types";
const modules = import.meta.glob("../convex/**/*.ts");
const api = anyApi.catalog;
beforeEach(() => {
  vi.stubEnv("ADMIN_PIN", "test-only-83729");
});
async function authorized() {
  const t = convexTest(schema, modules);
  const { token } = await t.mutation(api.login, { pin: "test-only-83729" });
  return { t, token };
}
async function image(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.storage.store(new Blob(["image"], { type: "image/webp" })),
  );
}
describe("admin authorization", () => {
  it("rejects anonymous writes and upload URLs", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.uploadUrl, { token: "invalid" }),
    ).rejects.toThrow("انتهت الجلسة");
    await expect(
      t.mutation(api.saveSettings, {
        token: "invalid",
        name: "x",
        headline: "x",
        subtitle: "x",
      }),
    ).rejects.toThrow();
  });
  it("limits bad PIN attempts and stores no session for wrong PIN", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 5; i++)
      expect((await t.mutation(api.login, { pin: "bad" })).error).toBeTruthy();
    expect(
      (await t.mutation(api.login, { pin: "test-only-83729" })).error,
    ).toContain("خمس دقائق");
    expect(
      await t.run((ctx) => ctx.db.query("sessions").collect()),
    ).toHaveLength(0);
  });
  it("revokes sessions on logout", async () => {
    const { t, token } = await authorized();
    await t.mutation(api.logout, { token });
    await expect(t.mutation(api.uploadUrl, { token })).rejects.toThrow();
  });
  it("rejects expired sessions", async () => {
    const { t, token } = await authorized();
    await t.run(async (ctx) => {
      const s = await ctx.db.query("sessions").first();
      await ctx.db.patch(s!._id, { expires: 1 });
    });
    await expect(t.mutation(api.uploadUrl, { token })).rejects.toThrow();
  });
});
describe("catalog workflows", () => {
  it("publishes category, optional quantity, price and availability to public catalog", async () => {
    const { t, token } = await authorized();
    const img = await image(t);
    await t.run((ctx) =>
      ctx.db.insert("categories", {
        name: "الأجهزة",
        phone: "9647700000000",
        image: img,
      }),
    );
    const c = (await t.query(api.catalog, {})).categories[0];
    await t.mutation(api.saveProduct, {
      token,
      category: c._id,
      title: "غلاية",
      price: 25000,
      available: true,
      image: await image(t),
    });
    let d = await t.query(api.catalog, {});
    expect(d.products[0].price).toBe(25000);
    expect(d.products[0].quantity).toBeUndefined();
    expect(d.products[0].available).toBe(true);
    const p = d.products[0];
    await t.mutation(api.saveProduct, {
      token,
      id: p._id,
      category: c._id,
      title: p.title,
      price: p.price,
      image: p.image,
      available: true,
      quantity: 0,
    });
    d = await t.query(api.catalog, {});
    expect(d.products[0].available).toBe(false);
    await expect(
      t.mutation(api.remove, { token, category: c._id }),
    ).rejects.toThrow("منتجات");
    await t.mutation(api.remove, { token, product: p._id });
    await t.mutation(api.remove, { token, category: c._id });
    expect((await t.query(api.catalog, {})).categories).toHaveLength(0);
  });
  it("rejects non-WebP images and invalid prices or quantities", async () => {
    const { t, token } = await authorized();
    const bad = await t.run((ctx) =>
      ctx.storage.store(new Blob(["bad"], { type: "text/html" })),
    );
    await expect(
      t.mutation(api.saveCategory, {
        token,
        name: "test",
        phone: "9647700000000",
        image: bad,
        accessCode: "4321",
      }),
    ).rejects.toThrow("WebP");
    const img = await image(t);
    await t.run((ctx) =>
      ctx.db.insert("categories", {
        name: "test",
        phone: "9647700000000",
        image: img,
      }),
    );
    const c = (await t.query(api.catalog, {})).categories[0];
    const args = {
      token,
      category: c._id,
      title: "product",
      image: img,
      available: true,
    };
    await expect(
      t.mutation(api.saveProduct, { ...args, price: -10 }),
    ).rejects.toThrow("السعر");
    await expect(
      t.mutation(api.saveProduct, { ...args, price: 100, quantity: -1 }),
    ).rejects.toThrow("الكمية");
  });
  it("updates banner settings without exposing PIN", async () => {
    const { t, token } = await authorized();
    await t.mutation(api.saveSettings, {
      token,
      name: "متجر مجمع الهفهاف",
      headline: "جديدنا",
      subtitle: "منتجات جديدة",
      banner: await image(t),
    });
    const d = await t.query(api.catalog, {});
    expect(d.settings.name).toBe("متجر مجمع الهفهاف");
    expect(d.settings.bannerUrl).toBeTruthy();
    expect(JSON.stringify(d)).not.toContain("test-only-83729");
  });
  it("normalizes Iraqi WhatsApp number and encodes message", () => {
    expect(phoneNumber("0770 000 0000")).toBe("9647700000000");
    expect(whatsapp("+9647700000000", "هل متوفر؟")).toContain(
      encodeURIComponent("هل متوفر؟"),
    );
  });
});

it("supports missing prices and clearing an existing price", async () => {
  const { t, token } = await authorized();
  const img = await image(t);
  const category = await t.run((ctx) =>
    ctx.db.insert("categories", {
      name: "Test",
      phone: "9647700000000",
      image: img,
    }),
  );
  const args = {
    token,
    category,
    title: "No price",
    image: img,
    available: true,
  };
  await t.mutation(api.saveProduct, args);
  let p = (await t.query(api.catalog, {})).products[0];
  expect(p.price).toBeUndefined();
  await t.mutation(api.saveProduct, { ...args, id: p._id, price: 0 });
  p = (await t.query(api.catalog, {})).products[0];
  expect(p.price).toBe(0);
  await t.mutation(api.saveProduct, { ...args, id: p._id });
  expect((await t.query(api.catalog, {})).products[0].price).toBeUndefined();
});
it("stores text styling, preserves it for older clients, and rejects invalid styling", async () => {
  const { t, token } = await authorized();
  const style = { color: "#123abc", size: 24, decoration: "bold" };
  const args = { token, name: "Store", headline: "Headline", subtitle: "Text" };
  const textStyles = { name: style, headline: style, subtitle: style };
  await t.mutation(api.saveSettings, { ...args, textStyles });
  await t.mutation(api.saveSettings, args);
  expect((await t.query(api.catalog, {})).settings.textStyles).toEqual(
    textStyles,
  );
  await expect(
    t.mutation(api.saveSettings, {
      ...args,
      textStyles: { ...textStyles, headline: { ...style, size: 999 } },
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.saveSettings, {
      ...args,
      textStyles: { ...textStyles, name: { ...style, color: "url(bad)" } },
    }),
  ).rejects.toThrow();
});
