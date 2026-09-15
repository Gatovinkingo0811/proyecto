/* Cielo final vivo, coherente con la intro. No cambia coordenadas ni orb itas. */
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
    let w = 1, h = 1, dpr = 1, stars = [], dust = [], seed = 14062006, start = performance.now();

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
        buildSky();
    }

    function buildSky() {
        const count = reduced ? 150 : 390;
        stars = [];
        dust = [];
        for(let i=0;i<count;i++){
            const roll=rnd(), bright=roll>.945, medium=!bright&&roll>.67, tone=rnd();
            stars.push({x:rnd(),y:rnd(),r:bright?1+rnd()*1.25:(medium?.5+rnd()*.58:.16+rnd()*.34),a:bright?.52+rnd()*.27:(medium?.2+rnd()*.25:.06+rnd()*.15),twinkle:bright?.25+rnd()*.5:(medium&&rnd()<.44?.12+rnd()*.34:0),phase:rnd()*Math.PI*2,depth:.18+rnd()*1.1,cross:bright&&rnd()<.52,tone:tone<.09?'warm':tone>.91?'cool':'white'});
        }
        const dc = reduced ? 450 : 1300;
        for(let i=0;i<dc;i++) dust.push({x:rnd(),y:.80-rnd()*.60+(rnd()-.5)*(.035+rnd()*.09),s:.15+rnd()*.5,a:.01+rnd()*.035,p:rnd()*Math.PI*2});
    }

    function drawStar(g,x,y,r,alpha,cross,phase,t,tone){
        const pulse=1+(cross?.08*Math.sin(t*.48+phase):0),rr=Math.max(.35,r*pulse);
        if(cross&&rr>1.05){const ray=rr*2.9;g.strokeStyle=(tone==='cool'?'rgba(200,222,255,':'rgba(250,248,241,')+(alpha*.2)+')';g.lineWidth=.45;g.lineCap='round';g.beginPath();g.moveTo(x-ray,y);g.lineTo(x+ray,y);g.moveTo(x,y-ray);g.lineTo(x,y+ray);g.stroke()}
        const c=tone==='warm'?'255,242,216':tone==='cool'?'224,239,255':'255,255,255';g.fillStyle='rgba('+c+','+alpha+')';g.beginPath();const p=rr>1.2?4:5;for(let i=0;i<p*2;i++){const rad=i%2===0?rr:rr*.3,a=-Math.PI/2+i*Math.PI/p,px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad;if(i===0)g.moveTo(px,py);else g.lineTo(px,py)}g.closePath();g.fill();
    }

    function drawFinalSky(t){
        const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#020711');g.addColorStop(.26,'#06101e');g.addColorStop(.5,'#09182a');g.addColorStop(.76,'#071321');g.addColorStop(1,'#02060d');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
        const haze=[{x:.16,y:.18,r:.43,c:'rgba(42,86,132,.07)'},{x:.76,y:.32,r:.36,c:'rgba(48,62,111,.05)'},{x:.52,y:.8,r:.54,c:'rgba(20,72,112,.045)'}];for(let i=0;i<haze.length;i++){const q=haze[i],rg=ctx.createRadialGradient(q.x*w,q.y*h,0,q.x*w,q.y*h,Math.min(w,h)*q.r);rg.addColorStop(0,q.c);rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,w,h)}
        ctx.save();ctx.translate(w*.03,h*.03);ctx.rotate(-.21);const mw=ctx.createRadialGradient(w*.5,h*.51,0,w*.5,h*.51,w*.62);mw.addColorStop(0,'rgba(222,231,244,.06)');mw.addColorStop(.28,'rgba(174,194,223,.042)');mw.addColorStop(.6,'rgba(123,151,188,.022)');mw.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=mw;ctx.globalAlpha=.76+Math.sin(t*.03)*.03;ctx.fillRect(-w*.18,-h*.05,w*1.36,h*1.12);ctx.restore();
        const dx=Math.sin(t*.045)*w*.004,dy=Math.cos(t*.036)*h*.003;for(let i=0;i<dust.length;i++){const d=dust[i],x=((d.x*w+dx*.15)%w+w)%w,y=((d.y*h+dy*.1)%h+h)%h;ctx.fillStyle='rgba(226,235,247,'+(d.a*(.84+.16*Math.sin(t*.14+d.p)))+')';ctx.fillRect(x,y,d.s,d.s)}
        const driftX=Math.sin(t*.045)*w*.006,driftY=Math.cos(t*.034)*h*.004;for(let i=0;i<stars.length;i++){const s=stars[i],pulse=s.twinkle?.82+.18*Math.sin(t*s.twinkle+s.phase):1,x=((s.x*w+driftX*s.depth)%w+w)%w,y=((s.y*h+driftY*s.depth)%h+h)%h;drawStar(ctx,x,y,s.r,clamp(s.a*pulse,.02,.94),s.cross,s.phase,t,s.tone)}
    }

    function drawZodiacStars(t){
        zctx.clearRect(0,0,w,h);if(!document.body.classList.contains('constellation-complete'))return;const data=window.ZODIAC_DATA||[],api=window.CelestialSky;if(!api||typeof api.getStarScreenPosition!=='function')return;
        for(let c=0;c<data.length;c++){const cz=data[c];if(!cz||!cz.id||!Array.isArray(cz.stars))continue;for(let i=0;i<cz.stars.length;i++){const p=api.getStarScreenPosition(cz.id,i);if(!p)continue;const mag=Number(cz.stars[i].mag),b=Number.isFinite(mag)?clamp(1.35-(mag+1)*.11,.55,1.25):.9,r=1.05+b*.62;drawStar(zctx,p.x,p.y,r,.6+b*.2,r>1.7,i*.73,t,'white')}}
    }

    function animate(now){if(!document.body.classList.contains('constellation-complete')){ctx.clearRect(0,0,w,h);zctx.clearRect(0,0,w,h);requestAnimationFrame(animate);return}const t=(now-start)/1000;drawFinalSky(t);drawZodiacStars(t);requestAnimationFrame(animate)}

    window.addEventListener('resize',resize,{passive:true});resize();requestAnimationFrame(animate);
})();
