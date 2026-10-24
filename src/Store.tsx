import { useState } from "react";
import {
  Search,
  ArrowUpLeft,
  MessageCircle,
  Package,
  LayoutGrid,
  Check,
  SlidersHorizontal,
  Store as StoreIcon,
} from "lucide-react";
import { type Catalog, defaults, money, whatsapp } from "./types";
export default function Store({ data }: { data: Catalog }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [available, setAvailable] = useState(false);
  const s = data.settings || defaults;
  const cats = [...data.categories].sort((a, b) =>
    a.name.localeCompare(b.name, "ar"),
  );
  const selected = cats.find((c) => c._id === category);
  const ps = data.products
    .filter(
      (p) =>
        (category === "all" || p.category === category) &&
        p.title.includes(search) &&
        (!available || p.available),
    )
    .sort((a, b) => a.title.localeCompare(b.title, "ar"));
  return (
    <>
      <main className="store-main">
        <section className={"hero " + (s.bannerUrl ? "has-image" : "")}>
          {s.bannerUrl && (
            <img
              className="banner-image"
              src={s.bannerUrl}
              alt="إعلان المتجر"
            />
          )}
          <div className="hero-copy">
            <span className="eyebrow">
              <span /> أهلاً بيك في مجمع الهفهاف
            </span>
            <h1>{s.headline}</h1>
            <p>{s.subtitle}</p>
            <a className="hero-link" href="#catalog">
              اكتشف الأقسام <ArrowUpLeft size={20} />
            </a>
          </div>
          {!s.bannerUrl && (
            <div className="hero-art" aria-hidden="true">
              <div className="halo" />
              <div className="bag bag-back">
                <Package size={78} />
              </div>
              <div className="bag">
                <StoreIcon size={80} strokeWidth={1} />
                <span>الهفهاف</span>
              </div>
              <span className="art-dot one" />
              <span className="art-dot two" />
            </div>
          )}
          <div className="hero-foot">
            اختيارات متنوعة <span>•</span> أسعار بالدينار العراقي <span>•</span>{" "}
            تواصل مباشر
          </div>
        </section>
        <section id="catalog">
          <div className="section-title">
            <div>
              <span className="eyebrow muted">اكتشف مجمعنا</span>
              <h2>
                كل قسم، حكاية جديدة<span className="dot">.</span>
              </h2>
            </div>
            <span className="count">{cats.length} أقسام</span>
          </div>
          <div className="category-strip">
            <button
              className={"category " + (category === "all" ? "selected" : "")}
              onClick={() => setCategory("all")}
            >
              <span className="category-all">
                <LayoutGrid size={28} />
              </span>
              <strong>جميع الأقسام</strong>
              <small>كل اختياراتنا</small>
            </button>
            {cats.map((c) => (
              <button
                key={c._id}
                className={"category " + (category === c._id ? "selected" : "")}
                onClick={() => setCategory(c._id)}
              >
                <img src={c.imageUrl || ""} alt="" loading="lazy" />
                <strong>{c.name}</strong>
                <small>
                  {data.products.filter((p) => p.category === c._id).length}{" "}
                  منتجات
                </small>
              </button>
            ))}
          </div>
        </section>
        <section className="products-section">
          <div className="section-title">
            <div>
              <span className="eyebrow muted">تعرّف على الموجود</span>
              <h2>
                {selected?.name || "منتجات تستحق تشوفها"}
                <span className="dot">.</span>
              </h2>
            </div>
            {selected && (
              <a
                className="outline"
                href={whatsapp(
                  selected.phone,
                  "مرحبًا، لدي استفسار عن قسم " + selected.name,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> دعم القسم
              </a>
            )}
          </div>
          <div className="filters">
            <label className="search">
              <Search size={19} />
              <input
                placeholder="شنو تبحث عنه اليوم؟"
                aria-label="البحث عن منتج"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className={"filter " + (available ? "active" : "")}
              onClick={() => setAvailable(!available)}
            >
              {available ? (
                <Check size={17} />
              ) : (
                <SlidersHorizontal size={17} />
              )}{" "}
              المتوفر فقط
            </button>
            <span className="result-count">{ps.length} منتج</span>
          </div>
          {ps.length ? (
            <div className="product-grid">
              {ps.map((p) => {
                const c = cats.find((c) => c._id === p.category);
                return (
                  <article className="product" key={p._id}>
                    <div className="product-image">
                      <img
                        src={p.imageUrl || ""}
                        alt={p.title}
                        loading="lazy"
                      />
                      <span className={"stock " + (!p.available ? "out" : "")}>
                        <i />
                        {p.available ? "متوفر الآن" : "غير متوفر"}
                      </span>
                    </div>
                    <div className="product-copy">
                      <small>{c?.name}</small>
                      <h3>{p.title}</h3>
                      <div className="price">
                        <strong>{money(p.price)}</strong>
                        <span>د.ع</span>
                        {p.quantity !== undefined && (
                          <small>الكمية: {money(p.quantity)}</small>
                        )}
                      </div>
                      {c && (
                        <a
                          className="ask"
                          href={whatsapp(
                            c.phone,
                            "مرحبًا، أستفسر عن " +
                              p.title +
                              " بسعر " +
                              money(p.price) +
                              " د.ع",
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle size={18} /> استفسر عن المنتج{" "}
                          <ArrowUpLeft size={16} />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <Package size={42} />
              <h3>{search ? "ما لقينا نتائج للبحث" : "المنتجات تظهر هنا"}</h3>
              <p>
                {search
                  ? "جرّب اسمًا آخر أو اختر جميع الأقسام."
                  : "تابعنا، تنضاف المنتجات والأقسام من إدارة المتجر."}
              </p>
            </div>
          )}
        </section>
        <section className="contact-band">
          <MessageCircle size={28} />
          <div>
            <h3>عندك سؤال عن منتج؟</h3>
            <p>اختَر القسم وتواصل مباشرة مع فريقه عبر واتساب.</p>
          </div>
          <span>
            نسعد بخدمتك <ArrowUpLeft size={20} />
          </span>
        </section>
      </main>
      <footer>
        <strong>{s.name}</strong>
        <p>تصفح، اكتشف، وتواصل معنا.</p>
        <small>جميع الأسعار بالدينار العراقي • عرض المنتجات حسب التوفر</small>
      </footer>
    </>
  );
}
