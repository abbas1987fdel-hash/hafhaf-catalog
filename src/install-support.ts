export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export type InstallSnapshot = { ready: boolean; installed: boolean };
export type InstallResult = "accepted" | "dismissed" | "unavailable" | "failed";

/** Listen before React mounts; browser prompt events may arrive at any time. */
export function createInstallSupport(
  target: EventTarget,
  standalone: () => boolean,
) {
  let deferred: InstallPrompt | null = null;
  let wasInstalled = false;
  let snapshot: InstallSnapshot = { ready: false, installed: standalone() };
  const listeners = new Set<() => void>();
  const refresh = () => {
    const installed = wasInstalled || standalone();
    if (installed) deferred = null;
    const next = { ready: !!deferred && !installed, installed };
    if (next.ready === snapshot.ready && next.installed === snapshot.installed)
      return;
    snapshot = next;
    listeners.forEach((fn) => fn());
  };
  const before = (event: Event) => {
    const candidate = event as InstallPrompt;
    if (typeof candidate.prompt !== "function" || !candidate.userChoice) return;
    event.preventDefault();
    if (wasInstalled || standalone()) return;
    deferred = candidate;
    refresh();
  };
  const done = () => {
    wasInstalled = true;
    deferred = null;
    refresh();
  };
  target.addEventListener("beforeinstallprompt", before);
  target.addEventListener("appinstalled", done);
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    refresh,
    request: async (): Promise<InstallResult> => {
      const event = deferred;
      if (!event || snapshot.installed) return "unavailable";
      // Consume synchronously: one user gesture may use each browser event only once.
      deferred = null;
      refresh();
      try {
        await event.prompt();
        return (await event.userChoice).outcome;
      } catch {
        return "failed";
      }
    },
    dispose: () => {
      target.removeEventListener("beforeinstallprompt", before);
      target.removeEventListener("appinstalled", done);
      listeners.clear();
    },
  };
}

export function installHelp(userAgent: string, maxTouchPoints = 0) {
  const ios =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|Instagram|\bwv\b|Line\//i.test(userAgent);
  if (inApp)
    return {
      title: "افتح الرابط في المتصفح",
      text: ios
        ? "من قائمة التطبيق اختَر فتح في Safari، ثم مشاركة ← إضافة إلى الشاشة الرئيسية."
        : "من قائمة التطبيق اختَر فتح في Chrome، ثم من قائمة ⋮ اختَر إضافة إلى الشاشة الرئيسية إن ظهر الخيار.",
    };
  if (ios)
    return {
      title: "إضافة إلى الشاشة الرئيسية",
      text: "افتح الرابط في Safari، اضغط مشاركة، ثم إضافة إلى الشاشة الرئيسية ← إضافة.",
    };
  if (/Android/i.test(userAgent))
    return {
      title: "إضافة إلى الشاشة الرئيسية",
      text: "من قائمة المتصفح ⋮ اختَر إضافة إلى الشاشة الرئيسية أو تثبيت التطبيق إن ظهر. إذا الخيار غير موجود، افتح الرابط في Chrome أو Edge محدّث.",
    };
  return {
    title: "تثبيت من المتصفح",
    text: "من قائمة Chrome أو Edge اختَر تثبيت التطبيق إن ظهر الخيار، أو استخدم أيقونة التثبيت بجانب شريط العنوان.",
  };
}

const browser = typeof window !== "undefined";
const media = browser ? window.matchMedia("(display-mode: standalone)") : null;
export const installSupport = createInstallSupport(
  browser ? window : new EventTarget(),
  () =>
    !!media?.matches ||
    (browser &&
      !!(navigator as Navigator & { standalone?: boolean }).standalone),
);
media?.addEventListener?.("change", installSupport.refresh);
