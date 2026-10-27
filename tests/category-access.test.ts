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
  const cats = (await t.query(api.catalog, {})).categories;
  const grants = [];
  for (const [i, c] of cats.entries()) {
    const grant = await t.mutation(api.unlockCategory, {
      adminToken: token,
      category: c._id,
      code: i ? "9371" : "4826",
    });
    grants.push(grant.token);
    await t.mutation(api.saveProduct, {
      token,
      categoryToken: grant.token,
      category: c._id,
      title: "منتج " + c.name,
      price: 100,
      image: img,
      available: true,
    });
  }
  return { t, token, cats, img, grants };
}
it("public shoppers see every product but no category credentials, even with admin session", async () => {
  const { t, token } = await setup();
  for (const args of [{}, { adminToken: token }]) {
    const d = await t.query(api.catalog, args);
    expect(d.products).toHaveLength(2);
    expect(d.categories.every((c: any) => !c.locked && c.protected)).toBe(true);
    expect(JSON.stringify(d)).not.toContain("4826");
    expect(JSON.stringify(d)).not.toContain("9371");
  }
});
it("requires master admin and correct category PIN; denies unscoped writes and cross-category grants", async () => {
  const { t, token, cats, img, grants } = await setup();
  await expect(
    t.mutation(api.unlockCategory, {
      adminToken: "invalid",
      category: cats[0]._id,
      code: "4826",
    }),
  ).rejects.toThrow();
  const write = {
    token,
    category: cats[1]._id,
    title: "x",
    price: 1,
    image: img,
    available: true,
  };
  await expect(t.mutation(api.saveProduct, write)).rejects.toThrow("رمز القسم");
  await expect(
    t.mutation(api.saveProduct, { ...write, categoryToken: grants[0] }),
  ).rejects.toThrow("رمز القسم");
  await t.mutation(api.saveProduct, { ...write, categoryToken: grants[1] });
  const d = await t.query(api.catalog, {});
  await expect(
    t.mutation(api.remove, { token, product: d.products[0]._id }),
  ).rejects.toThrow("رمز القسم");
});
it("binds grants to admin session and revokes them on code changes", async () => {
  const { t, token, cats, img, grants } = await setup();
  const second = await t.mutation(api.login, { pin: "test-admin" });
  const args = {
    token: second.token,
    categoryToken: grants[0],
    id: cats[0]._id,
    name: cats[0].name,
    phone: cats[0].phone,
    image: img,
    accessCode: "5557",
  };
  await expect(t.mutation(api.saveCategory, args)).rejects.toThrow("رمز القسم");
  await t.mutation(api.saveCategory, { ...args, token });
  await expect(
    t.mutation(api.saveCategory, { ...args, token }),
  ).rejects.toThrow("رمز القسم");
  const changed = await t.mutation(api.unlockCategory, {
    adminToken: token,
    category: cats[0]._id,
    code: "5557",
  });
  expect(changed.accessCode).toBe("5557");
  expect((await t.query(api.catalog, {})).products).toHaveLength(2);
});
it("expires grants and rate limits repeated wrong category PINs", async () => {
  const { t, token, cats, img, grants } = await setup();
  await t.run(async (ctx) => {
    const a = await ctx.db.query("categoryAccess").first();
    await ctx.db.patch(a!._id, { expires: 1 });
  });
  await expect(
    t.mutation(api.saveProduct, {
      token,
      categoryToken: grants[0],
      category: cats[0]._id,
      title: "x",
      price: 1,
      image: img,
      available: true,
    }),
  ).rejects.toThrow();
  for (let i = 0; i < 5; i++)
    await t.mutation(api.unlockCategory, {
      adminToken: token,
      category: cats[1]._id,
      code: "wrong",
    });
  expect(
    (
      await t.mutation(api.unlockCategory, {
        adminToken: token,
        category: cats[1]._id,
        code: "9371",
      })
    ).error,
  ).toContain("خمس دقائق");
});
it("requires a PIN for new sections and rejects moving products between sections", async () => {
  const { t, token, cats, img, grants } = await setup();
  await expect(
    t.mutation(api.saveCategory, {
      token,
      name: "new",
      phone: "9647700000000",
      image: img,
    }),
  ).rejects.toThrow("رمز");
  const p = (await t.query(api.catalog, {})).products[0];
  await expect(
    t.mutation(api.saveProduct, {
      token,
      categoryToken: grants[1],
      id: p._id,
      category: cats[1]._id,
      title: p.title,
      price: 1,
      image: img,
      available: true,
    }),
  ).rejects.toThrow("نقل");
});
it("preserves existing banner when editing text; supports ordered banners and removes only omitted files", async () => {
  const { t, token } = await setup();
  const upload = () =>
    t.run((ctx) =>
      ctx.storage.store(new Blob(["banner"], { type: "image/webp" })),
    );
  const a = await upload(),
    b = await upload();
  const base = { token, name: "متجر", headline: "إعلان", subtitle: "نص" };
  await t.mutation(api.saveSettings, { ...base, banner: a });
  await t.mutation(api.saveSettings, base);
  expect((await t.query(api.catalog, {})).settings.banners).toEqual([a]);
  await t.mutation(api.saveSettings, { ...base, banners: [b, a] });
  expect((await t.query(api.catalog, {})).settings.banners).toEqual([b, a]);
  await t.mutation(api.discardUpload, { token, image: a });
  expect(await t.run((ctx) => ctx.storage.getUrl(a))).toBeTruthy();
  await t.mutation(api.saveSettings, { ...base, banners: [b] });
  expect(await t.run((ctx) => ctx.db.system.get(a))).toBeNull();
  expect((await t.query(api.catalog, {})).settings.bannerUrls).toHaveLength(1);
});
