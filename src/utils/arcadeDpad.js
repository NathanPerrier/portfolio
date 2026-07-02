import { device } from './device.js';

let dpadEl = null;
const activeKeys = new Set();

const CROSS_BTNS = [
    { area: 'up',    key: 'ArrowUp',    label: '▲' },
    { area: 'left',  key: 'ArrowLeft',  label: '◀' },
    { area: 'right', key: 'ArrowRight', label: '▶' },
    { area: 'down',  key: 'ArrowDown',  label: '▼' },
];

const ACTION_BTNS = [
    { id: 'dpad-b', key: 'Escape', label: 'B' },
    { id: 'dpad-a', key: ' ',      label: 'A' },
];

function fireKey(key, type) {
    document.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
}

function attachButton(btn, key) {
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        if (activeKeys.has(key)) return;
        activeKeys.add(key);
        btn.classList.add('pressed');
        fireKey(key, 'keydown');
    });
    const release = (e) => {
        e.preventDefault();
        if (!activeKeys.has(key)) return;
        activeKeys.delete(key);
        btn.classList.remove('pressed');
        fireKey(key, 'keyup');
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
}

function _create() {
    dpadEl = document.createElement('div');
    dpadEl.id = 'arcade-dpad';

    const left = document.createElement('div');
    left.className = 'dpad-cross';
    CROSS_BTNS.forEach(({ area, key, label }) => {
        const btn = document.createElement('button');
        btn.className = 'dpad-btn';
        btn.setAttribute('data-area', area);
        btn.textContent = label;
        attachButton(btn, key);
        left.appendChild(btn);
    });
    dpadEl.appendChild(left);

    const right = document.createElement('div');
    right.className = 'dpad-actions';
    ACTION_BTNS.forEach(({ id, key, label }) => {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'dpad-btn dpad-action-btn';
        btn.textContent = label;
        attachButton(btn, key);
        right.appendChild(btn);
    });
    dpadEl.appendChild(right);

    document.body.appendChild(dpadEl);
}

export function showArcadeDpad() {
    if (!device.isTouchPrimary) return;
    if (!dpadEl) _create();
    dpadEl.classList.add('is-visible');
}

export function hideArcadeDpad() {
    if (!dpadEl) return;
    dpadEl.classList.remove('is-visible');
    activeKeys.forEach(key => fireKey(key, 'keyup'));
    activeKeys.clear();
    dpadEl.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed'));
}

export function disposeArcadeDpad() {
    hideArcadeDpad();
    if (dpadEl) { dpadEl.remove(); dpadEl = null; }
}
