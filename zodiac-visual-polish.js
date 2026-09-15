/* Cielo final vivo, ligero y coherente con la intro. No cambia coordenadas ni órbitas. */
(function () {
    'use strict';

    const sky = document.createElement('canvas');
    sky.id = 'final-sky-polish';
    document.body.appendChild(sky);
    const zodiacStars = document.createElement('canvas');
    zodiacStars.id = 'zodiac-star-polish';
    document.body.appendChild(zodiacStars);

    const ctx = sky.getContext('2d', { alpha: false });
    const zctx = zodiacStars.getContext('2d');
    if (!ctx || !zctx) return;

    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let w = 1, h = 1, dpr = 1, stars = [], last = performance.now(), seed = 14062006;

    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function clamp(v,a,b) { return Math.max(a,Math.min(b,v)); }

    function resize() {
        w = window.innerWidth; h = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 1.25);
        sky.width = Math.floor(w*dpr); sky.height = Math.floor(h*dpr);
        zodiacStars.width = Math.floor(w*dpr); zodiacStars.height = Math.floor(h*dpr);
        sky.style.width = w+'px'; sky.style.height = h+'px';
        zodiacStars.style.width = w+'px'; zodiacStars.style.height = h+'px';
        ctx.setTransform(dpr,0,0,dpr,0,0); zctx.setTransform(dpr,0,0,dpr,0,0);
        buildStars();
    }

    function buildStars() {
        const count = reduced ? 120 : 230;
        stars = [];
        for (let i=0;i<count;i++) {
            const roll = rnd();
            const bright = roll > 0.86;
            const medium = !bright && roll > 0.56;
            stars.push({
                x:rnd(), y:rnd(),
                r:bright ? .95+rnd()*1.15 : (medium ? .52+rnd()*.45 : .24+rnd()*.32),
                a:bright ? .48+rnd()*.26 : (medium ? .20+rnd()*.24 : .08+rnd()*.18),
                twinkle:bright ? .25+rnd()*.42 : (medium&&rnd()<.35 ? .18+rnd()*.24 : 0),
                phase:rnd()*Math.PI*2,
                depth:.2+rnd()*.95,
                cross:bright&&rnd()<.34
            });
        }
    }

    function drawStar(g,x,y,r,alpha,cross,phase,t) {
        const pulse = 1 + (cross ? .10*Math.sin(t*.5+phase) : 0);
        const rr = Math.max(.4,r*pulse);
        if (cross && rr>1.05) {
            const ray = rr*2.35;
            g.strokeStyle='rgba(245,248,255,'+(alpha*.22)+')';
            g.lineWidth=.55; g.beginPath();
            g.moveTo(x-ray,y); g.lineTo(x+ray,y); g.moveTo(x,y-ray); g.lineTo(x,y+ray); g.stroke();
        }
        g.fillStyle='rgba(255,255,255,'+alpha+')';
        g.beginPath();
        const points=rr>1.2?4:5;
        for(let i=0;i<points*2;i++){
            const rad=i%2===0?rr:rr*.34;
            const a=-Math.PI/2+i*Math.PI/points;
            const px=x+Math.cos(a)*rad, py=y+Math.sin(a)*rad;
            if(i===0)g.moveTo(px,py);else g.lineTo(px,py);
        }
        g.closePath(); g.fill();
    }

    function drawFinalSky(t) {
        const grad=ctx.createLinearGradient(0,0,0,h);
        grad.addColorStop(0,'#0a1b30'); grad.addColorStop(.42,'#102b46'); grad.addColorStop(.72,'#0a1d34'); grad.addColorStop(1,'#071526');
        ctx.fillStyle=grad; ctx.fillRect(0,0,w,h);
        const driftX=Math.sin(t*.035)*w*.004, driftY=Math.cos(t*.027)*h*.003;
        for(let i=0;i<stars.length;i++){
            const s=stars[i];
            const pulse=s.twinkle ? .84+.16*Math.sin(t*s.twinkle+s.phase):1;
            const x=((s.x*w+driftX*s.depth)%w+w)%w;
            const y=((s.y*h+driftY*s.depth)%h+h)%h;
            drawStar(ctx,x,y,s.r,clamp(s.a*pulse,.025,.88),s.cross,s.phase,t);
        }
    }

    function drawZodiacStars() {
        zctx.clearRect(0,0,w,h);
        if(!document.body.classList.contains('constellation-complete')) return;
        const data=window.ZODIAC_DATA||[], api=window.CelestialSky;
        if(!api||typeof api.getStarScreenPosition!=='function') return;
        for(let c=0;c<data.length;c++){
            const cz=data[c]; if(!cz||!cz.id||!Array.isArray(cz.stars)) continue;
            for(let i=0;i<cz.stars.length;i++){
                const p=api.getStarScreenPosition(cz.id,i); if(!p) continue;
                const mag=Number(cz.stars[i].mag);
                const b=Number.isFinite(mag)?clamp(1.35-(mag+1)*.11,.55,1.25):.9;
                const r=1.05+b*.62;
                drawStar(zctx,p.x,p.y,r,.60+b*.20,r>1.7,i*.73,performance.now()*.001);
            }
        }
    }

    function animate(now){
        const active=document.body.classList.contains('constellation-complete');
        if(active){ drawFinalSky(now*.001); drawZodiacStars(); }
        else { ctx.clearRect(0,0,w,h); zctx.clearRect(0,0,w,h); }
        last=now;
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',()=>{last=performance.now();});
    resize(); requestAnimationFrame(animate);
})();
