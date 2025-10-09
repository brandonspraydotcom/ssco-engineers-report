/* img-worker.js */
self.onmessage = async (e) => {
  const { id, arrayBuffer, type, maxDim = 1600, quality = 0.72 } = e.data;
  try {
    const blob = new Blob([arrayBuffer], { type });
    let bmp;

    // Try GPU-friendly path
    try {
      bmp = await createImageBitmap(blob);
    } catch {
      // Fallback: decode via <img> in worker (not available) → fallback to return original
      postMessage({ id, error: 'decode-failed' });
      return;
    }

    const srcW = bmp.width, srcH = bmp.height;
    let w = srcW, h = srcH;
    if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
    else if (h >= w && h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }

    // Prefer OffscreenCanvas
    let outBlob;
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.drawImage(bmp, 0, 0, w, h);
      outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    } else {
      // Last-ditch: return original if no OffscreenCanvas
      outBlob = blob;
    }

    const outBuffer = await outBlob.arrayBuffer();
    postMessage({ id, buffer: outBuffer, type: outBlob.type }, [outBuffer]);
  } catch (err) {
    postMessage({ id: e.data.id, error: String(err) });
  }
};
