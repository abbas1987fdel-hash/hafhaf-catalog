import { useState, useEffect, useRef, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { anyApi } from "convex/server";
import {
  LayoutGrid,
  Package,
  ImagePlus,
  Plus,
  Upload,
  Trash2,
  Pencil,
  LogOut,
  ExternalLink,
  ShieldCheck,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  LockKeyhole,
} from "lucide-react";
import {
  type Catalog,
  type Category,
  type Product,
  defaults,
  money,
  phoneNumber,
  newestFirst,
  type TextStyle,
} from "./types";
import { toWebP } from "./images";
import "./admin-update.css";
const api = anyApi.catalog;
type Editor = {
  kind: "category" | "product" | "settings";
  item?: Category | Product;
};
type Route = { tab: string; category: string; editor: string; item: string };
function readRoute(): Route {
  const p = new URLSearchParams(location.hash.slice(1));
  return {
    tab: ["categories", "products", "settings"].includes(p.get("tab") || "")
      ? p.get("tab")!
      : "categories",
    category: p.get("category") || "",
    editor: p.get("editor") || "",
    item: p.get("item") || "",
  };
}
function routeHash(r: Partial<Route>) {
  const p = new URLSearchParams();
  if (r.tab && r.tab !== "categories") p.set("tab", r.tab);
  if (r.category) p.set("category", r.category);
  if (r.editor) p.set("editor", r.editor);
  if (r.item) p.set("item", r.item);
  return p.size ? "#" + p.toString() : "";
}
const errorText = (e: unknown) => {
  const d = (e as { data?: unknown })?.data;
  return typeof d === "string"
    ? d
    : e instanceof Error
      ? e.message
      : "تعذر الحفظ، حاول مجددًا";
};
export default function Admin({ data }: { data: Catalog }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("hafhaf-admin") || "",
  );
  const [pin, setPin] = useState("");
  const [route, setRoute] = useState(readRoute);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [grant, setGrant] = useState<{
    category: string;
    token: string;
    code?: string;
  } | null>(null);
  const [categoryPin, setCategoryPin] = useState("");
  const login = useMutation(api.login),
    logout = useMutation(api.logout),
    remove = useMutation(api.remove),
    unlock = useMutation(api.unlockCategory);
  const s = data.settings || defaults;
  const cats = [...data.categories].sort((a, b) =>
    a.name.localeCompare(b.name, "ar"),
  );
  const selected = cats.find((c) => c._id === route.category);
  const protectedCategory = !!selected?.protected;
  const entered =
    !!selected && (!protectedCategory || grant?.category === selected._id);
  const categoryToken =
    grant?.category === selected?._id ? grant?.token : undefined;
  useEffect(() => {
    const initial = readRoute();
    if (
      !history.state?.hafhafAdmin &&
      (initial.category || initial.editor || initial.tab !== "categories")
    ) {
      const base = location.pathname + location.search;
      history.replaceState({ hafhafAdmin: true }, "", base);
      let parent = "";
      const section = routeHash({
        tab: initial.tab,
        category: initial.category,
      });
      if (section) {
        history.pushState({ hafhafAdmin: true, parent }, "", base + section);
        parent = section;
      }
      if (initial.editor)
        history.pushState(
          { hafhafAdmin: true, parent },
          "",
          base + routeHash(initial),
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
  useEffect(() => {
    setGrant((g) => (g?.category === route.category ? g : null));
    setCategoryPin("");
    setError("");
  }, [route.category]);
  const go = (r: Partial<Route>, replace = false) => {
    const hash = routeHash(r);
    if (hash === location.hash) return;
    history[replace ? "replaceState" : "pushState"](
      { hafhafAdmin: true, parent: location.hash },
      "",
      location.pathname + location.search + hash,
    );
    setRoute(readRoute());
    setError("");
    setSuccess("");
  };
  const back = (fallback: Partial<Route>) => {
    if (history.state?.hafhafAdmin && typeof history.state.parent === "string")
      history.back();
    else go(fallback, true);
  };
  const enter = (c: Category, edit = false) => {
    setGrant(null);
    setCategoryPin("");
    go({
      tab: "products",
      category: c._id,
    });
    if (edit)
      go({ tab: "products", category: c._id, editor: "category", item: c._id });
  };
  const closeEditor = () => back({ tab: route.tab, category: route.category });
  const editor: Editor | null =
    route.editor === "settings"
      ? { kind: "settings" }
      : route.editor === "category" && (!route.item || entered)
        ? {
            kind: "category",
            item: route.item
              ? { ...selected!, accessCode: grant?.code }
              : undefined,
          }
        : route.editor === "product" && entered
          ? {
              kind: "product",
              item: route.item
                ? data.products.find(
                    (p) => p._id === route.item && p.category === selected._id,
                  )
                : undefined,
            }
          : null;
  const perform = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
      setSuccess("تم حفظ التغيير بنجاح");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await login({ pin });
      if (r.error) setError(r.error);
      else {
        setToken(r.token);
        sessionStorage.setItem("hafhaf-admin", r.token);
        dispatchEvent(new Event("hafhaf-auth"));
        setPin("");
      }
    } catch {
      setError("تعذر الاتصال، تحقق من الإنترنت وحاول مجددًا");
    } finally {
      setBusy(false);
    }
  }
  async function openProtected(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const r = await unlock({
        adminToken: token,
        category: selected._id,
        code: categoryPin,
      });
      if (r.error) setError(r.error);
      else {
        setGrant({
          category: selected._id,
          token: r.token,
          code: r.accessCode,
        });
        setCategoryPin("");
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <main className="login-page">
        <div className="login-art">
          <span className="eyebrow">مساحة الإدارة</span>
          <h1>
            متجرك مرتب.
            <br />
            شغلك أسهل<span>.</span>
          </h1>
          <p>
            أقسامك، منتجاتك وإعلاناتك…
            <br />
            كلها من مكان واحد.
          </p>
          <div className="login-tiles">
            <Package size={60} />
            <LayoutGrid size={60} />
            <ImagePlus size={60} />
          </div>
        </div>
        <form className="login-card" onSubmit={signIn}>
          <span className="app-icon">
            <ShieldCheck size={28} />
          </span>
          <span className="eyebrow muted">أهلاً بعودتك</span>
          <h2>دخول إدارة الهفهاف</h2>
          <p>أدخل رمز الإدارة للوصول إلى لوحة التحكم.</p>
          <label>
            رمز الدخول
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="أدخل رمز الإدارة"
              maxLength={100}
            />
          </label>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <button disabled={busy} className="primary">
            {busy ? "جارٍ التحقق…" : "الدخول إلى لوحة التحكم"}
          </button>
          <a href={import.meta.env.BASE_URL + "store/"}>
            العودة إلى المتجر <ExternalLink size={15} />
          </a>
        </form>
      </main>
    );
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <span className="eyebrow muted">إدارة المحتوى</span>
        <h2>لوحة التحكم</h2>
        <nav>
          {[
            ["categories", "الأقسام", LayoutGrid],
            ["products", "المنتجات", Package],
            ["settings", "البنر والمتجر", ImagePlus],
          ].map(([id, label, Icon]) => (
            <button
              className={route.tab === id ? "active" : ""}
              key={id as string}
              onClick={() => {
                setGrant(null);
                go({ tab: id as string });
              }}
            >
              <Icon size={20} />
              {label as string}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck />
          <p>
            تعديلاتك تظهر مباشرة
            <br />
            في واجهة الزبائن.
          </p>
          <a
            href={import.meta.env.BASE_URL + "store/"}
            target="_blank"
            rel="noreferrer"
          >
            عرض المتجر <ExternalLink size={16} />
          </a>
          <button
            className="subtle"
            onClick={() => {
              logout({ token }).catch(() => {});
              sessionStorage.removeItem("hafhaf-admin");
              dispatchEvent(new Event("hafhaf-auth"));
              setToken("");
              setGrant(null);
              go({}, true);
            }}
          >
            <LogOut size={17} /> تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <span className="eyebrow muted">{s.name}</span>
            <h1>
              أهلاً، مدير المتجر <span className="dot">✦</span>
            </h1>
            <p>مساحة بسيطة لإدارة كل التفاصيل.</p>
          </div>
          <a
            href={import.meta.env.BASE_URL + "store/"}
            className="outline"
            target="_blank"
            rel="noreferrer"
          >
            معاينة المتجر <ExternalLink size={17} />
          </a>
        </div>
        <div className="stats">
          <div>
            <span className="stat-icon">
              <LayoutGrid />
            </span>
            <small>أقسام المتجر</small>
            <strong>{money(cats.length)}</strong>
          </div>
          <div>
            <span className="stat-icon">
              <Package />
            </span>
            <small>إجمالي المنتجات</small>
            <strong>{money(data.products.length)}</strong>
          </div>
          <div>
            <span className="stat-icon">
              <CheckCircle2 />
            </span>
            <small>متوفرة الآن</small>
            <strong>
              {money(data.products.filter((p) => p.available).length)}
            </strong>
          </div>
        </div>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="success">
            {success}
          </div>
        )}
        <section className="admin-content">
          {route.category && (
            <button
              className="outline admin-back"
              onClick={() => back({ tab: route.tab })}
            >
              <ArrowRight size={18} /> العودة إلى الأقسام
            </button>
          )}
          {selected && !entered ? (
            <form className="admin-pin-gate" onSubmit={openProtected}>
              <span className="app-icon">
                <LockKeyhole />
              </span>
              <h2>دخول إدارة {selected.name}</h2>
              <p>هذا الرمز خاص بالإدارة. الزبائن يشاهدون القسم بدون رمز.</p>
              <label>
                رمز دخول القسم
                <input
                  type="password"
                  autoComplete="off"
                  value={categoryPin}
                  onChange={(e) => setCategoryPin(e.target.value)}
                  required
                  minLength={4}
                  maxLength={64}
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? "جارٍ التحقق…" : "دخول القسم"}
              </button>
            </form>
          ) : (
            <>
              <div className="section-title">
                <div>
                  <h2>
                    {selected
                      ? selected.name
                      : route.tab === "settings"
                        ? "واجهة المتجر والإعلان"
                        : route.tab === "products"
                          ? "اختر قسمًا لإدارة منتجاته"
                          : "أقسام المتجر"}
                  </h2>
                  <p>
                    {selected
                      ? "حدّث منتجات هذا القسم وأسعاره وتوفره."
                      : route.tab === "settings"
                        ? "بنرات متحركة تظهر للزبائن كل خمس ثوانٍ."
                        : "لكل قسم رمز إدارة مستقل وصورة ورقم واتساب."}
                  </p>
                </div>
                {(route.tab !== "products" || selected) && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      go({
                        ...route,
                        editor:
                          route.tab === "settings"
                            ? "settings"
                            : selected
                              ? "product"
                              : "category",
                        item: "",
                      })
                    }
                  >
                    <Plus size={18} />
                    {route.tab === "settings"
                      ? "تعديل الواجهة"
                      : selected
                        ? "رفع منتج"
                        : "إنشاء قسم"}
                  </button>
                )}
              </div>
              {selected && entered && (
                <div className="admin-category-tools">
                  <button
                    className="outline"
                    onClick={() =>
                      go({ ...route, editor: "category", item: selected._id })
                    }
                  >
                    <Pencil size={17} /> تعديل القسم والرمز
                  </button>
                  <button
                    className="subtle"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "حذف قسم " +
                            selected.name +
                            "؟ لا يمكن حذف قسم يحتوي منتجات.",
                        )
                      )
                        void perform(async () => {
                          await remove({
                            token,
                            categoryToken,
                            category: selected._id,
                          });
                          setGrant(null);
                          go({ tab: "categories" }, true);
                        });
                    }}
                  >
                    <Trash2 size={17} /> حذف القسم
                  </button>
                </div>
              )}
              {!selected &&
                route.tab !== "settings" &&
                (cats.length ? (
                  <div className="admin-categories">
                    {cats.map((c) => (
                      <article key={c._id}>
                        <img src={c.imageUrl || ""} alt={c.name} />
                        <div>
                          <h3>{c.name}</h3>
                          <p dir="ltr">+{c.phone}</p>
                          <small>
                            {c.productCount ??
                              data.products.filter((p) => p.category === c._id)
                                .length}{" "}
                            منتجات
                          </small>
                          <button
                            className="outline category-enter"
                            onClick={() => enter(c)}
                          >
                            <LockKeyhole size={16} /> دخول القسم
                          </button>
                        </div>
                        <div className="row-actions">
                          <button
                            aria-label={"تعديل " + c.name}
                            onClick={() => enter(c, true)}
                          >
                            <Pencil size={17} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    text="ابدأ بإنشاء أول قسم"
                    sub="أضف صورة القسم واسمه ورمز إدارته ورقم واتساب للدعم."
                  />
                ))}
              {selected &&
                entered &&
                (data.products.some((p) => p.category === selected._id) ? (
                  <div className="admin-products">
                    {[...data.products]
                      .sort(newestFirst)
                      .filter((p) => p.category === selected._id)
                      .map((p) => (
                        <article key={p._id}>
                          <img src={p.imageUrl || ""} alt={p.title} />
                          <div>
                            <small>{selected.name}</small>
                            <h3>{p.title}</h3>
                            <strong>
                              {p.price === undefined
                                ? "بدون سعر"
                                : money(p.price) + " د.ع"}
                            </strong>
                            <span
                              className={
                                "stock inline " + (!p.available ? "out" : "")
                              }
                            >
                              {p.available ? "متوفر" : "غير متوفر"}
                              {p.quantity !== undefined
                                ? " • " + p.quantity
                                : ""}
                            </span>
                          </div>
                          <div className="row-actions">
                            <button
                              aria-label={"تعديل " + p.title}
                              onClick={() =>
                                go({ ...route, editor: "product", item: p._id })
                              }
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              disabled={busy}
                              aria-label={"حذف " + p.title}
                              onClick={() => {
                                if (
                                  confirm("حذف المنتج " + p.title + " نهائيًا؟")
                                )
                                  void perform(() =>
                                    remove({
                                      token,
                                      categoryToken,
                                      product: p._id,
                                    }),
                                  );
                              }}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                ) : (
                  <Empty
                    text="أضف أول منتج لهذا القسم"
                    sub="الصورة والعنوان والسعر، والكمية اختيارية."
                  />
                ))}
              {route.tab === "settings" && !selected && (
                <div className="settings-preview">
                  {(s.bannerUrls?.length
                    ? s.bannerUrls
                    : s.bannerUrl
                      ? [s.bannerUrl]
                      : []
                  ).map((url, i) => (
                    <img key={url + i} src={url} alt={"البنر " + (i + 1)} />
                  ))}
                  <span className="eyebrow">معاينة الإعلان</span>
                  <h2>{s.headline}</h2>
                  <p>{s.subtitle}</p>
                  <small>اسم المتجر: {s.name}</small>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      {editor && (
        <EditorForm
          key={route.editor + route.item}
          editor={editor}
          token={token}
          categoryToken={categoryToken}
          category={selected}
          data={data}
          close={closeEditor}
          saved={() => {
            if (editor.kind === "category" && selected) {
              setGrant(null);
              go({ tab: "categories" }, true);
            } else closeEditor();
            setSuccess("تم الحفظ، التعديل ظاهر الآن للزبائن");
          }}
        />
      )}
    </div>
  );
}
function Empty({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="empty">
      <Package size={40} />
      <h3>{text}</h3>
      <p>{sub}</p>
    </div>
  );
}
type BannerItem = { id?: string; url: string; file?: File };
function EditorForm({
  editor,
  token,
  categoryToken,
  category,
  data,
  close,
  saved,
}: {
  editor: Editor;
  token: string;
  categoryToken?: string;
  category?: Category;
  data: Catalog;
  close: () => void;
  saved: () => void;
}) {
  const item = editor.item,
    c = item as Category | undefined,
    p = item as Product | undefined,
    s = data.settings || defaults;
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState("");
  const [banners, setBanners] = useState<BannerItem[]>(() => {
    const ids = s.banners ?? (s.banner ? [s.banner] : []);
    const urls = s.bannerUrls ?? (s.bannerUrl ? [s.bannerUrl] : []);
    return ids.map((id, i) => ({ id, url: urls[i] || "" }));
  });
  const ownedUrls = useRef(new Set<string>()),
    active = useRef(true),
    dialogRef = useRef<HTMLElement>(null);
  const uploadUrl = useMutation(api.uploadUrl),
    saveC = useMutation(api.saveCategory),
    saveP = useMutation(api.saveProduct),
    saveS = useMutation(api.saveSettings),
    discard = useMutation(api.discardUpload);
  useEffect(() => {
    active.current = true;
    const old = document.body.style.overflow;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      active.current = false;
      document.body.style.overflow = old;
      previous?.focus();
      for (const url of ownedUrls.current) URL.revokeObjectURL(url);
    };
  }, []);
  const makeUrl = (f: File) => {
    const url = URL.createObjectURL(f);
    ownedUrls.current.add(url);
    return url;
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const uploaded: string[] = [];
    try {
      async function upload(f: File) {
        const blob = await toWebP(f);
        const url = await uploadUrl({ token });
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "image/webp" },
          body: blob,
        });
        if (!r.ok) throw Error("تعذر رفع الصورة");
        const id = (await r.json()).storageId as string;
        uploaded.push(id);
        return id;
      }
      let image = item?.image;
      if (file) image = await upload(file);
      const val = (key: string) => String(f.get(key) || "").trim();
      if (editor.kind === "category") {
        if (!image) throw Error("أضف صورة القسم");
        await saveC({
          token,
          categoryToken,
          id: item?._id,
          name: val("name"),
          phone: phoneNumber(val("phone")),
          image,
          accessCode: val("accessCode"),
        });
      } else if (editor.kind === "product") {
        if (!image || !category) throw Error("أضف صورة المنتج واختر القسم");
        await saveP({
          token,
          categoryToken,
          id: item?._id,
          category: category._id,
          title: val("title"),
          price: val("price").trim() === "" ? undefined : Number(val("price")),
          quantity:
            val("quantity") === "" ? undefined : Number(val("quantity")),
          available: f.get("available") === "on",
          image,
        });
      } else {
        const ids: string[] = [];
        for (const b of banners)
          ids.push(b.file ? await upload(b.file) : b.id!);
        await saveS({
          token,
          name: val("name"),
          headline: val("headline"),
          subtitle: val("subtitle"),
          banners: ids,
          textStyles: Object.fromEntries(
            ["name", "headline", "subtitle"].map((key) => [
              key,
              {
                color: val(key + "Color"),
                size: Number(val(key + "Size")),
                decoration: val(key + "Decoration"),
              },
            ]),
          ),
        });
      }
      if (active.current) saved();
    } catch (err) {
      if (active.current) setError(errorText(err));
      await Promise.all(
        uploaded.map((image) => discard({ token, image }).catch(() => {})),
      );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  const reorder = (index: number, delta: number) =>
    setBanners((list) => {
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  return (
    <div className="modal-backdrop">
      <section
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="تحرير المحتوى"
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) {
            e.preventDefault();
            close();
          }
          if (e.key === "Tab") {
            const nodes = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
              ),
            ];
            const first = nodes[0],
              last = nodes.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="modal-title">
          <div>
            <span className="eyebrow muted">إدارة متجر الهفهاف</span>
            <h2>
              {editor.kind === "category"
                ? item
                  ? "تعديل القسم"
                  : "إنشاء قسم جديد"
                : editor.kind === "product"
                  ? item
                    ? "تعديل المنتج"
                    : "رفع منتج جديد"
                  : "تعديل البنر والمتجر"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="إغلاق المحرر"
            disabled={busy}
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          {editor.kind === "settings" ? (
            <div className="banner-editor">
              <label className="upload-field">
                <ImagePlus size={30} />
                <strong>إضافة صور البنرات</strong>
                <span>حتى 8 صور • القياس 2.35:1 • تتحول تلقائيًا إلى WebP</span>
                <input
                  type="file"
                  multiple
                  aria-label="إضافة صور البنرات"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={busy || banners.length >= 8}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length + banners.length > 8) {
                      setError("يمكن إضافة 8 بنرات كحد أقصى");
                      e.target.value = "";
                      return;
                    }
                    setError("");
                    setBanners((list) => [
                      ...list,
                      ...files.map((file) => ({ file, url: makeUrl(file) })),
                    ]);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="banner-editor-list">
                {banners.map((b, i) => (
                  <div className="banner-editor-item" key={b.url + i}>
                    <img src={b.url} alt={"معاينة البنر " + (i + 1)} />
                    <div>
                      <span>البنر {i + 1}</span>
                      <button
                        type="button"
                        aria-label={"تقديم البنر " + (i + 1)}
                        disabled={busy || i === 0}
                        onClick={() => reorder(i, -1)}
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        type="button"
                        aria-label={"تأخير البنر " + (i + 1)}
                        disabled={busy || i === banners.length - 1}
                        onClick={() => reorder(i, 1)}
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button
                        type="button"
                        aria-label={"إزالة البنر " + (i + 1)}
                        disabled={busy}
                        onClick={() =>
                          setBanners((list) => list.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <label className="upload-field">
              {preview || item?.imageUrl ? (
                <img
                  src={preview || item?.imageUrl || ""}
                  alt="معاينة الصورة"
                />
              ) : (
                <Upload size={32} />
              )}
              <strong>
                {file
                  ? file.name
                  : editor.kind === "category"
                    ? "صورة القسم"
                    : "صورة المنتج"}
              </strong>
              <span>اضغط لاختيار صورة • تتحول تلقائيًا إلى WebP</span>
              <input
                type="file"
                aria-label="اختيار صورة"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    setPreview(makeUrl(f));
                  }
                }}
              />
            </label>
          )}
          {editor.kind === "category" ? (
            <>
              <label>
                اسم القسم
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={c?.name}
                  placeholder="مثل: الأجهزة المنزلية"
                />
              </label>
              <label>
                رقم واتساب دعم القسم
                <input
                  name="phone"
                  required
                  type="tel"
                  dir="ltr"
                  defaultValue={c?.phone}
                  placeholder="9647XXXXXXXXX"
                  pattern="[+0-9 ()-]{10,22}"
                />
              </label>
              <small>استخدم رقم الدعم مع رمز الدولة، مثل 964 للعراق.</small>
              <label>
                رمز دخول القسم للإدارة
                <input
                  name="accessCode"
                  required
                  minLength={4}
                  maxLength={64}
                  defaultValue={c?.accessCode || ""}
                  autoComplete="off"
                  placeholder="رمز خاص بإدارة هذا القسم"
                />
              </label>
              <small>
                يُطلب عند دخول القسم من الإدارة فقط. تغيير الرمز يتطلب إدخاله
                مجددًا.
              </small>
            </>
          ) : editor.kind === "product" ? (
            <>
              <label>
                القسم
                <input value={category?.name || ""} readOnly />
              </label>
              <label>
                عنوان المنتج
                <input
                  name="title"
                  required
                  maxLength={160}
                  defaultValue={p?.title}
                  placeholder="اسم واضح للمنتج"
                />
              </label>
              <div className="form-grid">
                <label>
                  السعر بالدينار العراقي (اختياري)
                  <input
                    type="number"
                    inputMode="decimal"
                    name="price"
                    min="0"
                    max="1000000000000"
                    step="1"
                    defaultValue={p?.price}
                    placeholder="25,000"
                  />
                </label>
                <label>
                  الكمية (اختياري)
                  <input
                    type="number"
                    inputMode="numeric"
                    name="quantity"
                    min="0"
                    step="1"
                    defaultValue={p?.quantity}
                    placeholder="بدون تحديد"
                  />
                </label>
              </div>
              <label className="check">
                <input
                  name="available"
                  type="checkbox"
                  defaultChecked={p?.available ?? true}
                />{" "}
                المنتج متوفر حاليًا
              </label>
              <small>
                إذا كانت الكمية صفرًا يظهر المنتج «غير متوفر» تلقائيًا.
              </small>
            </>
          ) : (
            <>
              <TextControls
                field="name"
                title="اسم المتجر"
                value={s.textStyles?.name}
                size={22}
              />
              <label>
                اسم المتجر
                <input
                  name="name"
                  defaultValue={s.name}
                  required
                  maxLength={100}
                />
              </label>
              <TextControls
                field="headline"
                title="عنوان البنر"
                value={s.textStyles?.headline}
                size={32}
              />
              <label>
                عنوان البنر
                <input
                  name="headline"
                  defaultValue={s.headline}
                  required
                  maxLength={150}
                />
              </label>
              <TextControls
                field="subtitle"
                title="نص الإعلان"
                value={s.textStyles?.subtitle}
                size={18}
              />
              <label>
                نص الإعلان
                <textarea
                  name="subtitle"
                  defaultValue={s.subtitle}
                  required
                  maxLength={250}
                  rows={3}
                />
              </label>
            </>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <div className="form-actions">
            <button disabled={busy} className="primary" type="submit">
              {busy ? "جارٍ ضغط الصور والحفظ…" : "حفظ ونشر"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="subtle"
              onClick={close}
            >
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TextControls({
  field,
  title,
  value,
  size,
}: {
  field: string;
  title: string;
  value?: TextStyle;
  size: number;
}) {
  return (
    <div className="text-controls" role="group" aria-label={"تنسيق " + title}>
      <label>
        لون
        <input
          type="color"
          name={field + "Color"}
          defaultValue={value?.color ?? "#53796c"}
        />
      </label>
      <label>
        حجم
        <input
          type="number"
          name={field + "Size"}
          min="12"
          max="64"
          required
          defaultValue={value?.size ?? size}
        />
      </label>
      <label>
        زخرفة
        <select
          name={field + "Decoration"}
          defaultValue={value?.decoration ?? "plain"}
        >
          <option value="plain">عادي</option>
          <option value="bold">عريض</option>
          <option value="italic">مائل</option>
          <option value="underline">تحته خط</option>
          <option value="shadow">ظل</option>
        </select>
      </label>
    </div>
  );
}
