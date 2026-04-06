---
description: Git workflow and commit conventions for portfolio project
alwaysApply: true
---

## Commit Message Format
Conventional Commits with these prefixes:
- `feat:` - New features (new 3D scenes, interactions)
- `fix:` - Bug fixes (memory leaks, rendering issues)
- `perf:` - Performance improvements (optimizations, asset compression)
- `style:` - Visual changes (CSS, materials, lighting)
- `refactor:` - Code restructuring without functional changes
- `docs:` - Documentation updates
- `build:` - Build system changes (Vite config, dependencies)
- `chore:` - Maintenance tasks

## Message Guidelines
- Use imperative mood: "add scene" not "added scene"
- Keep first line under 72 characters
- Reference specific components: "fix: resolve memory leak in ParticleSystem"
- Include performance impact for perf commits

## Branch Naming
- feature/scene-name
- fix/memory-leak-issue
- perf/mobile-optimization

## Examples
- `feat: add interactive terminal scene`
- `fix: resolve Three.js texture disposal in cleanup`
- `perf: optimize geometry for mobile devices`
- `style: update NES.css button hover states`