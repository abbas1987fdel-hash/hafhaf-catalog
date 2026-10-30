import { useState, useEffect, useRef } from "react";
import {
  Search,
  ArrowUpLeft,
  MessageCircle,
  Package,
  ArrowRight,
  X,
  Expand,
  Check,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import {
  type Catalog,
  defaults,
  money,
  whatsapp,
  newestFirst,
  textCSS,
  sumProducts,
  type Settings,
} from "./types";
import "./store-update.css";

type Route = { category: string; product: string };
const readRoute = (): Route => {
  const params = new URLSearchParams(location.hash.slice(1));
  return {
    category: params.get("category") || "",
    product: params.get("product") || "",
  };
};
const routeHash = ({ category, product }: Route) => {
  if (!category) return "";
  const params = new URLSearchParams({ category });
  if (product) params.set("product", product);
  return "#" + params.toString();
};
const urlFor = (hash: string) => location.pathname + location.search + hash;
function useStoreRoute() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const initial = readRoute();
    // A directly opened product/category still gets meaningful Back destinations.
    if (initial.category && !history.state?.hafhafStore) {
      history.replaceState(
        { ...history.state, hafhafStore: true },
        "",
        urlFor(""),
      );
      const categoryHash = routeHash({
        category: initial.category,
        product: "",
      });
      history.pushState(
        { hafhafStore: true, parentHash: "" },
        "",
        urlFor(categoryHash),
      );
      if (initial.product)
        history.pushState(
          { hafhafStore: true, parentHash: categoryHash },
          "",
          urlFor(routeHash(initial)),
        );
    }
    const sync = () => setRoute(readRoute());
    addEventListener("popstate", sync);
    addEventListener("hashchange", sync);
    return () => {
      removeEventListener("popstate", sync);
      removeEventListener("hashchange", sync);
    };
  }, []);
  const navigate = (next: Route, replace = false) => {
    const hash = routeHash(next);
    const state = replace
      ? history.state
      : { hafhafStore: true, parentHash: location.hash };
    history[replace ? "replaceState" : "pushState"](state, "", urlFor(hash));
    setRoute(next);
  };
  const backTo = (next: Route) => {
    const hash = routeHash(next);
    if (history.state?.hafhafStore && history.state.parentHash === hash)
      history.back();
    else navigate(next, true);
  };
  return { route, navigate, backTo };
}

function Banner({
  urls,
  headline,
  subtitle,
  styles,
  seconds = 5,
}: {
  urls: string[];
  seconds?: number;
  headline: string;
  subtitle: string;
  styles?: Settings["textStyles"];
}) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (urls.length < 2 || paused) return;
    const timer = setInterval(() => {
      if (!document.hidden) setStep((v) => v + 1);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [urls.length, paused, seconds]);
  const current = urls.length ? step % urls.length : 0;
  return (
    <section className="store-banner" aria-label="إعلانات المتجر">
      {urls.length ? (
        <div className="banner-frame" aria-roledescription="عارض إعلانات">
          <div className="banner-slide-pair" key={step}>
            {step > 0 && urls.length > 1 && (
              <img
                className="banner-outgoing"
                src={urls[(step - 1) % urls.length]}
                alt=""
                aria-hidden="true"
              />
            )}
            <img
              className={step > 0 && urls.length > 1 ? "banner-incoming" : ""}
              src={urls[current]}
              alt={`${headline} — إعلان ${current + 1}`}
            />
          </div>
          {urls.length > 1 && (
            <div className="banner-controls">
              <button
                onClick={() => setPaused((v) => !v)}
                aria-label={paused ? "تشغيل البنرات" : "إيقاف البنرات مؤقتًا"}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <span>
                {current + 1} / {urls.length}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="banner-frame banner-placeholder">
          <Package size={42} />
          <h1 style={textCSS(styles?.headline)}>{headline}</h1>
        </div>
      )}
      <div className="banner-caption">
        {urls.length > 0 && (
          <h1 style={textCSS(styles?.headline)}>{headline}</h1>
        )}
        <p style={textCSS(styles?.subtitle)}>{subtitle}</p>
      </div>
    </section>
  );
}

export default function Store({ data }: { data: Catalog }) {
  const { route, navigate, backTo } = useStoreRoute();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const total = sumProducts(data.products, quantities);
  const count = data.products.reduce(
    (n, p) =>
      n +
      (p.available && p.price !== undefined
        ? Math.min(quantities[p._id] || 0, p.quantity ?? 999)
        : 0),
    0,
  );
  const [search, setSearch] = useState("");
  const [available, setAvailable] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const s = data.settings || defaults;
  const cats = [...data.categories].sort((a, b) =>
    a.name.localeCompare(b.name, "ar"),
  );
  const selected = cats.find((c) => c._id === route.category);
  const categoryProducts = data.products
    .filter((p) => p.category === selected?._id)
    .sort(newestFirst);
  const gallery = categoryProducts.filter((p) => p.imageUrl);
  const photo = gallery.find((p) => p._id === route.product);
  const photoIndex = gallery.findIndex((p) => p._id === photo?._id);
  const ps = categoryProducts.filter(
    (p) => p.title.includes(search) && (!available || p.available),
  );
  const closePhoto = () => backTo({ category: route.category, product: "" });
  const turnPhoto = (direction: number) => {
    if (gallery.length < 2) return;
    const next =
      gallery[(photoIndex + direction + gallery.length) % gallery.length];
    navigate({ category: route.category, product: next._id }, true);
  };
  useEffect(() => {
    setSearch("");
    setAvailable(false);
  }, [route.category]);
  useEffect(() => {
    if (!photo) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [!!photo]);
  const bannerUrls =
    (s as typeof s & { bannerUrls?: string[] }).bannerUrls?.filter(Boolean) ||
    [];
  const banners = bannerUrls.length
    ? bannerUrls
    : s.bannerUrl
      ? [s.bannerUrl]
      : [];
  return (
    <>
      <main className="store-main store-refresh">
        {!selected && (
          <>
            <Banner
              urls={banners}
              headline={s.headline}
              subtitle={s.subtitle}
              styles={s.textStyles}
              seconds={s.bannerSeconds ?? 5}
            />
            <section id="catalog">
              <div className="section-title">
                <div>
                  <span className="eyebrow muted">اكتشف مجمعنا</span>
                  <h2>
                    أقسام المتجر<span className="dot">.</span>
                  </h2>
                </div>
                <span className="count">{cats.length} أقسام</span>
              </div>
              <div className="category-grid compact-categories">
                {cats.map((c) => (
                  <button
                    key={c._id}
                    className="category-card"
                    onClick={() => {
                      navigate({ category: c._id, product: "" });
                      window.scrollTo({ top: 0 });
                    }}
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
                        دخول القسم <ArrowUpLeft size={18} />
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
          </>
        )}
        {selected && (
          <section className="products-section">
            <button
              className="outline"
              onClick={() => backTo({ category: "", product: "" })}
            >
              <ArrowRight size={18} /> العودة إلى الأقسام
            </button>
            <div className="section-title">
              <div>
                <span className="eyebrow muted">تعرّف على الموجود</span>
                <h2>
                  {selected.name}
                  <span className="dot">.</span>
                </h2>
              </div>
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
                {ps.map((p) => (
                  <article className="product" key={p._id}>
                    <button
                      className="product-image product-image-button"
                      aria-label={"تكبير صورة " + p.title}
                      disabled={!p.imageUrl}
                      onClick={() =>
                        navigate({ category: selected._id, product: p._id })
                      }
                    >
                      <img
                        src={p.imageUrl || ""}
                        alt={p.title}
                        loading="lazy"
                      />
                      <span className={"stock " + (!p.available ? "out" : "")}>
                        <i />
                        {p.available ? "متوفر الآن" : "غير متوفر"}
                      </span>
                      <span className="zoom-hint">
                        <Expand size={17} />
                      </span>
                    </button>
                    <div className="product-copy">
                      <small>{selected.name}</small>
                      <h3>{p.title}</h3>
                      <div className="price">
                        {p.price !== undefined && (
                          <>
                            <strong>{money(p.price)}</strong>
                            <span>د.ع</span>
                          </>
                        )}
                        {p.quantity !== undefined && (
                          <small>الكمية: {money(p.quantity)}</small>
                        )}
                      </div>
                      {p.price !== undefined && (
                        <div className="product-add">
                          <button
                            type="button"
                            className="primary"
                            disabled={
                              !p.available ||
                              (quantities[p._id] || 0) >= (p.quantity ?? 999)
                            }
                            onClick={() =>
                              setQuantities((q) => ({
                                ...q,
                                [p._id]: (q[p._id] || 0) + 1,
                              }))
                            }
                          >
                            إضافة +
                          </button>
                          {!!quantities[p._id] && (
                            <>
                              <output aria-label={"عدد " + p.title}>
                                {Math.min(quantities[p._id], p.quantity ?? 999)}
                              </output>
                              <button
                                type="button"
                                className="outline"
                                aria-label={"تقليل " + p.title}
                                onClick={() =>
                                  setQuantities((q) => ({
                                    ...q,
                                    [p._id]: Math.max(0, (q[p._id] || 0) - 1),
                                  }))
                                }
                              >
                                −
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      <a
                        className="ask"
                        href={whatsapp(
                          selected.phone,
                          "مرحبًا، أستفسر عن " +
                            p.title +
                            (p.price === undefined
                              ? ""
                              : " بسعر " + money(p.price) + " د.ع"),
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={18} /> واتساب{" "}
                        <ArrowUpLeft size={16} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <Package size={42} />
                <h3>{search ? "ما لقينا نتائج للبحث" : "المنتجات تظهر هنا"}</h3>
                <p>
                  {search
                    ? "جرّب اسمًا آخر أو غيّر تصفية المنتجات."
                    : "تابعنا لاكتشاف المنتجات الجديدة."}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
      {count > 0 && (
        <div className="sum-bar" role="status">
          <strong>
            المجموع: {money(total)} د.ع <small>({money(count)} قطعة)</small>
          </strong>
          <button className="outline" onClick={() => setQuantities({})}>
            تصفير
          </button>
        </div>
      )}
      {photo && (
        <dialog
          ref={dialog}
          className="photo-viewer product-gallery"
          aria-label={"صورة " + photo.title}
          onCancel={(e) => {
            e.preventDefault();
            closePhoto();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePhoto();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              turnPhoto(e.key === "ArrowLeft" ? 1 : -1);
            }
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1)
              swipe.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            else swipe.current = null;
          }}
          onTouchEnd={(e) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || !e.changedTouches.length) return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3)
              turnPhoto(dx < 0 ? 1 : -1);
          }}
        >
          <button
            className="photo-close"
            onClick={closePhoto}
            aria-label="إغلاق الصورة"
          >
            <X size={28} />
          </button>
          <img
            key={photo._id}
            src={photo.imageUrl || ""}
            alt={photo.title}
            draggable={false}
          />
          {gallery.length > 1 && (
            <>
              <button
                className="photo-nav photo-next"
                aria-label="المنتج التالي"
                onClick={() => turnPhoto(1)}
              >
                <ChevronLeft size={30} />
              </button>
              <button
                className="photo-nav photo-previous"
                aria-label="المنتج السابق"
                onClick={() => turnPhoto(-1)}
              >
                <ChevronRight size={30} />
              </button>
            </>
          )}
          <div className="photo-caption" aria-live="polite">
            <h2>{photo.title}</h2>
            {photo.price !== undefined && <p>{money(photo.price)} د.ع</p>}
          </div>
        </dialog>
      )}
    </>
  );
}
