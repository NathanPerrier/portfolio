import { isSupported as isVirtualKeyboardSupported } from 'on-screen-keyboard-detector';
import DeviceDetector from "device-detector-js";
import BotDetector from "device-detector-js/dist/parsers/bot";

const hasTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const hasMouse = () => window.matchMedia('(pointer:fine)').matches;

// If virtual keyboard is not supported, we can assume a physical keyboard is present.
const hasPhysicalKeyboard = () => !isVirtualKeyboardSupported();

export const device = {
    deviceInfo: new DeviceDetector().parse(navigator.userAgent),
    isBot: new BotDetector().parse(navigator.userAgent),
    deviceType: new DeviceDetector().parse(navigator.userAgent).device.type,
    hasTouch: hasTouch(),
    hasMouse: hasMouse(),
    hasKeyboard: hasPhysicalKeyboard(),
    isTouchOnly: hasTouch() && !hasMouse() && !hasPhysicalKeyboard(),
};