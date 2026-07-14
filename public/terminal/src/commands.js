export function createBasicCommands(fileSystem, state, utils) {
  const { resolvePath, getFileSystemItem, updatePrompt } = utils;
  
  return {
    help: () => {
      return fileSystem['/'].contents['help.txt'].content;
    },
    
    ls: (args) => {
      const path = resolvePath(args[0] || '.', state.currentDirectory);
      const dir = getFileSystemItem(path, fileSystem);
      
      if (!dir) {
        return `ls: ${args[0] || '.'}: No such file or directory`;
      }
      
      if (dir.type !== 'directory') {
        return `ls: ${args[0] || '.'}: Not a directory`;
      }
      
      const output = document.createElement('div');
      output.className = 'ls-output';

      Object.keys(dir.contents).forEach(name => {
        const item = dir.contents[name];
        const itemElement = document.createElement('span');
        itemElement.className = `ls-item ${item.type === 'directory' ? 'directory' : 'file'}`;
        itemElement.textContent = `${name}${item.type === 'directory' ? '/' : ''}`;
        output.appendChild(itemElement);
      });
      
      return output;
    },
    
    cat: (args) => {
      if (!args[0]) {
        return 'cat: missing file operand';
      }
      
      const path = resolvePath(args[0], state.currentDirectory);
      const file = getFileSystemItem(path, fileSystem);
      
      if (!file) {
        return `cat: ${args[0]}: No such file or directory`;
      }
      
      if (file.type !== 'file') {
        return `cat: ${args[0]}: Is a directory`;
      }
      
      return file.content;
    },
    
    cd: (args) => {
      const path = args[0] || '/';
      const resolvedPath = resolvePath(path, state.currentDirectory);
      const dir = getFileSystemItem(resolvedPath, fileSystem);
      
      if (!dir) {
        return `cd: ${path}: No such file or directory`;
      }
      
      if (dir.type !== 'directory') {
        return `cd: ${path}: Not a directory`;
      }
      
      state.currentDirectory = resolvedPath;
      updatePrompt(state.currentDirectory);
      return '';
    },
    
    pwd: () => {
      return state.currentDirectory;
    },
    
    clear: (args) => {
      if (!args[0]) {
        // No subcommand provided, show available options
        return `Usage: clear <subcommand>\n\nAvailable subcommands:\n  terminal - Clear the terminal screen\n  history  - Clear command history`;
      } else if (args[0] === 'terminal') {
        // Clear terminal output
        const terminalOutput = document.getElementById('terminal-output');
        terminalOutput.replaceChildren();
        return '';
      } else if (args[0] === 'history') {
        // Clear command history
        state.commandHistory = [];
        state.historyIndex = 0;
        // Clear from localStorage too
        try {
          localStorage.removeItem('terminalCommandHistory');
        } catch (error) {
          console.error('Failed to clear command history:', error);
        }
        return 'Command history cleared.';
      } else {
        return `clear: invalid subcommand '${args[0]}'\n\nUsage: clear <subcommand>\n\nAvailable subcommands:\n  terminal - Clear the terminal screen\n  history  - Clear command history`;
      }
    },
    
    whoami: () => {
      return 'nathan';
    },
    
    date: () => {
      return new Date().toString();
    },
    
    echo: (args) => {
      return args.join(' ');
    },
    
    banner: () => {
      return `███╗   ██╗ █████╗ ████████╗██╗  ██╗ █████╗ ███╗   ██╗
████╗  ██║██╔══██╗╚══██╔══╝██║  ██║██╔══██╗████╗  ██║
██╔██╗ ██║███████║   ██║   ███████║███████║██╔██╗ ██║
██║╚██╗██║██╔══██║   ██║   ██╔══██║██╔══██║██║╚██╗██║
██║ ╚████║██║  ██║   ██║   ██║  ██║██║  ██║██║ ╚████║
╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝

██████╗ ███████╗██████╗ ██████╗ ██╗███████╗██████╗
██╔══██╗██╔════╝██╔══██╗██╔══██╗██║██╔════╝██╔══██╗
██████╔╝█████╗  ██████╔╝██████╔╝██║█████╗  ██████╔╝
██╔═══╝ ██╔══╝  ██╔══██╗██╔══██╗██║██╔══╝  ██╔══██╗
██║     ███████╗██║  ██║██║  ██║██║███████╗██║  ██║
╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`;
    },
    
    neofetch: () => {
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const language = navigator.language;
      const screenRes = `${window.screen.width}x${window.screen.height}`;
      const browserInfo = getBrowserInfo(userAgent);
      const uptime = Math.floor((Date.now() - performance.timing.navigationStart) / 1000);
      
      return `nathan@portfolio
----------------
OS: ${platform}
Browser: ${browserInfo}
Resolution: ${screenRes}
Language: ${language}
Uptime: ${uptime}s
Terminal: v1.0.0
Theme: ${localStorage.getItem('terminalTheme') || 'matrix'}

████████████████
████████████████`;
    }
  };
}

// Helper function for browser detection
function getBrowserInfo(userAgent) {
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}
