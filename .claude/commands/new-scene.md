---
name: new-scene
description: Create new Three.js scene component
allowed_tools: [Read, Write, Glob]
---

## Common Files
- src/three/**/*.js
- src/utils/**/*.js
- public/assets/**/*

## Suggested Sequence
1. Create scene file: `src/three/scenes/NewScene.js`
2. Set up basic Three.js scene structure:
   - Scene, Camera, Renderer references
   - Lighting setup
   - Geometry and materials
3. Add Cannon.js physics world if needed
4. Implement dispose() method for cleanup
5. Add to main scene manager
6. Test memory disposal with dev tools
7. Verify mobile compatibility

## Typical Commit Signals
- "feat: add new 3D scene component"
- "feat: implement physics interaction"
- "fix: resolve scene disposal issue"