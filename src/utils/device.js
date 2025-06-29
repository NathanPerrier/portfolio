import { isSupported as isVirtualKeyboardSupported } from 'on-screen-keyboard-detector';

const hasTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const hasMouse = () => window.matchMedia('(pointer:fine)').matches;

// If virtual keyboard is not supported, we can assume a physical keyboard is present.
const hasPhysicalKeyboard = () => !isVirtualKeyboardSupported();

export const device = {
    hasTouch: hasTouch(),
    hasMouse: hasMouse(),
    hasKeyboard: hasPhysicalKeyboard(),
    isTouchOnly: hasTouch() && !hasMouse() && !hasPhysicalKeyboard(),
};