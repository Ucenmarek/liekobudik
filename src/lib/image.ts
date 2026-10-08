/** Zmenší fotku z fotoaparátu, aby nezaberala miesto v telefóne. */
export async function resizeImage(file: File, max = 900): Promise<Blob> {
  const source = await load(file);
  const scale = Math.min(1, max / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(source.image, 0, 0, w, h);
  if ("close" in source.image) source.image.close();
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82);
  });
}

async function load(
  file: File,
): Promise<{ image: ImageBitmap | HTMLImageElement; width: number; height: number }> {
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file);
      return { image: bmp, width: bmp.width, height: bmp.height };
    } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Fotku sa nepodarilo načítať."));
      img.src = url;
    });
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
