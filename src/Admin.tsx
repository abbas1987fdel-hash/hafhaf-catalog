import { useState, type FormEvent } from "react";
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
} from "lucide-react";
import {
  type Catalog,
  type Category,
  type Product,
  defaults,
  money,
  phoneNumber,
} from "./types";
import { toWebP } from "./images";
const api = anyApi.catalog;
type Editor = {
  kind: "category" | "product" | "settings";
  item?: Category | Product;
};
const errorText = (e: unknown) => {
  const data = (e as { data?: unknown })?.data;
  return typeof data === "string"
    ? data
    : e instanceof Error
      ? e.message
      : "تعذر الحفظ، حاول مجددًا";
};
export default function Admin({ data }: { data: Catalog }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("hafhaf-admin") || "",
  );
  const [pin, setPin] = useState("");
  const [tab, setTab] = useState("categories");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const login = useMutation(api.login),
    logout = useMutation(api.logout),
    remove = useMutation(api.remove);
  const s = data.settings || defaults;
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
        setPin("");
      }
    } catch {
      setError("تعذر الاتصال، تحقق من الإنترنت وحاول مجددًا");
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
          <a href="./">
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
              className={tab === id ? "active" : ""}
              key={id as string}
              onClick={() => {
                setTab(id as string);
                setError("");
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
          <a href="./" target="_blank" rel="noreferrer">
            عرض المتجر <ExternalLink size={16} />
          </a>
          <button
            className="subtle"
            onClick={() => {
              logout({ token }).catch(() => {});
              sessionStorage.removeItem("hafhaf-admin");
              setToken("");
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
          <a href="./" className="outline" target="_blank" rel="noreferrer">
            معاينة المتجر <ExternalLink size={17} />
          </a>
        </div>
        <div className="stats">
          <div>
            <span className="stat-icon">
              <LayoutGrid />
            </span>
            <small>أقسام المتجر</small>
            <strong>{money(data.categories.length)}</strong>
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
          <div className="section-title">
            <div>
              <h2>
                {tab === "categories"
                  ? "أقسام المتجر"
                  : tab === "products"
                    ? "إدارة المنتجات"
                    : "واجهة المتجر والإعلان"}
              </h2>
              <p>
                {tab === "categories"
                  ? "كل قسم له صورته ورقم الدعم الخاص به."
                  : tab === "products"
                    ? "حدّث الأسعار والتوفر، وخلي الزبائن بالصورة."
                    : "أول انطباع يبدأ من هنا."}
              </p>
            </div>
            <button
              className="primary"
              disabled={busy || (tab === "products" && !data.categories.length)}
              onClick={() =>
                setEditor({
                  kind:
                    tab === "categories"
                      ? "category"
                      : tab === "products"
                        ? "product"
                        : "settings",
                })
              }
            >
              <Plus size={18} />
              {tab === "categories"
                ? "إنشاء قسم"
                : tab === "products"
                  ? "رفع منتج"
                  : "تعديل الواجهة"}
            </button>
          </div>
          {tab === "categories" &&
            (data.categories.length ? (
              <div className="admin-categories">
                {data.categories.map((c) => (
                  <article key={c._id}>
                    <img src={c.imageUrl || ""} alt={c.name} />
                    <div>
                      <h3>{c.name}</h3>
                      <p dir="ltr">+{c.phone}</p>
                      <small>
                        {
                          data.products.filter((p) => p.category === c._id)
                            .length
                        }{" "}
                        منتجات
                      </small>
                    </div>
                    <div className="row-actions">
                      <button
                        aria-label={"تعديل " + c.name}
                        onClick={() => setEditor({ kind: "category", item: c })}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        disabled={busy}
                        aria-label={"حذف " + c.name}
                        onClick={() => {
                          if (
                            confirm(
                              "حذف قسم " +
                                c.name +
                                "؟ لا يمكن حذف قسم يحتوي منتجات.",
                            )
                          )
                            void perform(() =>
                              remove({ token, category: c._id }),
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
                text="ابدأ بإنشاء أول قسم"
                sub="أضف صورة القسم واسمه ورقم واتساب للدعم."
              />
            ))}
          {tab === "products" &&
            (data.products.length ? (
              <div className="admin-products">
                {data.products.map((p) => (
                  <article key={p._id}>
                    <img src={p.imageUrl || ""} alt={p.title} />
                    <div>
                      <small>
                        {
                          data.categories.find((c) => c._id === p.category)
                            ?.name
                        }
                      </small>
                      <h3>{p.title}</h3>
                      <strong>{money(p.price)} د.ع</strong>
                      <span
                        className={
                          "stock inline " + (!p.available ? "out" : "")
                        }
                      >
                        {p.available ? "متوفر" : "غير متوفر"}
                        {p.quantity !== undefined ? " • " + p.quantity : ""}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button
                        aria-label={"تعديل " + p.title}
                        onClick={() => setEditor({ kind: "product", item: p })}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        disabled={busy}
                        aria-label={"حذف " + p.title}
                        onClick={() => {
                          if (confirm("حذف المنتج " + p.title + " نهائيًا؟"))
                            void perform(() =>
                              remove({ token, product: p._id }),
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
                text={
                  data.categories.length
                    ? "أضف أول منتج للمتجر"
                    : "أنشئ قسمًا أولًا"
                }
                sub="الصورة، العنوان، والسعر… وباقي التفاصيل اختيارك."
              />
            ))}
          {tab === "settings" && (
            <div className="settings-preview">
              {s.bannerUrl && <img src={s.bannerUrl} alt="البنر الحالي" />}
              <span className="eyebrow">معاينة الإعلان</span>
              <h2>{s.headline}</h2>
              <p>{s.subtitle}</p>
              <small>اسم المتجر: {s.name}</small>
            </div>
          )}
        </section>
      </main>
      {editor && (
        <EditorForm
          editor={editor}
          token={token}
          data={data}
          close={() => setEditor(null)}
          saved={() => {
            setEditor(null);
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
function EditorForm({
  editor,
  token,
  data,
  close,
  saved,
}: {
  editor: Editor;
  token: string;
  data: Catalog;
  close: () => void;
  saved: () => void;
}) {
  const item = editor.item;
  const c = item as Category | undefined,
    p = item as Product | undefined;
  const s = data.settings || defaults;
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const uploadUrl = useMutation(api.uploadUrl),
    saveC = useMutation(api.saveCategory),
    saveP = useMutation(api.saveProduct),
    saveS = useMutation(api.saveSettings),
    discard = useMutation(api.discardUpload);
  const closeForm = () => {
    if (preview) URL.revokeObjectURL(preview);
    close();
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    let uploaded: string | undefined;
    try {
      let image =
        item?.image || (editor.kind === "settings" ? s.banner : undefined);
      if (file) {
        const blob = await toWebP(file);
        const url = await uploadUrl({ token });
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "image/webp" },
          body: blob,
        });
        if (!r.ok) throw Error("تعذر رفع الصورة");
        uploaded = (await r.json()).storageId;
        image = uploaded;
      }
      const val = (key: string) => String(f.get(key) || "").trim();
      if (editor.kind === "category") {
        if (!image) throw Error("أضف صورة القسم");
        await saveC({
          token,
          id: item?._id,
          name: val("name"),
          phone: phoneNumber(val("phone")),
          image,
        });
      } else if (editor.kind === "product") {
        if (!image) throw Error("أضف صورة المنتج");
        await saveP({
          token,
          id: item?._id,
          category: val("category"),
          title: val("title"),
          price: Number(val("price")),
          quantity:
            val("quantity") === "" ? undefined : Number(val("quantity")),
          available: f.get("available") === "on",
          image,
        });
      } else
        await saveS({
          token,
          name: val("name"),
          headline: val("headline"),
          subtitle: val("subtitle"),
          banner: image,
        });
      if (preview) URL.revokeObjectURL(preview);
      saved();
    } catch (err) {
      setError(errorText(err));
      if (uploaded) await discard({ token, image: uploaded }).catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="تحرير المحتوى"
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
            onClick={closeForm}
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <label className="upload-field">
            {preview ||
            item?.imageUrl ||
            (editor.kind === "settings" && s.bannerUrl) ? (
              <img
                src={preview || item?.imageUrl || s.bannerUrl || ""}
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
                  : editor.kind === "product"
                    ? "صورة المنتج"
                    : "صورة البنر (اختياري)"}
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
                  if (preview) URL.revokeObjectURL(preview);
                  setFile(f);
                  setPreview(URL.createObjectURL(f));
                }
              }}
            />
          </label>
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
            </>
          ) : editor.kind === "product" ? (
            <>
              <label>
                القسم
                <select
                  name="category"
                  required
                  defaultValue={p?.category || ""}
                >
                  <option value="" disabled>
                    اختر قسم المنتج
                  </option>
                  {data.categories.map((c) => (
                    <option value={c._id} key={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                  السعر بالدينار العراقي
                  <input
                    type="number"
                    inputMode="decimal"
                    name="price"
                    min="0"
                    max="1000000000000"
                    step="1"
                    required
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
              <label>
                اسم المتجر
                <input
                  name="name"
                  defaultValue={s.name}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                عنوان البنر
                <input
                  name="headline"
                  defaultValue={s.headline}
                  required
                  maxLength={150}
                />
              </label>
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
              {busy ? "جارٍ ضغط الصورة والحفظ…" : "حفظ ونشر"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="subtle"
              onClick={closeForm}
            >
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
