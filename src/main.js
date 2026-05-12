/**
 * MAIN.JS - The "Conductor"
 * Connects the Player, World, and Renderer into a single loop.
 */

import { WorldManager } from './world.js';
import { Player } from './player.js';
// We'll create renderer.js next, but we'll hook it up now
import { Renderer } from './renderer.js';

class Game {
    constructor() {
        this.canvas = document.querySelector('#c');
        this.ui = document.querySelector('#stats');
        
        // Initialize Components
        this.renderer = new Renderer(this.canvas);
        this.world = new WorldManager(this.renderer.gl);
        this.player = new Player();

        this.lastTime = 0;
        this.setupEvents();
        this.loop(0);
    }

    setupEvents() {
        // Handle window resizing to keep the aspect ratio perfect
        window.addEventListener('resize', () => this.renderer.resize());
        
        // Lock pointer on click
        this.canvas.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement) {
                this.handleInteraction(e.button);
            } else {
                this.canvas.requestPointerLock();
            }
        });
    }

    handleInteraction(button) {
        // Raycast from player to see what we're looking at
        // button 0 = left click (break), 2 = right click (place)
        const hit = this.renderer.getRaycast(this.player, this.world);
        if (hit) {
            if (button === 0) {
                this.world.setBlock(hit.x, hit.y, hit.z, 0);
            } else if (button === 2) {
                // Place block at the "normal" (the face we hit)
                this.world.setBlock(hit.nx, hit.ny, hit.nz, 255);
            }
        }
    }

    loop(time) {
        // Calculate Delta Time (dt) to keep movement smooth regardless of FPS
        const dt = time - this.lastTime;
        this.lastTime = time;

        // 1. Update Physics
        this.player.update(this.world);

        // 2. Update World (shifts the 64x64 window around the player)
        this.world.update(this.player.pos.x, this.player.pos.z);

        // 3. Draw Everything
        this.renderer.render(this.player, this.world);

        // Update Debug UI
        if (time % 500 < 20) {
            this.ui.innerText = `X: ${this.player.pos.x.toFixed(1)} Y: ${this.player.pos.y.toFixed(1)} Z: ${this.player.pos.z.toFixed(1)}`;
        }

        requestAnimationFrame((t) => this.loop(t));
    }
}

// Start the game
new Game();
