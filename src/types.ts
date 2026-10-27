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
  _id: string;
  category: string;
  title: string;
  price: number;
  quantity?: number;
  available: boolean;
  image: string;
  imageUrl: string | null;
};
export type Settings = {
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
