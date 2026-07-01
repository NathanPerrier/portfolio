import * as THREE from 'three'
import { quality } from '../../utils/quality.js'

const PARTICLE_COUNT = Math.round(100 * quality.particleDensity)

// Room bounds (approximate)
const BOUNDS = {
    minX: -5, maxX: 12,
    minY: 0,  maxY: 8,
    minZ: -5, maxZ: 12
}

export function createAmbientParticles(scene) {
    const geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3
        positions[i3]     = BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX)
        positions[i3 + 1] = BOUNDS.minY + Math.random() * (BOUNDS.maxY - BOUNDS.minY)
        positions[i3 + 2] = BOUNDS.minZ + Math.random() * (BOUNDS.maxZ - BOUNDS.minZ)

        // Slow random horizontal drift, very slight downward settle
        velocities[i3]     = (Math.random() - 0.5) * 0.008
        velocities[i3 + 1] = -0.003 - Math.random() * 0.004  // slowly settle downward
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.008
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        sizeAttenuation: true
    })

    const points = new THREE.Points(geometry, material)
    points.userData.velocities = velocities
    scene.add(points)

    return points
}

export function updateAmbientParticles(particles) {
    if (!particles) return

    const positions = particles.geometry.attributes.position.array
    const velocities = particles.userData.velocities

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3

        positions[i3]     += velocities[i3]
        positions[i3 + 1] += velocities[i3 + 1]
        positions[i3 + 2] += velocities[i3 + 2]

        // When a particle settles to the floor, respawn it near the ceiling
        if (positions[i3 + 1] < BOUNDS.minY) {
            positions[i3 + 1] = BOUNDS.maxY
            positions[i3]     = BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX)
            positions[i3 + 2] = BOUNDS.minZ + Math.random() * (BOUNDS.maxZ - BOUNDS.minZ)
        }

        // Wrap X and Z
        if (positions[i3] < BOUNDS.minX) positions[i3] = BOUNDS.maxX
        if (positions[i3] > BOUNDS.maxX) positions[i3] = BOUNDS.minX
        if (positions[i3 + 2] < BOUNDS.minZ) positions[i3 + 2] = BOUNDS.maxZ
        if (positions[i3 + 2] > BOUNDS.maxZ) positions[i3 + 2] = BOUNDS.minZ
    }

    particles.geometry.attributes.position.needsUpdate = true
}

export function disposeAmbientParticles(particles, scene) {
    if (!particles) return
    scene.remove(particles)
    particles.geometry.dispose()
    particles.material.dispose()
}
