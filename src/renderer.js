/**
 * RENDERER.JS - The "GPU Master"
 * Handles Shaders, Raymarching math, and Raycasting.
 */

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        this.resScale = 0.4; // Retro look. Set to 1.0 for HD.
        
        this.program = this.initProgram();
        this.setupQuad();
        this.atlasTex = this.createAtlas();
        
        this.uLoc = {
            res: this.gl.getUniformLocation(this.program, "u_res"),
            cam: this.gl.getUniformLocation(this.program, "u_cam"),
            rot: this.gl.getUniformLocation(this.program, "u_rot"),
            off: this.gl.getUniformLocation(this.program, "u_off"),
            target: this.gl.getUniformLocation(this.program, "u_target")
        };

        this.resize();
    }

    // --- SHADER SOURCE ---
    get fsSource() {
        return `
            precision highp float;
            uniform vec2 u_res; 
            uniform vec3 u_cam, u_off, u_target;
            uniform vec2 u_rot; 
            uniform sampler2D u_world, u_atlas;

            const vec3 SUN_DIR = normalize(vec3(0.4, 0.8, -0.4));

            bool isSolid(vec3 p) {
                vec3 lp = floor(p) - u_off;
                if(lp.x<0.||lp.x>=63.||lp.y<0.||lp.y>=63.||lp.z<0.||lp.z>=63.) return lp.y < 0.0;
                // WebGL 1.0 3D-to-2D texture mapping
                vec2 uv = (vec2(mod(lp.z, 8.0)*64.0 + lp.x, floor(lp.z/8.0)*64.0 + lp.y) + 0.5) / 512.0;
                return texture2D(u_world, uv).r > 0.5;
            }

            float vertexAO(vec3 p, vec3 t1, vec3 t2) {
                float s1=isSolid(p+t1)?1.:0., s2=isSolid(p+t2)?1.:0., c=isSolid(p+t1+t2)?1.:0.;
                return 1.0 - (s1+s2+c)/3.0;
            }

            void main() {
                // FIXED ASPECT RATIO MATH
                vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
                
                float cx=cos(u_rot.x), sx=sin(u_rot.x), cy=cos(u_rot.y), sy=sin(u_rot.y);
                
                vec3 rd = normalize(vec3(uv, -1.0)); 
                rd = vec3(rd.x, rd.y*cx-rd.z*sx, rd.y*sx+rd.z*cx);
                rd = vec3(rd.x*cy+rd.z*sy, rd.y, -rd.x*sy+rd.z*cy);

                vec3 p=u_cam, m=floor(p), d=abs(1.0/rd), s=sign(rd), side=(s*(m-p)+s*0.5+0.5)*d, mask;
                bool hit=false; float dist=0.0;

                for(int i=0; i<90; i++) {
                    if(isSolid(m)) { hit=true; break; }
                    if(side.x<side.y && side.x<side.z){dist=side.x; side.x+=d.x; m.x+=s.x; mask=vec3(1,0,0);}
                    else if(side.y<side.z){dist=side.y; side.y+=d.y; m.y+=s.y; mask=vec3(0,1,0);}
                    else{dist=side.z; side.z+=d.z; m.z+=s.z; mask=vec3(0,0,1);}
                }

                if(hit) {
                    vec3 nor = mask * -s, hitPos = p + rd * dist;
                    vec2 fP = (mask.x > 0.5) ? fract(hitPos.zy) : (mask.y > 0.5 ? fract(hitPos.xz) : fract(hitPos.xy));
                    
                    // Texture mapping for Grass (Top), Dirt (Sides), Stone (Bottom)
                    vec2 aUV = (nor.y > 0.5) ? fP * 0.5 : (nor.y < -0.5 ? fP * 0.5 + vec2(0.5,0) : vec2(fP.x*0.5, (1.0-fP.y)*0.5 + 0.5));
                    
                    // Ambient Occlusion Calc
                    vec3 t1 = (mask.y > 0.5) ? vec3(1,0,0) : (mask.x > 0.5 ? vec3(0,0,1) : vec3(1,0,0));
                    vec3 t2 = (mask.y > 0.5) ? vec3(0,0,1) : (mask.x > 0.5 ? vec3(0,1,0) : vec3(0,1,0));
                    float ao = pow(mix(mix(vertexAO(m+nor,-t1,-t2), vertexAO(m+nor,t1,-t2), fP.x), mix(vertexAO(m+nor,-t1,t2), vertexAO(m+nor,t1,t2), fP.x), fP.y), 0.7);
                    
                    // Shadow Calc
                    float shd = 1.0; vec3 roS = hitPos + nor*0.01;
                    vec3 mS=floor(roS), dS=abs(1.0/SUN_DIR), sS=sign(SUN_DIR), sideS=(sS*(mS-roS)+sS*0.5+0.5)*dS;
                    for(int i=0; i<25; i++) { if(isSolid(mS)) { shd=0.4; break; } if(sideS.x<sideS.y && sideS.x<sideS.z) sideS.x+=dS.x, mS.x+=sS.x; else if(sideS.y<sideS.z) sideS.y+=dS.y, mS.y+=sS.y; else sideS.z+=dS.z, mS.z+=sS.z; }
                    
                    vec3 tex = texture2D(u_atlas, aUV).rgb;
                    if(floor(m) == floor(u_target)) tex += 0.15; // Highlight targeted block
                    gl_FragColor = vec4(tex * (max(dot(nor, SUN_DIR), 0.0)*shd + 0.3) * ao, 1.0);
                } else {
                    gl_FragColor = vec4(mix(vec3(0.5,0.7,1), vec3(0.1,0.4,0.9), rd.y), 1.0);
                }
            }
        `;
    }

    initProgram() {
        const gl = this.gl;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, `attribute vec2 p; void main(){gl_Position=vec4(p,0,1);}`);
        gl.compileShader(vs);
        
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, this.fsSource);
        gl.compileShader(fs);

        const prog = gl.createProgram();
        gl.attachShader(prog, vs); gl.attachShader(prog, fs);
        gl.linkProgram(prog); gl.useProgram(prog);
        return prog;
    }

    setupQuad() {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), this.gl.STATIC_DRAW);
        const pLoc = this.gl.getAttribLocation(this.program, "p");
        this.gl.enableVertexAttribArray(pLoc);
        this.gl.vertexAttribPointer(pLoc, 2, this.gl.FLOAT, false, 0, 0);
    }

    createAtlas() {
        const data = new Uint8Array(32*32*4);
        for(let i=0; i<32*32; i++) {
            const x = i%32, y = Math.floor(i/32), n = Math.random()*15;
            let r=100+n, g=70+n, b=40;
            if(y<16 && x<16 || (y>=16 && y<20)) { r=110+n; g=160+n; b=60; }
            data[i*4]=r; data[i*4+1]=g; data[i*4+2]=b; data[i*4+3]=255;
        }
        const tex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 32, 32, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        return tex;
    }

    resize() {
        this.canvas.width = Math.floor(window.innerWidth * this.resScale);
        this.canvas.height = Math.floor(window.innerHeight * this.resScale);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    getRaycast(player, world) {
        let rd = { x: -Math.sin(player.rot.y)*Math.cos(player.rot.x), y: Math.sin(player.rot.x), z: -Math.cos(player.rot.y)*Math.cos(player.rot.x) };
        let p = {...player.pos}, m = {x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z)};
        let d = {x: Math.abs(1/rd.x), y: Math.abs(1/rd.y), z: Math.abs(1/rd.z)}, s = {x: Math.sign(rd.x), y: Math.sign(rd.y), z: Math.sign(rd.z)};
        let side = { x: (s.x*(m.x-p.x)+s.x*0.5+0.5)*d.x, y: (s.y*(m.y-p.y)+s.y*0.5+0.5)*d.y, z: (s.z*(m.z-p.z)+s.z*0.5+0.5)*d.z };
        let prevM = {...m};
        for(let i=0; i<8; i++) {
            if(world.isSolid(m.x, m.y, m.z)) return { ...m, nx: prevM.x, ny: prevM.y, nz: prevM.z };
            prevM = {...m};
            if(side.x < side.y && side.x < side.z) { side.x += d.x; m.x += s.x; }
            else if(side.y < side.z) { side.y += d.y; m.y += s.y; }
            else { side.z += d.z; m.z += s.z; }
        }
        return null;
    }

    render(player, world) {
        const gl = this.gl;
        const ray = this.getRaycast(player, world);

        gl.uniform2f(this.uLoc.res, this.canvas.width, this.canvas.height);
        gl.uniform3f(this.uLoc.cam, player.pos.x, player.pos.y, player.pos.z);
        gl.uniform2f(this.uLoc.rot, player.rot.x, player.rot.y);
        gl.uniform3f(this.uLoc.off, world.worldOffset.x, 0, world.worldOffset.z);
        gl.uniform3f(this.uLoc.target, ray ? ray.x : -999, ray ? ray.y : -999, ray ? ray.z : -999);

        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, world.worldTex);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_world"), 0);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_atlas"), 1);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
