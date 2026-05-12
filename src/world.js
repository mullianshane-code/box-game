/**
 * WORLD.JS - The "Voxel Factory"
 * Manages terrain generation and the moving local window.
 */

export class WorldManager {
    constructor(gl) {
        this.gl = gl;
        this.size = 64;
        this.chunkMap = new Map(); // Stores permanent changes (edits)
        this.worldData = new Uint8Array(this.size ** 3 * 4);
        this.worldOffset = { x: 0, z: 0 };
        this.lastGridX = -999;
        this.lastGridZ = -999;
        this.isDirty = true;

        this.worldTex = gl.createTexture();
        this.setupTexture();
    }

    // Mathematical terrain - modify this for different landscapes
    getTerrainHeight(x, z) {
        return Math.floor(Math.sin(x * 0.1) * Math.cos(z * 0.1) * 5.0 + 10.0);
    }

    setupTexture() {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.worldTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    isSolid(x, y, z) {
        const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
        const key = `${ix},${iy},${iz}`;
        if (this.chunkMap.has(key)) return this.chunkMap.get(key) > 0;
        return iy < this.getTerrainHeight(ix, iz);
    }

    update(px, pz) {
        const gx = Math.floor(px / 8), gz = Math.floor(pz / 8);
        
        // Optimization: only rebuild texture if we moved 8 blocks or edited the world
        if (gx === this.lastGridX && gz === this.lastGridZ && !this.isDirty) return;
        
        this.lastGridX = gx;
        this.lastGridZ = gz;
        this.isDirty = false;

        const ox = Math.floor(px) - 32;
        const oz = Math.floor(pz) - 32;
        this.worldOffset = { x: ox, z: oz };

        for (let z = 0; z < this.size; z++) {
            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                    const i = (x + y * this.size + z * this.size * this.size) * 4;
                    const wx = x + ox, wz = z + oz;
                    const key = `${wx},${y},${wz}`;
                    
                    const val = this.chunkMap.has(key) 
                        ? this.chunkMap.get(key) 
                        : (y < this.getTerrainHeight(wx, wz) ? 255 : 0);
                    
                    this.worldData[i] = val;
                    this.worldData[i+3] = 255;
                }
            }
        }
        this.uploadToGPU();
    }

    uploadToGPU() {
        const gl = this.gl;
        const atlasSize = 512;
        const dData = new Uint8Array(atlasSize * atlasSize * 4);

        for (let z = 0; z < this.size; z++) {
            const tx = (z % 8) * 64, ty = Math.floor(z / 8) * 64;
            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                    const s = (x + y * this.size + z * this.size * this.size) * 4;
                    const d = ((ty + y) * atlasSize + (tx + x)) * 4;
                    dData[d] = this.worldData[s];
                    dData[d+3] = 255;
                }
            }
        }

        gl.bindTexture(gl.TEXTURE_2D, this.worldTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlasSize, atlasSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, dData);
    }

    setBlock(x, y, z, type) {
        this.chunkMap.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, type);
        this.isDirty = true;
    }
}
