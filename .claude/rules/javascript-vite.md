---
description: JavaScript and Vite configuration standards for portfolio
alwaysApply: true
---

## Language Standards
- **JavaScript Version**: ES2020+ features allowed
- **Module System**: ES6 modules only (import/export)
- **Browser Support**: Modern browsers with WebGL support
- **No TypeScript**: Pure JavaScript with JSDoc for complex functions

## File Conventions
- **Extensions**: .js for modules, .css for styles
- **Entry Point**: main.js or index.js in src/
- **Config Files**: vite.config.js in root

## Vite Configuration
- Development server on default port (5173)
- Asset handling through public/ directory
- ES6 module bundling for production
- Tree shaking enabled for Three.js imports

## Import Patterns
```javascript
// Three.js - import only what you need
import { Scene, PerspectiveCamera, WebGLRenderer } from 'three'

// Full namespace for physics
import * as CANNON from 'cannon-es'

// Utilities with descriptive names
import { detectMobileDevice } from './utils/deviceUtils.js'
```

## Development Workflow
- `npm run dev` - Development with hot reload
- `npm run build` - Production build to dist/
- `npm run preview` - Preview production build

## Asset Management
- Static assets in public/ (models, textures, audio)
- Imported assets in src/ (CSS, JS modules)
- Use absolute paths for public assets: `/assets/models/scene.glb`

## Error Handling
- WebGL capability detection required
- Asset loading error fallbacks
- Mobile device performance warnings