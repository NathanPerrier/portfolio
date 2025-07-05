export function matrixGame(terminalOutput, terminalBody, terminalInput, addOutput) {
  // Create matrix rain effect in terminal
  const width = 80;
  const height = 20;
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const charArray = chars.split('');
  const drops = new Array(width).fill(0).map(() => Math.floor(Math.random() * height));
  
  // Get current theme colors
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = rootStyles.getPropertyValue('--terminal-text').trim();
  
  let running = true;
  const matrixOutput = document.createElement('div');
  matrixOutput.className = 'matrix-output';
  matrixOutput.style.cssText = 'font-family: monospace; line-height: 1.2; overflow: hidden;';
  terminalOutput.appendChild(matrixOutput);
  
  const draw = () => {
    if (!running) return;
    
    const lines = [];
    for (let y = 0; y < height; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        if (drops[x] === y) {
          line += `<span style="color: #fff; text-shadow: 0 0 5px ${textColor};">${charArray[Math.floor(Math.random() * charArray.length)]}</span>`;
        } else if (drops[x] > y && drops[x] - y < 10) {
          const opacity = 1 - (drops[x] - y) / 10;
          line += `<span style="color: ${textColor}; opacity: ${opacity}">${charArray[Math.floor(Math.random() * charArray.length)]}</span>`;
        } else {
          line += ' ';
        }
      }
      lines.push(line);
    }
    
    matrixOutput.innerHTML = `<pre style="margin: 0; color: ${textColor}; background-color: transparent; border: none; padding: 0;">` + lines.join('\n') + '</pre>';
    matrixOutput.innerHTML += `<div style="color: ${textColor}; margin-top: 10px;">Press Q to exit the Matrix</div>`;
    
    // Update drops
    for (let i = 0; i < drops.length; i++) {
      drops[i]++;
      if (drops[i] > height + 10) {
        drops[i] = 0;
      }
    }
    
    terminalBody.scrollTop = terminalBody.scrollHeight;
  };
  
  const interval = setInterval(draw, 100);
  
  // Exit on any key press
  const exitMatrix = (e) => {
    if (e.key === 'q' || e.key === 'Q') {
      running = false;
      clearInterval(interval);
      document.removeEventListener('keydown', exitMatrix);
      addOutput('Exited the Matrix.');
      terminalInput.focus();
    }
  };
  
  document.addEventListener('keydown', exitMatrix);
  draw();
  
  return '';
}