/*
 * Intro espacial — renderer WebGL procedural.
 *
 * Reemplaza por completo las versiones anteriores de esta intro.
 * No usa imágenes, partículas DOM ni cientos de trazos Canvas.
 * Un único canvas WebGL renderiza la galaxia y el agujero negro por GPU.
 * La geometría/interacción de Acuario sigue intacta.
 *
 * La idea viene de técnicas públicas de shaders de galaxias y black holes:
 * ruido/fBM, brazos espirales, disco turbulento y lente gravitacional.
 * El código aquí es una implementación propia, reducida para hardware integrado.
 */
(function () {
    'use strict';

    const baseCanvas = document.getElementById('starfield');
    const button = document.getElementById('intro-begin');
    const nebula = document.getElementById('nebula');
    if (!baseCanvas || !button) return;

    const oldImageStage = document.getElementById('cinematic-image-stage');
    if (oldImageStage) oldImageStage.remove();
    const oldPolish = document.getElementById('cinematic-polish-layer');
    if (oldPolish) oldPolish.remove();

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-webgl';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:8;pointer-events:none;display:none;background:#010208;';
    document.body.appendChild(canvas);

    const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
    });

    if (!gl) {
        canvas.remove();
        return;
    }

    const VERTEX = `#version 300 es
        in vec2 aPosition;
        out vec2 vUv;
        void main(){
            vUv = aPosition * 0.5 + 0.5;
            gl_Position = vec4(aPosition,0.0,1.0);
        }
    `;

    const FRAGMENT = `#version 300 es
        precision highp float;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uMode;
        uniform float uProgress;
        uniform float uAspect;
        in vec2 vUv;
        out vec4 outColor;

        #define PI 3.14159265359
        #define TAU 6.28318530718

        float hash21(vec2 p){
            p = fract(p * vec2(123.34,456.21));
            p += dot(p,p+45.32);
            return fract(p.x*p.y);
        }

        float noise2(vec2 p){
            vec2 i=floor(p), f=fract(p);
            f=f*f*(3.0-2.0*f);
            float a=hash21(i), b=hash21(i+vec2(1,0));
            float c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
            return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
        }

        float fbm(vec2 p){
            float s=0.0,a=0.5;
            for(int i=0;i<4;i++){
                s += noise2(p)*a;
                p = p*2.03 + vec2(17.1,11.7);
                a *= 0.5;
            }
            return s;
        }

        vec3 stars(vec2 p,float time){
            vec3 col=vec3(0.004,0.007,0.018);
            float n1=fbm(p*1.6+vec2(time*0.0015,-time*0.001));
            float n2=fbm(p*3.4-vec2(time*0.001,time*0.0012));
            col += vec3(0.025,0.035,0.08)*pow(n1,2.8);
            col += vec3(0.04,0.018,0.05)*pow(n2,4.0);

            vec2 c=floor(p*92.0);
            vec2 f=fract(p*92.0)-0.5;
            float rr=hash21(c);
            float s=smoothstep(0.9965,0.9998,rr)*smoothstep(0.42,0.0,length(f));
            float warm=step(0.88,hash21(c+17.0));
            col += mix(vec3(0.72,0.84,1.0),vec3(1.0,0.66,0.36),warm)*s*0.8;

            vec2 c2=floor(p*174.0+31.7);
            vec2 f2=fract(p*174.0+31.7)-0.5;
            float rr2=hash21(c2+8.1);
            float s2=smoothstep(0.9985,0.9998,rr2)*smoothstep(0.32,0.0,length(f2));
            col += vec3(0.52,0.66,0.95)*s2*0.32;
            return col;
        }

        vec3 galaxy(float time){
            vec2 p=(vUv-0.5)*vec2(uAspect,1.0);
            p += vec2(-0.10,0.02);
            vec3 col=stars(p*1.02,time);

            float r=max(length(p),0.03);
            float a=atan(p.y,p.x);
            float radial=smoothstep(1.4,0.06,r);

            float arms=0.0;
            for(int k=0;k<4;k++){
                float ph=a+log(r)*3.45-time*(0.035+float(k)*0.003)+float(k)*PI*0.5;
                float wave=0.5+0.5*cos(ph);
                arms += pow(max(wave,0.0), k<2 ? 10.0 : 15.0)*(k<2 ? 0.78 : 0.30);
            }
            arms *= radial;

            float gas=fbm(p*5.0+vec2(time*0.012,-time*0.008));
            float dust=fbm(p*12.0-vec2(time*0.006,time*0.009));
            float cloud=smoothstep(0.32,0.78,gas)*smoothstep(0.20,0.86,dust);
            float density=arms*(0.35+0.65*cloud);

            vec3 cool=vec3(0.15,0.24,0.62);
            vec3 vio=vec3(0.42,0.20,0.52);
            vec3 hot=vec3(1.0,0.44,0.13);
            vec3 gc=mix(cool,vio,smoothstep(0.20,0.70,radial));
            gc=mix(gc,hot,pow(radial,2.8)*0.42);
            col += gc*density*0.58;

            float knots=pow(max(noise2(p*24.0+vec2(time*0.018,-time*0.01)),0.0),14.0);
            col += vec3(1.0,0.66,0.34)*knots*density*1.35;
            col += vec3(0.42,0.55,1.0)*knots*density*0.72;

            float core=exp(-r*r*8.5);
            col += vec3(1.0,0.68,0.38)*core*0.18;

            float vig=smoothstep(1.18,0.22,length((vUv-0.5)*vec2(1.02,1.08)));
            col *= 0.62+0.38*vig;
            return col;
        }

        vec3 blackHole(float time,float progress){
            vec2 p=(vUv-0.5)*vec2(uAspect,1.0);
            float zoom=mix(1.0,0.34,smoothstep(0.10,1.0,progress));
            p*=zoom;

            float rr=max(length(p),0.025);
            vec2 dir=p/rr;
            float bend=0.15*progress/(rr+0.16);
            vec2 bgUv=p-dir*bend;
            vec3 col=stars(bgUv,time);

            float r=length(p);
            float a=atan(p.y,p.x);
            float n=noise2(vec2(a*3.2,r*16.0+time*0.06));
            float n2=fbm(vec2(cos(a)*4.2+time*0.015,sin(a)*4.2-time*0.012)+r*2.8);

            float ringR=0.255+0.020*sin(a*3.0+time*0.42);
            float disk=exp(-pow((r-ringR)/0.068,2.0));
            disk*=0.42+0.78*smoothstep(0.30,0.82,n*0.78+n2*0.42);

            // Curvatura vertical y brillo asimétrico para que no se vea como aro.
            float upper=smoothstep(-0.06,0.32,p.y);
            float lower=smoothstep(0.04,-0.38,p.y);
            disk *= 0.58 + upper*1.15 + lower*0.18;

            float breakup=smoothstep(0.22,0.72,noise2(vec2(a*9.0-time*0.30,r*20.0)));
            disk *= 0.38+1.02*breakup;

            float beam=0.55+0.45*cos(a-0.72);
            vec3 plasma=mix(vec3(1.0,0.27,0.045),vec3(1.0,0.90,0.62),pow(max(beam,0.05),1.35));
            plasma *= 0.66+0.72*beam;
            plasma=mix(plasma,vec3(0.30,0.41,1.0),smoothstep(0.58,0.28,r)*0.22);
            col += plasma*disk*(1.0+progress*0.75);

            float halo=exp(-pow((r-0.18)/0.115,2.0))*(0.17+0.24*n2);
            col += vec3(1.0,0.38,0.08)*halo;

            float horizon=smoothstep(0.126,0.158,r);
            col*=horizon;

            float photon=exp(-pow((r-0.145)/0.012,2.0));
            photon*=0.25+0.75*breakup;
            col += vec3(1.0,0.78,0.46)*photon*(0.20+0.28*progress);

            float edge=smoothstep(0.12,1.0,length((vUv-0.5)*vec2(1.0)));
            col*=1.0-0.14*edge*progress;
            return col;
        }

        void main(){
            vec3 col=(uMode<0.5)?galaxy(uTime):blackHole(uTime,uProgress);
            col=1.0-exp(-col*1.18);
            col=pow(col,vec3(0.96));
            outColor=vec4(col,1.0);
        }
    `;

    function compile(type, source){
        const s=gl.createShader(type);
        gl.shaderSource(s,source);
        gl.compileShader(s);
        if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
            console.error('[cinematic-webgl]',gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return null;
        }
        return s;
    }

    const vs=compile(gl.VERTEX_SHADER,VERTEX);
    const fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);
    if(!vs||!fs){ canvas.remove(); return; }

    const program=gl.createProgram();
    gl.attachShader(program,vs);
    gl.attachShader(program,fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
        console.error('[cinematic-webgl]',gl.getProgramInfoLog(program));
        canvas.remove();
        return;
    }

    gl.useProgram(program);
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
        -1,-1, 1,-1, -1,1,
        -1,1, 1,-1, 1,1
    ]),gl.STATIC_DRAW);

    const aPosition=gl.getAttribLocation(program,'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition,2,gl.FLOAT,false,0,0);

    const uResolution=gl.getUniformLocation(program,'uResolution');
    const uTime=gl.getUniformLocation(program,'uTime');
    const uMode=gl.getUniformLocation(program,'uMode');
    const uProgress=gl.getUniformLocation(program,'uProgress');
    const uAspect=gl.getUniformLocation(program,'uAspect');

    const reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let width=0,height=0,renderW=1,renderH=1,startedAt=0,running=false,raf=0;

    function resize(){
        width=window.innerWidth;
        height=window.innerHeight;
        const mobile=width<768;
        const scale=mobile?0.48:0.56;
        const maxPixels=mobile?360000:520000;
        let w=Math.max(480,Math.floor(width*scale));
        let h=Math.max(270,Math.floor(height*scale));
        if(w*h>maxPixels){
            const f=Math.sqrt(maxPixels/(w*h));
            w=Math.floor(w*f);
            h=Math.floor(h*f);
        }
        renderW=Math.max(1,w);
        renderH=Math.max(1,h);
        canvas.width=renderW;
        canvas.height=renderH;
        gl.viewport(0,0,renderW,renderH);
        gl.useProgram(program);
        gl.uniform2f(uResolution,renderW,renderH);
        gl.uniform1f(uAspect,width/Math.max(1,height));
    }

    function musicTime(now){
        const M=window.ExperienceMusic;
        if(M&&typeof M.isPlaying==='function'&&M.isPlaying()&&typeof M.now==='function'){
            const t=M.now();
            if(Number.isFinite(t)&&t>=0)return t;
        }
        return (now-startedAt)/1000;
    }

    function draw(now){
        if(!running)return;
        const raw=musicTime(now);
        const m=reduced?0.42:1;
        const t=raw/m;
        const firstSound=2.43;
        const galaxyEnd=24.5;
        const holeEnd=31.9;

        gl.useProgram(program);
        gl.uniform1f(uTime,raw);

        if(t<firstSound){
            gl.uniform1f(uMode,0.0);
            gl.uniform1f(uProgress,0.0);
            gl.drawArrays(gl.TRIANGLES,0,6);
        }else if(t<galaxyEnd){
            gl.uniform1f(uMode,0.0);
            gl.uniform1f(uProgress,Math.min(1,(t-firstSound)/1.8));
            gl.drawArrays(gl.TRIANGLES,0,6);
        }else if(t<holeEnd){
            const p=Math.max(0,Math.min(1,(t-galaxyEnd)/(holeEnd-galaxyEnd)));
            gl.uniform1f(uMode,1.0);
            gl.uniform1f(uProgress,p);
            gl.drawArrays(gl.TRIANGLES,0,6);
        }else{
            running=false;
            canvas.style.display='none';
            baseCanvas.style.visibility='';
            if(nebula)nebula.style.visibility='';
            cancelAnimationFrame(raf);
            return;
        }

        baseCanvas.style.visibility='hidden';
        if(nebula)nebula.style.visibility='hidden';
        canvas.style.display='block';
        raf=requestAnimationFrame(draw);
    }

    function begin(){
        if(running)return;
        running=true;
        startedAt=performance.now();
        resize();
        baseCanvas.style.visibility='hidden';
        if(nebula)nebula.style.visibility='hidden';
        canvas.style.display='block';
        cancelAnimationFrame(raf);
        raf=requestAnimationFrame(draw);
    }

    window.addEventListener('resize',resize,{passive:true});
    button.addEventListener('click',begin,{capture:false});
    resize();
})();
