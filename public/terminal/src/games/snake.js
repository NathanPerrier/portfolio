export function snakeGame(terminalOutput, terminalBody, terminalInput, addOutput) {
  // Create snake game in terminal
  const gameOutput = document.createElement('div');
  gameOutput.className = 'snake-output';
  gameOutput.style.cssText = 'font-family: monospace; line-height: 1.2;';
  terminalOutput.appendChild(gameOutput);
  
  // Get current theme colors
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = rootStyles.getPropertyValue('--terminal-text').trim();
  const errorColor = rootStyles.getPropertyValue('--terminal-error').trim();
  
  // Game state
  const boardSize = 20;
  let snake = [{x: 10, y: 10}];
  let direction = {x: 1, y: 0};
  let food = {x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize)};
  let score = 0;
  let gameRunning = true;
  
  const drawBoard = () => {
    let board = [];
    
    // Top border
    board.push('┌' + '─'.repeat(boardSize * 2) + '┐');
    
    for (let y = 0; y < boardSize; y++) {
      let row = '│';
      for (let x = 0; x < boardSize; x++) {
        let cell = '  ';
        
        // Check if it's snake head
        if (snake[0].x === x && snake[0].y === y) {
          cell = `<span style="color: ${textColor};">@@</span>`;
        }
        // Check if it's snake body
        else if (snake.some((segment, index) => index > 0 && segment.x === x && segment.y === y)) {
          cell = `<span style="color: ${textColor};">[]</span>`;
        }
        // Check if it's food
        else if (food.x === x && food.y === y) {
          cell = `<span style="color: ${errorColor};">**</span>`;
        }
        
        row += cell;
      }
      row += '│';
      board.push(row);
    }
    
    // Bottom border
    board.push('└' + '─'.repeat(boardSize * 2) + '┘');
    
    gameOutput.innerHTML = `<pre style="margin: 0; color: ${textColor}; background-color: transparent; border: none; padding: 0;">` + board.join('\n') + '</pre>';
    gameOutput.innerHTML += `<div style="color: ${textColor}; margin-top: 5px;">Score: ${score} | Arrow keys to move | Q to quit</div>`;
    
    if (!gameRunning) {
      gameOutput.innerHTML += `<div style="color: ${errorColor}; margin-top: 5px;">GAME OVER! Final Score: ${score}</div>`;
    }
    
    terminalBody.scrollTop = terminalBody.scrollHeight;
  };
  
  const moveSnake = () => {
    if (!gameRunning) return;
    
    const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
    
    // Check collision with walls
    if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
      gameOver();
      return;
    }
    
    // Check collision with self
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      gameOver();
      return;
    }
    
    snake.unshift(head);
    
    // Check if food eaten
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      // Generate new food position that's not on the snake
      do {
        food = {x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize)};
      } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
    } else {
      snake.pop();
    }
    
    drawBoard();
  };
  
  const gameOver = () => {
    gameRunning = false;
    drawBoard();
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'q' || e.key === 'Q') {
      clearInterval(gameInterval);
      document.removeEventListener('keydown', handleKeyPress);
      addOutput('Exited Snake game.');
      terminalInput.focus();
      return;
    }
    
    if (!gameRunning) return;
    
    switch(e.key) {
      case 'ArrowUp':
        if (direction.y === 0) direction = {x: 0, y: -1};
        break;
      case 'ArrowDown':
        if (direction.y === 0) direction = {x: 0, y: 1};
        break;
      case 'ArrowLeft':
        if (direction.x === 0) direction = {x: -1, y: 0};
        break;
      case 'ArrowRight':
        if (direction.x === 0) direction = {x: 1, y: 0};
        break;
    }
    e.preventDefault();
  };
  
  document.addEventListener('keydown', handleKeyPress);
  drawBoard();
  const gameInterval = setInterval(moveSnake, 150);
  
  return '';
}