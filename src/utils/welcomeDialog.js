import { device } from './device.js';
import { promoteCursorForDialog, restoreCursorAfterDialog } from './cursor.js';

export function initNesUI() {
    const hudUI = document.getElementById('hud-ui');
    const hudDialog = document.getElementById('hud-dialog');
    const prevButton = document.getElementById('dialog-prev-btn');
    const nextButton = document.getElementById('dialog-next-btn');
    const closeButton = document.getElementById('dialog-close-btn');
    const dialogPages = document.querySelectorAll('.dialog-page');
    const pageStatus = document.getElementById('dialog-page-status');
    const totalPages = dialogPages.length;
    let currentPage = 1;
    let returnFocusElement = null;
    let shouldRememberDialog = false;

    if (!hudUI || !hudDialog || totalPages === 0) {
        return;
    }

    // Touch devices get joystick instructions instead of WASD
    if (device.isTouchPrimary) {
        const controlsText = document.getElementById('dialog-controls-text');
        const interactionsText = document.getElementById('dialog-interactions-text');
        if (controlsText) {
            controlsText.textContent = 'Use the joystick in the bottom-left corner to walk and drag anywhere else on the screen to look around.';
        }
        if (interactionsText) {
            interactionsText.textContent = 'Some objects in the room are interactable. These are indicated by a white outline. Simply tap an object to interact with it, and use the BACK button to return.';
        }
    }

    if (localStorage.getItem('welcomeDialogSeen')) {
        hudUI.style.display = 'none';
        return;
    }

    function showPage(pageNumber) {
        dialogPages.forEach((page, index) => {
            const isCurrentPage = index + 1 === pageNumber;
            page.classList.toggle('hidden', !isCurrentPage);
            page.hidden = !isCurrentPage;
            page.setAttribute('aria-hidden', String(!isCurrentPage));
        });

        const page = document.getElementById(`dialog-page-${pageNumber}`);
        if (page) {
            hudDialog.setAttribute('aria-labelledby', `dialog-title-${pageNumber}`);
            hudDialog.setAttribute('aria-describedby', `dialog-description-${pageNumber}`);
        }
        if (pageStatus) {
            pageStatus.textContent = `Step ${pageNumber} of ${totalPages}`;
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
        returnFocusElement = document.activeElement instanceof HTMLElement &&
            document.activeElement !== document.body
            ? document.activeElement
            : null;
        hudUI.style.display = 'flex';

        if (!hudDialog.open) {
            if (typeof hudDialog.showModal === 'function') {
                hudDialog.showModal();
            } else {
                hudDialog.setAttribute('open', '');
            }
        }
        promoteCursorForDialog(hudDialog);

        window.requestAnimationFrame(() => {
            const focusTarget = currentPage < totalPages ? nextButton : closeButton;
            focusTarget?.focus();
        });
    }

    function finishDialog() {
        restoreCursorAfterDialog(hudDialog);
        hudUI.style.display = 'none';
        if (shouldRememberDialog) {
            localStorage.setItem('welcomeDialogSeen', 'true');
        }

        const fallbackFocusTarget = document.getElementById('bg');
        const focusTarget = returnFocusElement?.isConnected
            ? returnFocusElement
            : fallbackFocusTarget;
        focusTarget?.focus({ preventScroll: true });
        returnFocusElement = null;
    }

    function closeDialog() {
        shouldRememberDialog = true;
        if (hudDialog.open && typeof hudDialog.close === 'function') {
            hudDialog.close('close');
        } else {
            hudDialog.removeAttribute('open');
            finishDialog();
        }
    }

    prevButton?.addEventListener('click', () => switchDialogPage('prev'));
    nextButton?.addEventListener('click', () => switchDialogPage('next'));
    closeButton?.addEventListener('click', (event) => {
        shouldRememberDialog = true;

        // Native dialogs close through form[method="dialog"]. Retain a small
        // fallback for browsers without dialog support.
        if (typeof hudDialog.showModal !== 'function') {
            event.preventDefault();
            closeDialog();
        }
    });
    hudDialog.addEventListener('cancel', () => {
        shouldRememberDialog = true;
    });
    hudDialog.addEventListener('close', finishDialog);

    showPage(currentPage);
    showDialog();
}
