// Loading animation with matrix effect on welcome text
export function startLoader() {
  const progressFill = document.querySelector('.progress-fill');
  const loader = document.getElementById('loader');
  const app = document.getElementById('app');
  
  // Initially hide the app
  app.style.visibility = 'hidden';
  
  let progress = 0;
  const loadingTime = 1000; // 2 seconds
  const intervalTime = 20; // Update every 20ms
  const increment = 100 / (loadingTime / intervalTime);
  
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      progress += increment;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Hide loader and show app
        setTimeout(() => {
          loader.style.display = 'none';
          app.style.visibility = 'visible';
        
          
          resolve();
        }, 5);
      }
      
      progressFill.style.width = progress + '%';
    }, intervalTime);
  });
}

// Apply matrix-like reveal effect to the welcome text
function applyMatrixEffect() {
  const welcomeText = document.getElementById('welcome-text');
  const originalText = welcomeText.textContent;
  const lines = originalText.split('\n');
  
  // Characters for matrix effect
  const matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Create a 2D array to track revealed characters
  const revealed = lines.map(line => new Array(line.length).fill(false));
  const displayLines = lines.map(line => new Array(line.length).fill(''));
  
  // Function to update display
  const updateDisplay = () => {
    const display = displayLines.map((line, lineIndex) => {
      return line.map((char, charIndex) => {
        if (revealed[lineIndex][charIndex]) {
          return lines[lineIndex][charIndex] || ' ';
        } else {
          return matrixChars[Math.floor(Math.random() * matrixChars.length)];
        }
      }).join('');
    }).join('\n');
    
    welcomeText.textContent = display;
  };
  
  // Reveal characters progressively
  const totalChars = lines.reduce((sum, line) => sum + line.length, 0);
  let revealedCount = 0;
  
  const revealInterval = setInterval(() => {
    // Reveal multiple characters per frame for faster effect
    for (let i = 0; i < 5; i++) {
      if (revealedCount >= totalChars) {
        clearInterval(revealInterval);
        clearInterval(scrambleInterval);
        welcomeText.textContent = originalText;
        break;
      }
      
      // Find a random unrevealed character
      let found = false;
      while (!found) {
        const lineIndex = Math.floor(Math.random() * lines.length);
        const charIndex = Math.floor(Math.random() * lines[lineIndex].length);
        
        if (!revealed[lineIndex][charIndex]) {
          revealed[lineIndex][charIndex] = true;
          revealedCount++;
          found = true;
        }
      }
    }
  }, 10);
  
  // Scramble unrevealed characters
  const scrambleInterval = setInterval(updateDisplay, 50);
}