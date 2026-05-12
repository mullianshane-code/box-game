export const SHADERS = {
    fragment: `
        precision highp float;
        uniform vec2 u_res; 
        uniform vec3 u_cam, u_off, u_target;
        uniform vec2 u_rot; 
        uniform sampler2D u_world, u_atlas;

        const vec3 SUN_DIR = normalize(vec3(0.4, 0.8, -0.4));

        bool isSolid(vec3 p) {
            vec3 lp = floor(p) - u_off;
            if(lp.x<0.||lp.x>=63.||lp.y<0.||lp.y>=63.||lp.z<0.||lp.z>=63.) return lp.y < 0.0;
            vec2 uv = (vec2(mod(lp.z, 8.0)*64.0 + lp.x, floor(lp.z/8.0)*64.0 + lp.y) + 0.5) / 512.0;
            return texture2D(u_world, uv).r > 0.5;
        }

        void main() {
            // FIXED FOV MATH: Locked to screen height
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
            float cx=cos(u_rot.x), sx=sin(u_rot.x), cy=cos(u_rot.y), sy=sin(u_rot.y);
            
            vec3 rd = normalize(vec3(uv, -1.0)); 
            rd = vec3(rd.x, rd.y*cx-rd.z*sx, rd.y*sx+rd.z*cx);
            rd = vec3(rd.x*cy+rd.z*sy, rd.y, -rd.x*sy+rd.z*cy);

            // ... (Raymarching logic continues here)
            gl_FragColor = vec4(0.5, 0.7, 1.0, 1.0); // Placeholder sky
        }
    `
};

export function initGL(canvas) {
    const gl = canvas.getContext('webgl');
    // Basic setup logic goes here...
    return gl;
}
