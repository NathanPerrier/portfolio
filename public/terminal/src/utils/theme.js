// Theme definitions
export const themes = {
  // Classic themes
  matrix: { bg: '#000', text: '#0f0', prompt: '#0f0', error: '#f00' },
  ocean: { bg: '#001122', text: '#00ffff', prompt: '#0088ff', error: '#ff6b6b' },
  retro: { bg: '#282828', text: '#ebdbb2', prompt: '#fb4934', error: '#cc241d' },
  hacker: { bg: '#0a0a0a', text: '#00ff00', prompt: '#00ff00', error: '#ff0000' },
  
  // New themes
  nes: { bg: '#0f380f', text: '#9bbc0f', prompt: '#8bac0f', error: '#306230' },
  nord: { bg: '#2e3440', text: '#d8dee9', prompt: '#88c0d0', error: '#bf616a' },
  solarized: { bg: '#002b36', text: '#839496', prompt: '#268bd2', error: '#dc322f' },
  monokai: { bg: '#272822', text: '#f8f8f2', prompt: '#a6e22e', error: '#f92672' },
  cyberpunk: { bg: '#0f0f0f', text: '#ff00ff', prompt: '#00ffff', error: '#ff0066' },
  forest: { bg: '#0f1f0f', text: '#8fbc8f', prompt: '#228b22', error: '#cd5c5c' },
  sunset: { bg: '#1a0f0a', text: '#ffa500', prompt: '#ff6347', error: '#dc143c' },
  arctic: { bg: '#f0f8ff', text: '#2f4f4f', prompt: '#4682b4', error: '#b22222' },
  volcano: { bg: '#1a0a0a', text: '#ff8c00', prompt: '#ff4500', error: '#8b0000' },
  galaxy: { bg: '#0a0a1a', text: '#e6e6fa', prompt: '#9370db', error: '#ff1493' },
  mint: { bg: '#001a0f', text: '#98fb98', prompt: '#00fa9a', error: '#ff6b6b' },
  coffee: { bg: '#2b1810', text: '#d2b48c', prompt: '#8b4513', error: '#a0522d' }
};

// Apply theme to the terminal
export function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return false;
  
  document.body.style.backgroundColor = theme.bg;
  document.documentElement.style.setProperty('--terminal-bg', theme.bg);
  document.documentElement.style.setProperty('--terminal-text', theme.text);
  document.documentElement.style.setProperty('--terminal-prompt', theme.prompt);
  document.documentElement.style.setProperty('--terminal-error', theme.error);
  
  // Update existing elements
  const terminal = document.querySelector('.terminal');
  if (terminal) {
    terminal.style.backgroundColor = theme.bg;
    terminal.style.borderColor = theme.text;
  }
  
  const allText = document.querySelectorAll('.terminal-body, .terminal-output, .terminal-prompt, .terminal-input, .welcome-message pre');
  allText.forEach(el => {
    el.style.color = theme.text;
  });
  
  return true;
}

// Load saved theme from localStorage
export function loadSavedTheme() {
  try {
    const savedTheme = localStorage.getItem('terminalTheme');
    if (savedTheme && themes[savedTheme]) {
      applyTheme(savedTheme);
    }
  } catch (error) {
    console.error('Failed to load saved theme:', error);
  }
}

// Create theme command
export function createThemeCommand() {
  return (args) => {
    if (!args[0] || !themes[args[0]]) {
      const currentTheme = localStorage.getItem('terminalTheme') || 'matrix';
      return `Current theme: ${currentTheme}\nAvailable themes: ${Object.keys(themes).join(', ')}\nUsage: theme <theme-name>`;
    }
    
    const success = applyTheme(args[0]);
    if (success) {
      // Save theme preference
      try {
        localStorage.setItem('terminalTheme', args[0]);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
      return `Theme changed to: ${args[0]}`;
    }
    
    return `Failed to apply theme: ${args[0]}`;
  };
}