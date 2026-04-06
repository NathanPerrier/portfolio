---
description: JavaScript coding style and file organization for 3D portfolio
alwaysApply: true
---

## File Naming
- JavaScript files: camelCase (sceneManager.js, deviceUtils.js)
- CSS files: kebab-case (main-theme.css, nes-overrides.css)
- Asset files: kebab-case (character-model.glb, retro-font.woff2)

## Import/Export Style
- Use ES6 modules exclusively
- Named exports preferred over default exports
- Group imports: libraries first, then local modules

```javascript
// External libraries
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { gsap } from 'gsap'

// Local modules
import { deviceDetector } from '../utils/deviceDetector.js'
import { sceneManager } from './sceneManager.js'
```

## Code Organization
- Three.js components in src/three/
- Utility functions in src/utils/
- CSS files in src/css/
- Static assets in public/

## Variable Naming
- camelCase for variables and functions
- PascalCase for class constructors
- UPPER_SNAKE_CASE for constants
- Descriptive names for Three.js objects (cubeGeometry, not geometry)

## Function Style
- Arrow functions for short utilities
- Regular functions for class methods
- Always include dispose/cleanup methods for Three.js components