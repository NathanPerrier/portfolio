let toastElement = null;
let hideTimeout = null;

// Small NES-styled toast for touch-specific hints (styled in css/touch.css)
export function showTouchToast(message, duration = 4000) {
    if (!toastElement) {
        toastElement = document.createElement('div');
        toastElement.id = 'touch-toast';
        toastElement.className = 'nes-balloon is-dark touch-toast';
        document.body.appendChild(toastElement);
    }

    toastElement.textContent = message;
    toastElement.classList.add('is-visible');

    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        toastElement.classList.remove('is-visible');
        hideTimeout = null;
    }, duration);
}

export function disposeTouchToast() {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }
    if (toastElement) {
        toastElement.remove();
        toastElement = null;
    }
}
