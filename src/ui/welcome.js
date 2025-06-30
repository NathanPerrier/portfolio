export function initNesUI() {
    const hudUI = document.getElementById('hud-ui');
    const hudDialog = document.getElementById('hud-dialog');
    const prevButton = document.getElementById('dialog-prev-btn');
    const nextButton = document.getElementById('dialog-next-btn');
    const closeButton = document.getElementById('dialog-close-btn');
    const dialogPages = document.querySelectorAll('.dialog-page');
    const totalPages = dialogPages.length;
    let currentPage = 1;

    function showPage(pageNumber) {
        dialogPages.forEach(page => {
            page.classList.add('hidden');
        });

        const page = document.getElementById(`dialog-page-${pageNumber}`);
        console.log('Showing page:', pageNumber, page ? page.classList : 'Page not found');
        if (page) {
            page.classList.remove('hidden');
        }
    }

    function updateDialogButtons() {
        console.log('Updating buttons for page:', currentPage);
        if (prevButton) {
            prevButton.style.display = (currentPage > 1) ? 'inline-block' : 'none';
        }
        if (nextButton) {
            nextButton.style.display = (currentPage < totalPages) ? 'inline-block' : 'none';
        }
    }

    function switchDialogPage(direction) {
        console.log('Switching page:', direction);
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
        updateDialogButtons();
    }

    function showDialog() {
        currentPage = 1;
        showPage(currentPage);
        updateDialogButtons();
        hudDialog.showModal();
    }

    function closeDialog() {
        hudUI.style.display = 'none';
        hudDialog.close();
    }

    prevButton.addEventListener('click', () => switchDialogPage('prev'));
    nextButton.addEventListener('click', () => switchDialogPage('next'));
    closeButton.addEventListener('click', () => closeDialog());
}
