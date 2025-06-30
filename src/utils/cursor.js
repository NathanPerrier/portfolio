const cursor = document.querySelector(".custom-cursor");
export const frameImage = document.getElementById("frame");

export function initCursor() {
  const canvas = document.createElement("canvas");
  canvas.width = frameImage.naturalWidth;
  canvas.height = frameImage.naturalHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(frameImage, 0, 0);

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
  cursor.classList.add('clicking');
});

document.addEventListener('mouseup', () => {
  cursor.classList.remove('clicking');
});
