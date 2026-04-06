# Portfolio - Interactive 3D Website

A Three.js-powered interactive portfolio website built with JavaScript/ES6 and Vite. Features a 3D scene with physics simulation using Cannon.js, retro NES.css styling, and custom interactive elements.

## Running Tests

No test suite configured yet.

## Architecture

```
portfolio/
├── .claude/                  # Claude Code configuration
│   ├── commands/            # Development workflow commands (/dev, /build, /new-scene)
│   ├── rules/               # Coding standards and conventions
│   └── skills/              # Project-specific development patterns
├── public/                  # Static assets (images, models, audio)
│   ├── assets/             # Images, fonts, textures
│   ├── portfolio/          # Portfolio-specific assets
│   └── terminal/           # Terminal interface assets
├── src/
│   ├── css/                # Stylesheets (NES.css themed)
│   ├── three/              # Three.js scene code, components, materials
│   └── utils/              # Helper functions, device detection
└── vite.config.js          # Vite bundler configuration
```

## Key Commands

- `/dev` — Start Vite development server with hot reload
- `/build` — Build production bundle
- `/new-scene` — Create new Three.js scene component
- `/review` — Code review checklist for 3D web projects

## Development Notes

- Package manager: npm (detected from scripts)
- Bundler: Vite with ES modules
- No TypeScript - pure JavaScript with modern ES6+ features
- Cross-platform: works on all browsers with WebGL support
- File formats: .js for modules, .css for styles, assets in public/

## Critical Rules

<important>
1. All Three.js objects must be properly disposed in cleanup functions to prevent memory leaks
</important>

<important>
2. Use ES6 modules exclusively - all imports/exports should use import/export syntax
</important>

<important>
3. Physics objects (Cannon.js) must be removed from world before disposing Three.js meshes
</important>

4. Animation loops must check for disposed state before rendering
5. Device detection (device-detector-js) required before enabling mobile-specific features
6. NES.css classes should be preserved - avoid custom CSS that conflicts with retro theme
7. Asset loading must show progress indicators using existing loading screen pattern
8. GSAP animations should use timeline approach for complex sequences
9. All event listeners must be cleaned up in component destruction

<important>
10. Camera controls and scene interactions must work on both desktop and mobile
</important>

11. Public assets should be referenced with absolute paths from public/ root
12. Three.js version compatibility: stick to three-stdlib for additional utilities

See .claude/rules/three-js.md for detailed Three.js patterns and .claude/rules/vite-js.md for build configuration.