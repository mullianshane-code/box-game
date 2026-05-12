/**
 * PLAYER.JS - The "Body & Brain"
 * Handles physics, movement, and input mapping.
 */

export class Player {
    constructor() {
        this.pos = { x: 32.5, y: 25, z: 32.5 };
        this.vel = { x: 0, y: 0, z: 0 };
        this.rot = { x: 0, y: 0 };
        this.speed = 0.15;
        this.gravity = 0.01;
        this.jumpForce = 0.2;
        this.radius = 0.25;

        this.keys = {};
        this.setupInputs();
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Safety: Clear keys if the window loses focus
        window.addEventListener('blur', () => {
            this.keys = {};
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.rot.y -= e.movementX * 0.003;
                this.rot.x = Math.max(-1.4, Math.min(1.4, this.rot.x - e.movementY * 0.003));
            }
        });
    }

    update(world) {
        let dx = 0;
        let dz = 0;

        // Movement Direction
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            dx -= Math.sin(this.rot.y);
            dz -= Math.cos(this.rot.y);
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            dx += Math.sin(this.rot.y);
            dz += Math.cos(this.rot.y);
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            dx -= Math.cos(this.rot.y);
            dz += Math.sin(this.rot.y);
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            dx += Math.cos(this.rot.y);
            dz -= Math.sin(this.rot.y);
        }

        // Horizontal Collision
        const nextX = this.pos.x + dx * this.speed;
        const nextZ = this.pos.z + dz * this.speed;

        if (!world.isSolid(nextX + (dx > 0 ? this.radius : -this.radius), this.pos.y - 1.5, this.pos.z)) {
            this.pos.x = nextX;
        }
        if (!world.isSolid(this.pos.x, this.pos.y - 1.5, nextZ + (dz > 0 ? this.radius : -this.radius))) {
            this.pos.z = nextZ;
        }

        // Vertical Physics
        this.vel.y -= this.gravity;
        const isGrounded = world.isSolid(this.pos.x, this.pos.y - 1.6, this.pos.z);

        if (isGrounded) {
            if (this.vel.y < 0) this.vel.y = 0;
            if (this.keys['Space']) {
                this.vel.y = this.jumpForce;
            }
        }

        this.pos.y += this.vel.y;
    }
}
