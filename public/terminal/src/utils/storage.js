// Load command history from localStorage
export function loadCommandHistory() {
  try {
    const savedHistory = localStorage.getItem('terminalCommandHistory');
    if (savedHistory) {
      return JSON.parse(savedHistory);
    }
  } catch (error) {
    console.error('Failed to load command history:', error);
  }
  return [];
}

// Save command history to localStorage
export function saveCommandHistory(commandHistory) {
  try {
    // Keep only the last 100 commands
    const historyToSave = commandHistory.slice(-100);
    localStorage.setItem('terminalCommandHistory', JSON.stringify(historyToSave));
  } catch (error) {
    console.error('Failed to save command history:', error);
  }
}