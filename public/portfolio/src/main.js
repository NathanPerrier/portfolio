const PARENT_ORIGIN = window.location.origin;
const EXTERNAL_LINK_MESSAGE = 'portfolio:open-external-link';
const CLICKABLE_SELECTOR = 'a, button, .nes-btn, [onclick]';

function isMessageFromParent(event) {
  return event.source === window.parent && event.origin === PARENT_ORIGIN;
}

function hasValidPointerCoordinates(data) {
  return Number.isFinite(data.x) && Number.isFinite(data.y);
}

function requestExternalLink(href) {
  let url;

  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }

  if (!['http:', 'https:', 'mailto:'].includes(url.protocol) || window.parent === window) {
    return;
  }

  window.parent.postMessage({
    type: EXTERNAL_LINK_MESSAGE,
    href: url.href
  }, PARENT_ORIGIN);
}

// Message listener for mouse control from the same-origin parent window.
window.addEventListener('message', (event) => {
  if (!isMessageFromParent(event)) return;

  if (event.data === 'activateMouse') {
    document.body.style.pointerEvents = 'auto';
    document.body.style.cursor = 'pointer';
    return;
  }

  if (event.data === 'deactivateMouse') {
    document.body.style.pointerEvents = 'none';
    document.body.style.cursor = 'none';
    return;
  }

  if (!event.data || typeof event.data !== 'object' || !hasValidPointerCoordinates(event.data)) {
    return;
  }

  if (event.data.type === 'click') {
    const elementsAtPoint = document.elementsFromPoint(event.data.x, event.data.y);
    let clickableElement = null;

    for (const element of elementsAtPoint) {
      if (element.matches(CLICKABLE_SELECTOR)) {
        clickableElement = element;
        break;
      }

      const clickableChild = element.querySelector(CLICKABLE_SELECTOR);
      if (clickableChild) {
        const rect = clickableChild.getBoundingClientRect();
        if (event.data.x >= rect.left && event.data.x <= rect.right &&
            event.data.y >= rect.top && event.data.y <= rect.bottom) {
          clickableElement = clickableChild;
          break;
        }
      }
    }

    if (!clickableElement) {
      for (const element of elementsAtPoint) {
        const closest = element.closest(CLICKABLE_SELECTOR);
        if (closest) {
          clickableElement = closest;
          break;
        }
      }
    }

    if (!clickableElement) return;

    if (clickableElement.tagName === 'A' && clickableElement.href) {
      const href = clickableElement.getAttribute('href');

      if (href?.startsWith('#')) {
        const targetElement = document.getElementById(href.substring(1));
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (href) {
        requestExternalLink(href);
      }
      return;
    }

    clickableElement.click();
    return;
  }

  if (event.data.type === 'mousemove') {
    const moveEvent = new MouseEvent('mousemove', {
      clientX: event.data.x,
      clientY: event.data.y,
      bubbles: true,
      cancelable: true
    });

    const element = document.elementFromPoint(event.data.x, event.data.y);
    if (!element) return;

    element.dispatchEvent(moveEvent);

    const lastHovered = document.querySelector('.hover');
    if (lastHovered && lastHovered !== element) {
      lastHovered.classList.remove('hover');
      lastHovered.dispatchEvent(new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true
      }));
    }

    if (!element.classList.contains('hover')) {
      element.classList.add('hover');
      element.dispatchEvent(new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true
      }));
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


