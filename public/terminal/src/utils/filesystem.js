// Helper function to resolve file paths
export function resolvePath(path, currentDirectory) {
  if (path.startsWith('/')) {
    return path;
  }
  
  if (path === '.') {
    return currentDirectory;
  }
  
  if (path === '..') {
    const parts = currentDirectory.split('/').filter(p => p);
    parts.pop();
    return '/' + parts.join('/');
  }
  
  const currentParts = currentDirectory.split('/').filter(p => p);
  const pathParts = path.split('/').filter(p => p);
  
  for (const part of pathParts) {
    if (part === '..') {
      currentParts.pop();
    } else if (part !== '.') {
      currentParts.push(part);
    }
  }
  
  return '/' + currentParts.join('/');
}

// Helper function to get file system item by path
export function getFileSystemItem(path, fileSystem) {
  const parts = path.split('/').filter(p => p);
  let current = fileSystem['/'];
  
  for (const part of parts) {
    if (!current || current.type !== 'directory' || !current.contents[part]) {
      return null;
    }
    current = current.contents[part];
  }
  
  return current;
}

// Update prompt with current directory
export function updatePrompt(currentDirectory) {
  const prompts = document.querySelectorAll('.terminal-prompt');
  const promptText = `nathan@portfolio:${currentDirectory}$ `;
  prompts.forEach(prompt => {
    prompt.textContent = promptText;
  });
}