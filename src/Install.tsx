import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
type Prompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function Install({ admin }: { admin: boolean }) {
  const [event, setEvent] = useState<Prompt | null>(null);
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const standalone =
      matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    if (!standalone && !sessionStorage.getItem("hafhaf-install-" + admin))
      setOpen(true);
    const cb = (e: Event) => {
      e.preventDefault();
      setEvent(e as Prompt);
    };
    const done = () => {
      setOpen(false);
      setEvent(null);
    };
    addEventListener("beforeinstallprompt", cb);
    addEventListener("appinstalled", done);
    return () => {
      removeEventListener("beforeinstallprompt", cb);
      removeEventListener("appinstalled", done);
    };
  }, [admin]);
  const dismiss = () => {
    sessionStorage.setItem("hafhaf-install-" + admin, "1");
    setOpen(false);
  };
  return (
    <>
      <button
        className="icon-button"
        aria-label="تثبيت التطبيق"
        onClick={() => setOpen(true)}
      >
        <Download size={20} />
      </button>
      {open && (
        <div className="install-panel" role="dialog" aria-label="تثبيت التطبيق">
          <button className="close" onClick={dismiss} aria-label="إغلاق">
            <X size={18} />
          </button>
          <span className="app-icon">
            <Smartphone />
          </span>
          <div>
            <strong>
              {admin ? "إدارة الهفهاف" : "متجر مجمع الهفهاف"} على شاشتك
            </strong>
            <p>وصول أسرع، بتجربة تطبيق خفيفة.</p>
          </div>
          {help && (
            <p className="install-help">
              على iPhone: افتح في Safari، ثم مشاركة ← إضافة إلى الشاشة الرئيسية.
              على Android أو اللابتوب: من قائمة المتصفح اختر «تثبيت التطبيق» أو
              «إضافة إلى الشاشة الرئيسية». إذا لم يظهر الخيار، استخدم Chrome أو
              Edge المحدّث.
            </p>
          )}
          <div className="actions">
            <button
              className="primary"
              onClick={async () => {
                if (event) {
                  await event.prompt();
                  const c = await event.userChoice;
                  if (c.outcome === "accepted") dismiss();
                  setEvent(null);
                } else setHelp(true);
              }}
            >
              تثبيت <Download size={16} />
            </button>
            <button className="subtle" onClick={dismiss}>
              تخطّي الآن
            </button>
          </div>
        </div>
      )}
    </>
  );
}
