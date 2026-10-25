import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { anyApi } from "convex/server";
import {
  Search,
  ArrowUpLeft,
  MessageCircle,
  Package,
  ArrowRight,
  X,
  Expand,
  LockKeyhole,
  Check,
  SlidersHorizontal,
  Store as StoreIcon,
} from "lucide-react";
import { type Catalog, defaults, money, whatsapp } from "./types";
export default function Store({ data }: { data: Catalog }) {
  const unlock = useMutation(anyApi.catalog.unlockCategory);
  const [code, setCode] = useState(""),
    [gateError, setGateError] = useState(""),
    [unlocking, setUnlocking] = useState(false);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [available, setAvailable] = useState(false);
  const [photo, setPhoto] = useState<{ url: string; title: string } | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!photo) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [photo]);
  const openCategory = (id: string) => {
    setCode("");
    setGateError("");
    setCategory(id);
    setSearch("");
    setAvailable(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const s = data.settings || defaults;
  const cats = [...data.categories].sort((a, b) =>
    a.name.localeCompare(b.name, "ar"),
  );
  const selected = cats.find((c) => c._id === category);
  useEffect(() => {
    if (selected?.locked) setPhoto(null);
  }, [selected?.locked]);
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
        {!selected && (
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
              اختيارات متنوعة <span>•</span> أسعار بالدينار العراقي{" "}
              <span>•</span> تواصل مباشر
            </div>
          </section>
        )}
        {!selected && (
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
            <div className="category-grid">
              {cats.map((c) => (
                <button
                  key={c._id}
                  className="category-card"
                  onClick={() => openCategory(c._id)}
                >
                  <img src={c.imageUrl || ""} alt="" loading="lazy" />
                  <div>
                    <h3>{c.name}</h3>
                    <small>
                      {c.productCount ??
                        data.products.filter((p) => p.category === c._id)
                          .length}{" "}
                      منتجات
                    </small>
                    <span>
                      دخول القسم <ArrowUpLeft size={20} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {!cats.length && (
              <div className="empty">
                <Package size={42} />
                <h3>الأقسام تظهر هنا</h3>
                <p>تابعنا لاكتشاف الجديد في المتجر.</p>
              </div>
            )}
          </section>
        )}
        {selected?.locked && (
          <section className="category-gate">
            <button className="outline" onClick={() => openCategory("all")}>
              <ArrowRight size={18} /> العودة إلى الأقسام
            </button>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setUnlocking(true);
                setGateError("");
                try {
                  const result = await unlock({ category: selected._id, code });
                  if (result.error) setGateError(result.error);
                  else {
                    if (result.token) {
                      let tokens: string[] = [];
                      try {
                        const stored = JSON.parse(
                          sessionStorage.getItem("hafhaf-categories") || "[]",
                        );
                        if (Array.isArray(stored))
                          tokens = stored.filter((t) => typeof t === "string");
                      } catch {}
                      sessionStorage.setItem(
                        "hafhaf-categories",
                        JSON.stringify([...tokens, result.token].slice(-100)),
                      );
                    }
                    dispatchEvent(new Event("hafhaf-auth"));
                    setCode("");
                  }
                } catch {
                  setGateError("تعذر فتح القسم، تحقق من الإنترنت وحاول مجددًا");
                } finally {
                  setUnlocking(false);
                }
              }}
            >
              <span className="app-icon">
                <LockKeyhole />
              </span>
              <h2>{selected.name}</h2>
              <p>أدخل رمز القسم لمشاهدة المنتجات.</p>
              <label>
                رمز دخول القسم
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={64}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                />
              </label>
              {gateError && (
                <div className="error" role="alert">
                  {gateError}
                </div>
              )}
              <button className="primary" disabled={unlocking}>
                {unlocking ? "جارٍ التحقق…" : "فتح القسم"}
              </button>
            </form>
          </section>
        )}
        {selected && !selected.locked && (
          <section className="products-section">
            <button className="outline" onClick={() => openCategory("all")}>
              <ArrowRight size={18} /> العودة إلى الأقسام
            </button>
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
                  <MessageCircle size={18} /> واتساب
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
                      <button
                        className="product-image product-image-button"
                        aria-label={"تكبير صورة " + p.title}
                        disabled={!p.imageUrl}
                        onClick={() =>
                          p.imageUrl &&
                          setPhoto({ url: p.imageUrl, title: p.title })
                        }
                      >
                        <img
                          src={p.imageUrl || ""}
                          alt={p.title}
                          loading="lazy"
                        />
                        <span
                          className={"stock " + (!p.available ? "out" : "")}
                        >
                          <i />
                          {p.available ? "متوفر الآن" : "غير متوفر"}
                        </span>
                        <span className="zoom-hint">
                          <Expand size={17} />
                        </span>
                      </button>
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
                            <MessageCircle size={18} /> واتساب{" "}
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
        )}
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
      {photo && (
        <dialog
          ref={dialog}
          className="photo-viewer"
          aria-label={"صورة " + photo.title}
          onCancel={(e) => {
            e.preventDefault();
            setPhoto(null);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPhoto(null);
          }}
        >
          <button
            className="photo-close"
            onClick={() => setPhoto(null)}
            aria-label="إغلاق الصورة"
          >
            <X size={28} />
          </button>
          <img src={photo.url} alt={photo.title} />
          <p>{photo.title}</p>
        </dialog>
      )}
      <footer>
        <strong>{s.name}</strong>
        <p>تصفح، اكتشف، وتواصل معنا.</p>
        <small>جميع الأسعار بالدينار العراقي • عرض المنتجات حسب التوفر</small>
      </footer>
    </>
  );
}
