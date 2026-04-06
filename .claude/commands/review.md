---
name: review
description: Code review checklist for 3D web portfolio
allowed_tools: [Read, Grep, Glob]
---

## Common Files
- src/**/*.js
- public/**/*
- vite.config.js

## Suggested Sequence
1. **Memory Management**
   - Check all Three.js geometries have .dispose()
   - Verify materials are disposed
   - Ensure textures are disposed
   - Confirm Cannon.js bodies are removed from world

2. **Performance**
   - Review geometry complexity for mobile
   - Check texture sizes are optimized
   - Verify no memory leaks in animation loops
   - Test frame rate on lower-end devices

3. **Code Quality**
   - ES6 modules used consistently
   - Event listeners have cleanup
   - GSAP timelines properly structured
   - Device detection implemented correctly

4. **Asset Loading**
   - Loading screen shows during asset loading
   - Error handling for failed asset loads
   - Progressive loading for large models

5. **Cross-platform**
   - Mobile touch controls work
   - Responsive design maintained
   - WebGL fallback handling

## Typical Commit Signals
- "fix: resolve memory leak in scene"
- "perf: optimize mobile performance"
- "fix: improve error handling"