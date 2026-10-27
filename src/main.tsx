import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ConvexProvider,
  ConvexReactClient,
  useQuery,
  useConvexConnectionState,
} from "convex/react";
import { anyApi } from "convex/server";
import {
  Store as StoreIcon,
  ShieldCheck,
  WifiOff,
  Sun,
  Moon,
} from "lucide-react";
import "./style.css";
import Store from "./Store";
import Admin from "./Admin";
import Install from "./Install";
import { defaults, textCSS, type Catalog } from "./types";
import "./theme.css";
const isAdmin = location.pathname.startsWith(
  import.meta.env.BASE_URL + "admin/",
);
class Boundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="empty">
        <h2>تعذر تحميل المتجر</h2>
        <p>تحقق من اتصال الإنترنت ثم حاول مجددًا.</p>
        <button className="primary" onClick={() => location.reload()}>
          إعادة المحاولة
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Live() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const cb = () => setRevision((v) => v + 1);
    addEventListener("hafhaf-auth", cb);
    const timer = setInterval(cb, 60000);
    return () => {
      removeEventListener("hafhaf-auth", cb);
      clearInterval(timer);
    };
  }, []);
  const data = useQuery(anyApi.catalog.catalog, {
    adminToken: isAdmin
      ? sessionStorage.getItem("hafhaf-admin") || undefined
      : undefined,
    refresh: revision,
  }) as Catalog | undefined;
  const lastData = useRef<Catalog | undefined>(undefined);
  if (data) lastData.current = data;
  const state = useConvexConnectionState();
  return (
    <Shell
      data={data || lastData.current}
      connected={state.isWebSocketConnected}
    />
  );
}
function Shell({
  data,
  connected = true,
}: {
  data?: Catalog;
  connected?: boolean;
}) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("hafhaf-theme");
      return saved
        ? saved === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("hafhaf-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "hafhaf-theme") setDark(event.newValue === "dark");
    };
    addEventListener("storage", sync);
    return () => removeEventListener("storage", sync);
  }, []);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const cb = () => setOnline(navigator.onLine);
    addEventListener("online", cb);
    addEventListener("offline", cb);
    return () => {
      removeEventListener("online", cb);
      removeEventListener("offline", cb);
    };
  }, []);
  return (
    <>
      <div className="topline">
        {isAdmin
          ? "إدارة المحتوى • مجمع الهفهاف"
          : "يا هلا بيك، اكتشف الموجود قبل ما تزورنا ✦"}
      </div>
      <header className="site-header">
        <a
          href={import.meta.env.BASE_URL + (isAdmin ? "admin/" : "store/")}
          className="brand"
        >
          <span className="brand-mark">
            <StoreIcon size={25} />
          </span>
          <div>
            <strong style={textCSS(data?.settings?.textStyles?.name)}>
              {data?.settings?.name || defaults.name}
            </strong>
            <small>
              {isAdmin ? "لوحة إدارة المتجر" : "اختيارات أكثر، بمكان واحد"}
            </small>
          </div>
        </a>
        <div className="header-end">
          <button
            className="theme-toggle icon-button"
            aria-label={dark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
            title={dark ? "الوضع النهاري" : "الوضع الليلي"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={21} /> : <Moon size={21} />}
          </button>
          {isAdmin ? (
            <span className="header-tag">
              <ShieldCheck size={16} /> مساحة الإدارة
            </span>
          ) : (
            <span className="header-tag">دليلك للموجود بالمحل</span>
          )}
          {data && <Install admin={isAdmin} />}
        </div>
      </header>
      {(!online || !connected) && (
        <div className="connection">
          <WifiOff size={16} />
          {online
            ? "جارٍ الاتصال بالمتجر…"
            : "أنت غير متصل. الأسعار والتوفر تحتاج اتصالًا بالإنترنت."}
        </div>
      )}
      {data ? (
        isAdmin ? (
          <Admin data={data} />
        ) : (
          <Store data={data} />
        )
      ) : (
        <main className="loading">
          <div className="spinner" />
          <h2>لحظة، نجهز لك المتجر…</h2>
        </main>
      )}
    </>
  );
}
const url = import.meta.env.VITE_CONVEX_URL;
createRoot(document.getElementById("root")!).render(
  <Boundary>
    {url ? (
      <ConvexProvider client={new ConvexReactClient(url)}>
        <Live />
      </ConvexProvider>
    ) : (
      <>
        <div className="setup-note">
          معاينة التصميم — قاعدة البيانات لم تُربط بعد
        </div>
        <Shell data={{ categories: [], products: [], settings: null }} />
      </>
    )}
  </Boundary>,
);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  navigator.serviceWorker
    .register(import.meta.env.BASE_URL + "sw.js", {
      scope: import.meta.env.BASE_URL + (isAdmin ? "admin/" : "store/"),
    })
    .catch(() => {});
