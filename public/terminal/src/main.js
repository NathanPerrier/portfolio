// Import modules
import { snakeGame } from './games/snake.js';
import { matrixGame } from './games/matrix.js';
import { createBasicCommands } from './commands.js';
import { loadSavedTheme, createThemeCommand } from './utils/theme.js';
import { loadCommandHistory, saveCommandHistory } from './utils/storage.js';
import { resolvePath, getFileSystemItem, updatePrompt } from './utils/filesystem.js';
import { startLoader } from './loader.js';

// Terminal state
const state = {
  currentDirectory: '/',
  commandHistory: [],
  historyIndex: -1
};

// Get DOM elements
const terminalInput = document.getElementById('terminal-input');
const terminalOutput = document.getElementById('terminal-output');
const terminalBody = document.getElementById('terminal-body');

// Helper function to add output
function addOutput(content, isError = false) {
  const outputDiv = document.createElement('div');
  outputDiv.className = isError ? 'command-output error-output' : 'command-output';
  outputDiv.innerHTML = content;
  terminalOutput.appendChild(outputDiv);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

// Create utils object for commands
const utils = {
  resolvePath,
  getFileSystemItem,
  updatePrompt
};

// Initialize commands variable
let commands = {};

// Process command input
function processCommand(input) {
  const trimmedInput = input.trim();
  if (!trimmedInput) return;
  
  // Add to history
  state.commandHistory.push(trimmedInput);
  state.historyIndex = state.commandHistory.length;
  
  // Save to localStorage
  saveCommandHistory(state.commandHistory);
  
  // Display the command
  const commandLine = document.createElement('div');
  commandLine.innerHTML = `<span class="terminal-prompt">nathan@portfolio:${state.currentDirectory}$ </span>${trimmedInput}`;
  terminalOutput.appendChild(commandLine);
  
  // Parse command
  const parts = trimmedInput.split(' ');
  const commandName = parts[0];
  const args = parts.slice(1);
  
  // Execute command
  if (commands[commandName]) {
    const result = commands[commandName](args);
    if (result) {
      addOutput(result);
    }
  } else {
    addOutput(`${commandName}: command not found`, true);
  }
}

// Variable to store file system data
let fileSystemData = null;

// Autocomplete functionality
function getAutocompleteOptions(partial) {
  const parts = partial.split(' ');
  const lastPart = parts[parts.length - 1];
  
  if (parts.length === 1) {
    // Command autocomplete
    return Object.keys(commands).filter(cmd => cmd.startsWith(lastPart));
  } else if (fileSystemData) {
    // File/directory autocomplete
    const path = lastPart.includes('/') ? lastPart : '.';
    const dirPath = path.substring(0, path.lastIndexOf('/')) || '.';
    const filePrefix = path.substring(path.lastIndexOf('/') + 1);
    
    const resolvedDirPath = resolvePath(dirPath, state.currentDirectory);
    const dir = getFileSystemItem(resolvedDirPath, fileSystemData);
    
    if (dir && dir.type === 'directory') {
      return Object.keys(dir.contents)
        .filter(name => name.startsWith(filePrefix))
        .map(name => {
          const item = dir.contents[name];
          return name + (item.type === 'directory' ? '/' : '');
        });
    }
  }
  
  return [];
}

// Event listeners
terminalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    processCommand(terminalInput.value);
    terminalInput.value = '';
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const options = getAutocompleteOptions(terminalInput.value);
    
    if (options.length === 1) {
      const parts = terminalInput.value.split(' ');
      parts[parts.length - 1] = options[0];
      terminalInput.value = parts.join(' ');
    } else if (options.length > 1) {
      addOutput(options.join('  '));
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (state.historyIndex > 0) {
      state.historyIndex--;
      terminalInput.value = state.commandHistory[state.historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (state.historyIndex < state.commandHistory.length - 1) {
      state.historyIndex++;
      terminalInput.value = state.commandHistory[state.historyIndex];
    } else {
      state.historyIndex = state.commandHistory.length;
      terminalInput.value = '';
    }
  }
});

// Initialize terminal
async function initialize() {
  // Load saved theme first so loader uses correct colors
  loadSavedTheme();
  
  // Start loader animation
  await startLoader();
  
  // Load file system data
  try {
    const response = await fetch('/terminal/src/fileSystem.json');
    fileSystemData = await response.json();
    
    // Initialize commands with loaded data
    const basicCommands = createBasicCommands(fileSystemData, state, utils);
    const themeCommand = createThemeCommand();
    
    // Combine all commands
    commands = {
      ...basicCommands,
      theme: themeCommand,
      'matrix.exe': () => matrixGame(terminalOutput, terminalBody, terminalInput, addOutput),
      'snake.exe': () => snakeGame(terminalOutput, terminalBody, terminalInput, addOutput)
    };
  } catch (error) {
    console.error('Failed to load file system data:', error);
    addOutput('Error: Failed to load file system', true);
  }
  
  // Load command history
  state.commandHistory = loadCommandHistory();
  state.historyIndex = state.commandHistory.length;
  
  terminalInput.focus();
}

// Start the terminal
initialize();