export function initNesUI() {
    const hudUI = document.getElementById('hud-ui');
    const hudDialog = document.getElementById('hud-dialog');
    const prevButton = document.getElementById('dialog-prev-btn');
    const nextButton = document.getElementById('dialog-next-btn');
    const closeButton = document.getElementById('dialog-close-btn');
    const dialogPages = document.querySelectorAll('.dialog-page');
    const totalPages = dialogPages.length;
    let currentPage = 1;

    if (localStorage.getItem('welcomeDialogSeen')) {
        hudUI.style.display = 'none';
        return;
    }

    hudUI.style.display = 'block';

    function showPage(pageNumber) {
        dialogPages.forEach(page => {
            page.classList.add('hidden');
        });

        const page = document.getElementById(`dialog-page-${pageNumber}`);
        if (page) {
            page.classList.remove('hidden');
        }
        updateDialogButtons();
    }

    function updateDialogButtons() {
        if (prevButton) {
            prevButton.style.display = (currentPage > 1) ? 'inline-block' : 'none';
        }
        if (nextButton) {
            nextButton.style.display = (currentPage < totalPages) ? 'inline-block' : 'none';
        }
    }

    function switchDialogPage(direction) {
        if (direction === 'next') {
            if (currentPage < totalPages) {
                currentPage++;
            }
        } else { // 'prev'
            if (currentPage > 1) {
                currentPage--;
            }
        }
        showPage(currentPage);
    }

    function showDialog() {
        hudUI.style.display = 'block';
    }

    function closeDialog() {
        hudUI.style.display = 'none';
        hudDialog.close();
        localStorage.setItem('welcomeDialogSeen', 'true');
    }

    updateDialogButtons();

    prevButton.addEventListener('click', () => switchDialogPage('prev'));
    nextButton.addEventListener('click', () => switchDialogPage('next'));
    closeButton.addEventListener('click', () => closeDialog());
}
