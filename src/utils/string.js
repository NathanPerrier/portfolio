export function cleanString(str) {
    const parts = str.split('_');
    const lastPart = parts[parts.length - 1];
    if (!isNaN(parseInt(lastPart, 10))) {
        str = parts.slice(0, -1).join('_');
    }

    return str
}