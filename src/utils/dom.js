export const waitForElement = (id) => {
    return new Promise((resolve) => {
        // Check if the element already exists
        const element = document.getElementById(id);

        // If it exists, resolve immediately
        if (element) {
            resolve(element);
            return;
        }

        // If it doesn't exist, set up a MutationObserver to watch for changes in the DOM
        const observer = new MutationObserver(() => {
            const element = document.getElementById(id);

            // If the element is found, resolve the promise and disconnect the observer
            if (element) {
                resolve(element);
                observer.disconnect();
            }
        });

        // Start observing the document body for child list changes (i.e., elements being added or removed)
        observer.observe(document.body, { childList: true, subtree: true });
    });
};