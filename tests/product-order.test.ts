import { it, expect } from "vitest";
import { newestFirst, type Product } from "../src/types";
it("shows newly created products first regardless of title or edits", () => {
  const older = {
    _id: "old",
    _creationTime: 100,
    title: "أحدث عنوان بعد تعديل",
  } as Product;
  const newer = { _id: "new", _creationTime: 200, title: "ياسمين" } as Product;
  expect([older, newer].sort(newestFirst).map((p) => p._id)).toEqual([
    "new",
    "old",
  ]);
  older.title = "أ";
  expect([older, newer].sort(newestFirst)[0]).toBe(newer);
});
