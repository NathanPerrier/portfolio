---
name: portfolio-conventions
description: Development conventions for interactive 3D portfolio. JavaScript project with Three.js, Vite, and conventional commits.
---

## Overview
Interactive 3D portfolio website built with Three.js, featuring physics simulation, retro NES.css styling, and mobile-responsive design.

## Tech Stack
- Language: JavaScript (ES2020+)
- 3D Engine: Three.js with three-stdlib utilities
- Physics: Cannon.js for realistic physics simulation
- Animation: GSAP for smooth transitions
- Bundler: Vite for fast development and optimized builds
- Styling: NES.css for retro gaming aesthetic
- Package Manager: npm
- No Test Framework: No tests configured yet

## When to Use This Skill
- When implementing new 3D scenes or interactions
- When optimizing performance for mobile devices
- When adding physics-based animations
- When reviewing code for memory leaks

## Commit Conventions
### Commit Style
Conventional Commits

### Prefixes Used
feat, fix, perf, style, refactor, docs, build, chore

### Message Guidelines
- Use imperative mood: "add interactive terminal" not "added terminal"
- Keep under 72 characters
- Reference specific components: "fix: resolve ParticleSystem memory leak"
- Include performance impact for perf commits

## Architecture
### Project Structure
```
portfolio/
├── public/                   # Static assets (models, textures, images)
│   ├── assets/              # Core assets (images, fonts, audio)
│   ├── portfolio/           # Portfolio-specific content
│   └── terminal/            # Terminal interface assets
├── src/
│   ├── css/                 # NES.css themed stylesheets
│   ├── three/               # Three.js components, scenes, materials
│   └── utils/               # Device detection, helper functions
└── vite.config.js           # Vite bundler configuration
```

### Configuration Files
- vite.config.js: Bundler configuration and asset handling
- package.json: Dependencies and npm scripts

### Guidelines
- All Three.js objects must implement dispose() methods
- Physics and rendering loops must check disposed state
- Mobile optimization required for all 3D scenes
- ES6 modules exclusively - no CommonJS

## Code Style
### Language
JavaScript ES2020+ with modern features

### Naming Conventions
- Files: camelCase for JS (sceneManager.js), kebab-case for assets
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase

### Import/Export Style
ES6 modules with selective imports for Three.js:
```javascript
import { Scene, PerspectiveCamera, WebGLRenderer } from 'three'
import * as CANNON from 'cannon-es'
```

## Testing
### Test Framework
No test framework configured

### File Pattern
N/A - No tests yet

### Test Types
Consider adding:
- Unit tests for utility functions
- Visual regression tests for 3D scenes
- Performance tests for mobile devices

## Error Handling
- WebGL capability detection before scene initialization
- Asset loading error fallbacks with user messaging
- Memory disposal error handling in cleanup methods
- Mobile device performance warnings

## Common Workflows

### 1. New Scene Development
- Create scene component in src/three/scenes/
- Implement Three.js scene, camera, renderer setup
- Add Cannon.js physics world if needed
- Implement dispose() method for cleanup
- Test memory disposal and mobile performance
- Integrate with main scene manager

### 2. Asset Integration
- Add assets to appropriate public/ subdirectory
- Use absolute paths from public root
- Implement loading progress indicators
- Add error handling for failed loads
- Test on mobile devices with slower connections

### 3. Performance Optimization
- Profile with browser dev tools
- Check geometry complexity for mobile
- Optimize texture sizes and formats
- Test disposal methods prevent memory leaks
- Verify frame rates on lower-end devices

### 4. Physics Implementation
- Set up Cannon.js world alongside Three.js scene
- Create rigid bodies for interactive objects
- Sync Three.js mesh positions with physics bodies
- Remove bodies from world before mesh disposal
- Test collision detection and response

### 5. Animation Development
- Use GSAP timelines for complex sequences
- Animate Three.js object properties directly
- Implement easing for smooth transitions
- Kill timelines in component disposal
- Test animations on mobile devices

### 6. Mobile Optimization
- Use device-detector-js for capability detection
- Reduce geometry complexity on mobile
- Lower texture resolutions for mobile devices
- Disable resource-intensive effects on low-end devices
- Test touch interactions and responsive design

### 7. Build and Deploy
- Run npm run build to create production bundle
- Test build with npm run preview
- Verify Three.js assets load correctly in production
- Check bundle size and loading performance
- Deploy to static hosting service

## Best Practices
### Do
- Always implement dispose() methods for Three.js components
- Use selective imports from Three.js to reduce bundle size
- Test 3D scenes on mobile devices early and often
- Profile memory usage regularly during development
- Use GSAP timelines for smooth, controllable animations
- Implement progressive loading for large 3D assets
- Follow NES.css design patterns for UI consistency

### Don't
- Create Three.js objects without proper disposal
- Import entire Three.js library - use selective imports
- Ignore mobile device performance limitations
- Skip WebGL capability detection
- Use setInterval for animation loops - use requestAnimationFrame
- Mix ES6 modules with CommonJS requires
- Override NES.css styles without considering theme consistency