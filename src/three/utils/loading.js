import * as THREE from 'three';

export function createLoadingManager(loadingTextElement) {
    const loadingManager = new THREE.LoadingManager();

    function updateLoadingText(text) {
        if (loadingTextElement) {
            loadingTextElement.textContent += text + '\n';
            loadingTextElement.scrollTop = loadingTextElement.scrollHeight;
        }
    }

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        updateLoadingText(`Loading file: ${url}. Loaded ${itemsLoaded} of ${itemsTotal} files.`);
    };

    return { loadingManager, updateLoadingText };
}
