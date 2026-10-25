import { it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "../convex/schema";
const modules = import.meta.glob("../convex/**/*.ts");
const api = anyApi.catalog;
async function setup() {
  vi.stubEnv("ADMIN_PIN", "test-admin");
  const t = convexTest(schema, modules);
  const { token } = await t.mutation(api.login, { pin: "test-admin" });
  const img = await t.run((ctx) =>
    ctx.storage.store(new Blob(["image"], { type: "image/webp" })),
  );
  for (const name of ["قسم أ", "قسم ب"])
    await t.mutation(api.saveCategory, {
      token,
      name,
      phone: "9647700000000",
      image: img,
      accessCode: name === "قسم أ" ? "4826" : "9371",
    });
  const cats = (await t.query(api.catalog, { adminToken: token })).categories;
  for (const c of cats)
    await t.mutation(api.saveProduct, {
      token,
      category: c._id,
      title: "منتج " + c.name,
      price: 100,
      image: img,
      available: true,
    });
  return { t, token, cats, img };
}
it("hides protected products, image URLs and codes from anonymous or forged sessions", async () => {
  const { t } = await setup();
  const d = await t.query(api.catalog, {
    adminToken: "forged",
    accessTokens: ["forged"],
  });
  expect(d.products).toHaveLength(0);
  expect(d.categories.every((c: any) => c.locked)).toBe(true);
  expect(JSON.stringify(d)).not.toContain("4826");
  expect(JSON.stringify(d)).not.toContain("9371");
  expect(d.categories[0].productCount).toBe(1);
});
it("only unlocks the requested category and does not grant admin writes", async () => {
  const { t, cats } = await setup();
  expect(
    (
      await t.mutation(api.unlockCategory, {
        category: cats[0]._id,
        code: "wrong",
      })
    ).error,
  ).toBeTruthy();
  const { token } = await t.mutation(api.unlockCategory, {
    category: cats[0]._id,
    code: "4826",
  });
  const d = await t.query(api.catalog, { accessTokens: [token] });
  expect(d.products).toHaveLength(1);
  expect(d.products[0].category).toBe(cats[0]._id);
  await expect(t.mutation(api.uploadUrl, { token })).rejects.toThrow();
  expect(d.categories[0].accessCode).toBeUndefined();
});
it("changing category code revokes old grants while admin retains access", async () => {
  const { t, token, cats, img } = await setup();
  const grant = await t.mutation(api.unlockCategory, {
    category: cats[0]._id,
    code: "4826",
  });
  await t.mutation(api.saveCategory, {
    token,
    id: cats[0]._id,
    name: cats[0].name,
    phone: cats[0].phone,
    image: img,
    accessCode: "5557",
  });
  expect(
    (await t.query(api.catalog, { accessTokens: [grant.token] })).products,
  ).toHaveLength(0);
  const admin = await t.query(api.catalog, { adminToken: token });
  expect(admin.products).toHaveLength(2);
  expect(admin.categories[0].accessCode).toBe("5557");
});
it("expires category grants and limits repeated wrong codes", async () => {
  const { t, cats } = await setup();
  const grant = await t.mutation(api.unlockCategory, {
    category: cats[0]._id,
    code: "4826",
  });
  await t.run(async (ctx) => {
    const a = await ctx.db.query("categoryAccess").first();
    await ctx.db.patch(a!._id, { expires: 1 });
  });
  expect(
    (await t.query(api.catalog, { accessTokens: [grant.token] })).products,
  ).toHaveLength(0);
  for (let i = 0; i < 5; i++)
    await t.mutation(api.unlockCategory, {
      category: cats[1]._id,
      code: "wrong",
    });
  expect(
    (
      await t.mutation(api.unlockCategory, {
        category: cats[1]._id,
        code: "9371",
      })
    ).error,
  ).toContain("خمس دقائق");
});
