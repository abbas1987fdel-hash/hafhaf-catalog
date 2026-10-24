// No catalog caching: availability and prices must be retrieved live.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate")
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>متجر الهفهاف</title><body style="font-family:Arial;text-align:center;padding:80px 24px;background:#fafaf6;color:#153e35"><h1>اتصل بالإنترنت لعرض المتجر</h1><p>نحتاج الاتصال حتى نعرض أحدث الأسعار والمنتجات المتوفرة.</p><button onclick="location.reload()" style="padding:15px;background:#153e35;color:white;border:0;border-radius:12px">إعادة المحاولة</button></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
});
