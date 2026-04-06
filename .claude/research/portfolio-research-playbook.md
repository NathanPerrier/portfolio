## Defaults
- Prefer official Three.js documentation and examples
- Include dates on external references (Three.js versions change frequently)
- Keep evidence trails short (2-3 sources max)
- Prioritize WebGL compatibility and mobile performance considerations

## Suggested Flow
1. Inspect local Three.js code and existing scene patterns first
2. Check project's current Three.js version in package.json
3. Browse Three.js official docs for API specifics
4. Reference Cannon.js docs for physics implementation
5. Check Vite docs for build optimization
6. Summarize findings with code examples

## Repo Signals
- Primary language: JavaScript (ES2020+)
- Key frameworks: Three.js, Cannon.js, GSAP, Vite
- Detected workflows: dev (vite), build (vite build), preview (vite preview)
- 3D Assets: Located in public/ directory with absolute path references
- Styling: NES.css for retro gaming aesthetic

## Research Priorities
1. Three.js memory management and disposal patterns
2. Mobile WebGL performance optimization
3. Vite asset handling for 3D content
4. Cannon.js physics world integration
5. GSAP animation with Three.js objects