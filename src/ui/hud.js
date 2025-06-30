export function initNesUI() {
    const nesUI = document.getElementById('nes-ui');

    // Initially hide the UI
    nesUI.style.display = 'none';

    // Show the UI after a delay
    setTimeout(() => {
        nesUI.style.display = 'block';
    }, 5000); // Show after 5 seconds
}