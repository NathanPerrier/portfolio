---
name: dev
description: Start Vite development server with hot reload
allowed_tools: [Bash, Read, Write]
---

## Common Files
- vite.config.js
- src/**/*.js
- src/**/*.css
- public/**/*

## Suggested Sequence
1. Check if node_modules exists: `ls node_modules`
2. Install dependencies if needed: `npm install`
3. Start development server: `npm run dev`
4. Server typically runs on http://localhost:5173
5. Vite will show the local URL in the terminal

## Typical Commit Signals
- "feat: add interactive element"
- "fix: resolve Three.js disposal issue"
- "style: update NES.css theme"