import { it, expect } from "vitest";
import { sumProducts, type Product } from "../src/types";
it("totals only priced available items and caps quantities at available stock", () => {
  const p = [
    { _id: "a", price: 1000, available: true, quantity: 2 },
    { _id: "b", available: true },
    { _id: "c", price: 500, available: false },
    { _id: "d", price: 250, available: true },
  ] as Product[];
  expect(sumProducts(p, { a: 3, b: 5, c: 4, d: 2 })).toBe(2500);
  expect(sumProducts(p, {})).toBe(0);
  expect(
    sumProducts(
      p.filter((x) => x._id !== "a"),
      { a: 2 },
    ),
  ).toBe(0);
});
