---
description: Three.js development patterns and memory management
alwaysApply: true
---

## Core Patterns

### Scene Setup
```javascript
class SceneComponent {
  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.disposed = false
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    
    // Dispose geometries and materials
    this.scene.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
    
    this.renderer.dispose()
  }
}
```

## Physics Integration (Cannon.js)
- Create physics world alongside Three.js scene
- Remove bodies from world before disposing meshes
- Step physics world in animation loop

```javascript
// Setup
this.world = new CANNON.World()
this.world.gravity.set(0, -9.82, 0)

// Cleanup
this.world.bodies.forEach(body => this.world.remove(body))
```

## Animation Loops
```javascript
animationLoop() {
  if (this.disposed) return
  
  requestAnimationFrame(() => this.animationLoop())
  
  // Update physics
  this.world.step(1/60)
  
  // Render
  this.renderer.render(this.scene, this.camera)
}
```

## Asset Loading
- Use THREE.LoadingManager for progress tracking
- Show loading screen during asset loading
- Handle loading errors gracefully
- Dispose loaded textures and geometries in cleanup

## Mobile Optimization
- Reduce geometry complexity for mobile
- Lower texture resolutions on mobile devices
- Disable shadows on low-performance devices
- Use device-detector-js to identify mobile

## GSAP Integration
- Use GSAP timelines for complex animations
- Kill timelines in component disposal
- Animate Three.js object properties directly

```javascript
this.timeline = gsap.timeline()
this.timeline.to(this.mesh.position, { duration: 2, x: 5 })

// Cleanup
this.timeline.kill()
```