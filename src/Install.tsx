import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { installSupport, installHelp } from "./install-support";

export default function Install({ admin }: { admin: boolean }) {
  const state = useSyncExternalStore(
    installSupport.subscribe,
    installSupport.getSnapshot,
    installSupport.getSnapshot,
  );
  const marker = admin ? "admin" : "store";
  const skipKey = "hafhaf-install-" + admin;
  const [open, setOpen] = useState(
    () => !state.installed && history.state?.hafhafInstall === marker,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const hasSkipped = () => {
    try {
      return !!sessionStorage.getItem(skipKey);
    } catch {
      return false;
    }
  };
  const rememberSkip = () => {
    try {
      sessionStorage.setItem(skipKey, "1");
    } catch {
      /* Storage can be restricted in private browsers. */
    }
  };
  const show = () => {
    if (state.installed || open) return;
    setMessage("");
    if (history.state?.hafhafInstall !== marker)
      history.pushState(
        { ...history.state, hafhafInstall: marker },
        "",
        location.href,
      );
    setOpen(true);
  };
  const dismiss = () => {
    rememberSkip();
    setOpen(false);
    if (history.state?.hafhafInstall === marker) history.back();
  };
  useEffect(() => {
    const onBack = () => {
      const active = history.state?.hafhafInstall === marker;
      setOpen(active && !installSupport.getSnapshot().installed);
      if (!active) rememberSkip();
    };
    addEventListener("popstate", onBack);
    return () => removeEventListener("popstate", onBack);
  }, [marker]);
  useEffect(() => {
    if (state.installed) {
      setOpen(false);
      if (history.state?.hafhafInstall === marker) history.back();
      return;
    }
    // Never advertise a native install action before the browser offers one.
    // Let route effects create deep-link parents before adding the install layer.
    const timer = setTimeout(() => {
      if (
        state.ready &&
        !hasSkipped() &&
        !document.querySelector("dialog[open]")
      )
        show();
    }, 0);
    return () => clearTimeout(timer);
  }, [state.ready, state.installed]);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      previouslyFocused?.focus();
    };
  }, [open]);
  const help = installHelp(navigator.userAgent, navigator.maxTouchPoints);
  if (state.installed) return null;
  return (
    <>
      <button
        className="icon-button"
        aria-label={state.ready ? "تثبيت التطبيق" : "إضافة إلى الشاشة الرئيسية"}
        onClick={show}
      >
        <Download size={20} />
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="install-panel"
          style={{ margin: 0, top: "auto", color: "inherit" }}
          aria-label={state.ready ? "تثبيت التطبيق" : help.title}
          onCancel={(e) => {
            e.preventDefault();
            dismiss();
          }}
        >
          <button className="close" onClick={dismiss} aria-label="إغلاق">
            <X size={18} />
          </button>
          <span className="app-icon">
            {admin ? <Smartphone /> : <img src={import.meta.env.BASE_URL + "store-icon-192.png"} alt="شعار متجر مجمع الهفهاف" style={{width:56,height:56,borderRadius:12,objectFit:"contain"}} />}
          </span>
          <div>
            <strong>
              {admin ? "إدارة الهفهاف" : "متجر مجمع الهفهاف"} على شاشتك
            </strong>
            <p>
              {state.ready
                ? "ثبّت التطبيق للوصول إليه مباشرة من الشاشة الرئيسية."
                : help.title}
            </p>
          </div>
          {!state.ready && !busy && <p className="install-help">{help.text}</p>}
          {message && (
            <p className="install-help" role="status">
              {message}
            </p>
          )}
          <div className="actions">
            {state.ready && (
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setMessage("");
                  const result = await installSupport.request();
                  setBusy(false);
                  if (result === "accepted") dismiss();
                  else if (result === "dismissed") {
                    rememberSkip();
                    setMessage(
                      "تم إلغاء التثبيت. تقدر تضيفه لاحقًا من قائمة المتصفح.",
                    );
                  } else
                    setMessage(
                      "المتصفح لم يفتح التثبيت. اتبع الخطوات الظاهرة أو أكمل استخدام الموقع مباشرة.",
                    );
                }}
              >
                تثبيت <Download size={16} />
              </button>
            )}
            {busy && <p role="status">أكمل الخطوة في نافذة المتصفح…</p>}
            <button className="subtle" onClick={dismiss}>
              {state.ready ? "تخطّي الآن" : "متابعة التصفح"}
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
