// img-worker.js
self.onmessage = async (e) => {
  const { id, arrayBuffer, type, maxDim = 1600, quality = 0.72 } = e.data;

  try {
    const inputBlob = new Blob([arrayBuffer], { type: type || 'image/jpeg' });
    let bmp;

    try {
      bmp = await createImageBitmap(inputBlob);
    } catch {
      // Safer fallback: return original bytes instead of hard error
      const originalBuffer = await inputBlob.arrayBuffer();
      self.postMessage(
        { id, buffer: originalBuffer, type: inputBlob.type || 'image/jpeg', passthrough: true },
        [originalBuffer]
      );
      return;
    }

    const srcW = bmp.width;
    const srcH = bmp.height;

    let w = srcW;
    let h = srcH;

    if (w > h && w > maxDim) {
      h = Math.round(h * (maxDim / w));
      w = maxDim;
    } else if (h >= w && h > maxDim) {
      w = Math.round(w * (maxDim / h));
      h = maxDim;
    }

    let outBlob;

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.drawImage(bmp, 0, 0, w, h);
      outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    } else {
      // Fallback to original if OffscreenCanvas is missing
      outBlob = inputBlob;
    }

    const outBuffer = await outBlob.arrayBuffer();
    self.postMessage(
      { id, buffer: outBuffer, type: outBlob.type || 'image/jpeg' },
      [outBuffer]
    );
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
