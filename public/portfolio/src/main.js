// Message listener for mouse control from parent window
window.addEventListener('message', (event) => {
  if (event.data === 'activateMouse') {
    // Enable mouse interactions
    document.body.style.pointerEvents = 'auto';
    document.body.style.cursor = 'pointer';
    console.log('Mouse activated in portfolio iframe');
  } else if (event.data === 'deactivateMouse') {
    // Disable mouse interactions
    document.body.style.pointerEvents = 'none';
    document.body.style.cursor = 'none';
    console.log('Mouse deactivated in portfolio iframe');
  } else if (event.data && typeof event.data === 'object') {
    // Handle mouse events with coordinates
    if (event.data.type === 'click') {
      // Create and dispatch a synthetic click event
      console.log('Mouse click event received:', event.data);
      
      // Debug: Show where the click is happening
      const debugDot = document.createElement('div');
      debugDot.style.position = 'absolute';
      debugDot.style.left = event.data.x + 'px';
      debugDot.style.top = event.data.y + 'px';
      debugDot.style.width = '10px';
      debugDot.style.height = '10px';
      debugDot.style.backgroundColor = 'red';
      debugDot.style.zIndex = '10000';
      debugDot.style.pointerEvents = 'none';
      document.body.appendChild(debugDot);
      setTimeout(() => debugDot.remove(), 1000);
      
      // Find all elements at coordinates
      const elementsAtPoint = document.elementsFromPoint(event.data.x, event.data.y);
      console.log('Elements at click position:', elementsAtPoint);
      
      // Also check what buttons exist on the page
      const allButtons = document.querySelectorAll('button, a, .nes-btn');
      console.log('All clickable elements on page:', allButtons);
      
      // Find the most specific clickable element
      let clickableElement = null;
      
      // First check if any element in the stack is clickable
      for (const element of elementsAtPoint) {
        // Check the element itself
        if (element.matches('a, button, .nes-btn, [onclick]')) {
          clickableElement = element;
          break;
        }
        // Check if any child is clickable
        const clickableChild = element.querySelector('a, button, .nes-btn, [onclick]');
        if (clickableChild) {
          // Check if the click is within the bounds of the clickable child
          const rect = clickableChild.getBoundingClientRect();
          if (event.data.x >= rect.left && event.data.x <= rect.right &&
              event.data.y >= rect.top && event.data.y <= rect.bottom) {
            clickableElement = clickableChild;
            break;
          }
        }
      }
      
      // If still no clickable element, try closest parent
      if (!clickableElement && elementsAtPoint.length > 0) {
        for (const element of elementsAtPoint) {
          const closest = element.closest('a, button, .nes-btn, [onclick]');
          if (closest) {
            clickableElement = closest;
            break;
          }
        }
      }
      
      console.log('Clickable element found:', clickableElement);
      
      if (clickableElement) {
        console.log('Clicked element:', clickableElement);
        
        // Handle anchor links with hash navigation
        if (clickableElement.tagName === 'A' && clickableElement.href) {
          const href = clickableElement.getAttribute('href');
          console.log('Link href:', href);
          
          if (href && href.startsWith('#')) {
            // Internal anchor link - scroll to section
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              console.log('Scrolling to:', targetId);
            }
          } else if (href) {
            // External link - use window.location
            window.location.href = href;
          }
        } else {
          // For other elements, use native click
          clickableElement.click();
        }
      } else {
        console.log('No clickable element found at coordinates');
      }
    } else if (event.data.type === 'mousemove') {
      // Create and dispatch a synthetic mousemove event
      const moveEvent = new MouseEvent('mousemove', {
        clientX: event.data.x,
        clientY: event.data.y,
        bubbles: true,
        cancelable: true
      });
      
      // Find element at coordinates and dispatch event
      const element = document.elementFromPoint(event.data.x, event.data.y);
      if (element) {
        element.dispatchEvent(moveEvent);
        
        // Handle hover effects
        const lastHovered = document.querySelector('.hover');
        if (lastHovered && lastHovered !== element) {
          lastHovered.classList.remove('hover');
          const leaveEvent = new MouseEvent('mouseleave', {
            bubbles: true,
            cancelable: true
          });
          lastHovered.dispatchEvent(leaveEvent);
        }
        
        if (!element.classList.contains('hover')) {
          element.classList.add('hover');
          const enterEvent = new MouseEvent('mouseenter', {
            bubbles: true,
            cancelable: true
          });
          element.dispatchEvent(enterEvent);
        }
      }
    }
  }
});

// Loading animation
window.addEventListener('load', () => {
  const loadingScreen = document.getElementById('loading-screen');
  const app = document.getElementById('app');
  const progressBar = loadingScreen.querySelector('.nes-progress');
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 30;
    if (progress > 100) progress = 100;
    
    progressBar.value = progress;
    
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        app.style.display = 'block';
      }, 50);
    }
  }, 50);
});

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', () => {
  // Set current year dynamically
  const currentYearSpan = document.getElementById('current-year');
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Add retro cursor effect (optional)
  const buttons = document.querySelectorAll('.nes-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
  });
});



