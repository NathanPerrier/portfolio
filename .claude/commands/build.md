---
name: build
description: Build production bundle with Vite
allowed_tools: [Bash, Read, Write, Glob]
---

## Common Files
- dist/**/* (output)
- vite.config.js
- src/**/*.js
- public/**/*

## Suggested Sequence
1. Clean previous build: `rm -rf dist`
2. Install dependencies: `npm install`
3. Build production bundle: `npm run build`
4. Check build output: `ls -la dist`
5. Preview build locally: `npm run preview`
6. Verify Three.js assets load correctly
7. Test on mobile viewport

## Typical Commit Signals
- "build: optimize asset loading"
- "fix: resolve production build error"
- "perf: improve Three.js bundle size"