## Commit Workflow
- **Style**: Conventional commits with prefixes: feat, fix, perf, style, refactor, docs, build, chore
- **Messages**: Imperative mood, under 72 chars, reference specific components
- **Examples**: "feat: add interactive terminal scene", "fix: resolve Three.js memory leak"

## Architecture
- **Pattern**: Modular 3D component architecture
- **Organization**: Three.js scenes in src/three/, utilities in src/utils/, assets in public/
- **Key Decision**: ES6 modules exclusively for better tree shaking

## Code Style
- **File Naming**: camelCase for JS files, kebab-case for assets
- **Import Style**: Selective Three.js imports, ES6 modules only
- **Export Style**: Named exports preferred over default exports

## Detected Workflows
- `dev`: Start Vite development server with hot reload
- `build`: Create production bundle with asset optimization
- `preview`: Preview production build locally

## Review Reminder
Regenerate this configuration when:
- Three.js version is upgraded
- New 3D frameworks are added
- Build system changes
- Mobile performance requirements change