/**
 * MAIN.JS - The "Conductor"
 * Connects the Player, World, and Renderer into a single loop.
 */

import { WorldManager } from './world.js';
import { Player } from './player.js';
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
        window.addEventListener('resize', () => this.renderer.resize());
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement) {
                this.handleInteraction(e.button);
            } else {
                this.canvas.requestPointerLock();
            }
        });

        // Prevent the right-click menu from popping up inside the game
        window.addEventListener('contextmenu', e => e.preventDefault());
    }

    handleInteraction(button) {
        const hit = this.renderer.getRaycast(this.player, this.world);
        if (hit) {
            if (button === 0) { // Left Click: Break
                this.world.setBlock(hit.x, hit.y, hit.z, 0);
            } else if (button === 2) { // Right Click: Place
                this.world.setBlock(hit.nx, hit.ny, hit.nz, 255);
            }
        }
    }

    loop(time) {
        // Delta time for smooth movement
        const dt = Math.min(time - this.lastTime, 100); 
        this.lastTime = time;

        this.player.update(this.world);
        this.world.update(this.player.pos.x, this.player.pos.z);
        this.renderer.render(this.player, this.world);

        // UI Refresh
        if (time % 500 < 20) {
            this.ui.innerText = `POS: ${Math.floor(this.player.pos.x)}, ${Math.floor(this.player.pos.y)}, ${Math.floor(this.player.pos.z)}`;
        }

        requestAnimationFrame((t) => this.loop(t));
    }
}

new Game();
