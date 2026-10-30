import type { CSSProperties } from "react";
export type Category = {
  protected?: boolean;
  locked?: boolean;
  accessCode?: string;
  productCount?: number;
  _id: string;
  name: string;
  phone: string;
  image: string;
  imageUrl: string | null;
};
export type Product = {
  _creationTime?: number;
  _id: string;
  category: string;
  title: string;
  price?: number;
  quantity?: number;
  available: boolean;
  image: string;
  imageUrl: string | null;
};
export type TextStyle = {
  color: string;
  size: number;
  decoration: "plain" | "bold" | "italic" | "underline" | "shadow";
};
export type Settings = {
  bannerSeconds?: number;
  textStyles?: Record<"name" | "headline" | "subtitle", TextStyle>;
  name: string;
  headline: string;
  subtitle: string;
  banner?: string;
  banners?: string[];
  bannerUrls?: string[];
  bannerUrl?: string | null;
};
export type Catalog = {
  categories: Category[];
  products: Product[];
  settings: Settings | null;
};
export const defaults: Settings = {
  name: "متجر مجمع الهفهاف",
  headline: "كل اللي تحتاجه… بمكان واحد.",
  subtitle: "تصفح أقسامنا، اكتشف المنتجات المتوفرة، وتواصل مباشرة مع القسم.",
};
export const money = (n: number) => new Intl.NumberFormat("ar-IQ").format(n);
export function phoneNumber(s: string) {
  const n = s.replace(/[^0-9]/g, "");
  return n.startsWith("07")
    ? "964" + n.slice(1)
    : n.startsWith("00")
      ? n.slice(2)
      : n;
}
export function whatsapp(phone: string, text: string) {
  return (
    "https://wa.me/" + phoneNumber(phone) + "?text=" + encodeURIComponent(text)
  );
}

// Creation time stays unchanged when an existing product is edited.
export const newestFirst = (a: Product, b: Product) =>
  (b._creationTime ?? 0) - (a._creationTime ?? 0) || b._id.localeCompare(a._id);

export function textCSS(s?: TextStyle): CSSProperties | undefined {
  return s
    ? {
        color: s.color,
        fontSize: s.size,
        fontWeight: s.decoration === "bold" ? 800 : 400,
        fontStyle: s.decoration === "italic" ? "italic" : "normal",
        textDecoration: s.decoration === "underline" ? "underline" : "none",
        textShadow: s.decoration === "shadow" ? "1px 2px 3px #0007" : "none",
        overflowWrap: "anywhere",
      }
    : undefined;
}
export function sumProducts(
  products: Product[],
  quantities: Record<string, number>,
) {
  return products.reduce(
    (sum, p) =>
      sum +
      (p.available && p.price !== undefined
        ? p.price * Math.min(quantities[p._id] || 0, p.quantity ?? 999)
        : 0),
    0,
  );
}
