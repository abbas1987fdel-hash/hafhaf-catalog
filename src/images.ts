export async function toWebP(file: File): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
  )
    throw Error("اختر صورة JPG أو PNG أو WebP");
  if (file.size > 20 * 1024 * 1024)
    throw Error("الصورة كبيرة جدًا، الحد الأقصى 20 ميغابايت");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(Error("تعذر قراءة الصورة"));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("المتصفح لا يدعم معالجة الصور");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const quality of [0.84, 0.72, 0.6]) {
      blob = await new Promise((r) => canvas.toBlob(r, "image/webp", quality));
      if (blob && blob.size <= 1400000) break;
    }
    if (!blob || blob.type !== "image/webp" || blob.size > 1500000)
      throw Error("تعذر ضغط الصورة، جرّب صورة أصغر أو متصفحًا أحدث");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
