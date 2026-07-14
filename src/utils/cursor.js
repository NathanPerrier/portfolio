const cursor = document.querySelector(".custom-cursor");
export const frameImage = document.getElementById("frame");
const cursorHome = cursor?.parentElement;
let cursorModal = null;

// A native modal dialog is painted in the browser's top layer, above every
// regular z-index. Moving the decorative cursor into that dialog makes it a
// member of the same layer while preserving the dialog's native focus trap.
export function promoteCursorForDialog(dialog) {
  if (!cursor || !dialog?.open || document.body.classList.contains('input-touch')) {
    return;
  }

  if (cursorModal === dialog) {
    return;
  }

  restoreCursorAfterDialog();
  dialog.append(cursor);
  cursorModal = dialog;
}

export function restoreCursorAfterDialog(dialog) {
  if (!cursor || (dialog && cursorModal && cursorModal !== dialog)) {
    return;
  }

  if (cursorHome?.isConnected) {
    cursorHome.append(cursor);
  }
  cursorModal = null;
}

export function initCursor() {
  const canvas = document.createElement("canvas");
  // The frame is rendered at viewport size. Sampling a viewport-sized copy
  // preserves cursor collision accuracy without duplicating its 8K source
  // bitmap in another full-resolution canvas.
  const sampleWidth = Math.min(
    frameImage.naturalWidth,
    Math.max(1, Math.ceil(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)))
  );
  const sampleHeight = Math.max(
    1,
    Math.round(sampleWidth * (frameImage.naturalHeight / frameImage.naturalWidth))
  );
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

  const cursor = document.querySelector(".custom-cursor");

  let lastGoodX = window.innerWidth / 2;
  let lastGoodY = window.innerHeight / 2;

  document.addEventListener("mousemove", (e) => {
    const rect = frameImage.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
      cursor.style.left = lastGoodX + "px";
      cursor.style.top = lastGoodY + "px";
      return;
    }

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const alpha = pixel[3];
    const TOLERANCE = 215;

    if (alpha <= TOLERANCE) {
      lastGoodX = e.clientX;
      lastGoodY = e.clientY;
    }

    cursor.style.left = lastGoodX + "px";
    cursor.style.top = lastGoodY + "px";
  });
}

document.addEventListener('mousedown', () => {
  cursor?.classList.add('clicking');
});

document.addEventListener('mouseup', () => {
  cursor?.classList.remove('clicking');
});
