const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// preloader
let n=0;const pt=setInterval(()=>{n=Math.min(100,n+7+Math.random()*12);preN.textContent=Math.floor(n)+'%';if(n>=100){clearInterval(pt);document.body.classList.add('ready')}},60);
setTimeout(()=>document.body.classList.add('ready'),2500);
// hero video: show only if file exists & plays
const hv=$('.hv');hv.addEventListener('loadeddata',()=>hv.dataset.ok=1);
// trailer: hide "soon" label if video loads
const tv=$('#trailer video');tv.addEventListener('loadedmetadata',()=>$('.soon').remove());tv.preload='metadata';tv.load();
// scroll-highlight words
const w=$('.words');w.innerHTML=w.textContent.trim().split(/\s+/).map(x=>`<span>${x} </span>`).join('');const ws=$$('.words span');
// reveal (IO + fallback)
const rv=$$('.rv');
if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}}),{threshold:.12});rv.forEach(el=>io.observe(el))}else rv.forEach(el=>el.classList.add('on'));
// counters
const cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target,t=+el.dataset.count,t0=performance.now();cio.unobserve(el);const f=now=>{const k=Math.min(1,(now-t0)/1600);el.textContent=Math.floor(t*(1-Math.pow(1-k,3)));k<1&&requestAnimationFrame(f)};requestAnimationFrame(f)}),{threshold:.5});$$('[data-count]').forEach(el=>cio.observe(el));
// scroll loop: progress, parallax, words, horizontal pin
const hs=$('.hs'),tr=$('.hs-track'),par=$$('[data-par]');
let ty=0,cy=0;
function frame(){cy+=(scrollY-cy)*.12;const vh=innerHeight;
 prog.style.width=(scrollY/(document.documentElement.scrollHeight-vh)*100)+'%';
 par.forEach(el=>{const r=el.getBoundingClientRect(),c=r.top+r.height/2-vh/2;el.style.transform=`translate3d(0,${-c*+el.dataset.par}px,0)`});
 const wr=w.getBoundingClientRect(),p=Math.min(1,Math.max(0,(vh*.85-wr.top)/(wr.height+vh*.4)));ws.forEach((s,i)=>s.style.opacity=i/ws.length<p?1:.15);
 if(innerWidth>900){const r=hs.getBoundingClientRect(),k=Math.min(1,Math.max(0,-r.top/(r.height-vh)));tr.style.transform=`translate3d(${-k*(tr.scrollWidth-innerWidth*.86)}px,0,0)`}
 requestAnimationFrame(frame)}frame();
// tilt + magnetic + cursor glow
$$('.tilt').forEach(c=>{c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`perspective(800px) rotateY(${x*10}deg) rotateX(${-y*10}deg) translateY(-6px)`});c.addEventListener('mouseleave',()=>c.style.transform='')});
$$('.mag').forEach(b=>{b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.25}px,${(e.clientY-r.top-r.height/2)*.35}px)`});b.addEventListener('mouseleave',()=>b.style.transform='')});
addEventListener('mousemove',e=>{cur.style.left=e.clientX+'px';cur.style.top=e.clientY+'px'});
// embers
const cv=$('#embers'),cx=cv.getContext('2d');let P=[];
function rs(){cv.width=cv.offsetWidth*devicePixelRatio;cv.height=cv.offsetHeight*devicePixelRatio}rs();addEventListener('resize',rs);
for(let i=0;i<140;i++)P.push(np(true));
function np(a){return{x:Math.random()*cv.width,y:a?Math.random()*cv.height:cv.height+10,r:(Math.random()*2.2+.4)*devicePixelRatio,v:Math.random()*.9+.3,d:Math.random()*6.28,h:Math.random()<.8?30+Math.random()*20:0,l:Math.random()*.6+.4}}
(function em(){cx.clearRect(0,0,cv.width,cv.height);cx.globalCompositeOperation='lighter';P.forEach((p,i)=>{p.y-=p.v*devicePixelRatio;p.d+=.02;p.x+=Math.sin(p.d)*.6;const a=Math.min(1,p.y/cv.height*1.4)*p.l;const g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);g.addColorStop(0,`hsla(${p.h},100%,65%,${a})`);g.addColorStop(1,'hsla(0,0%,0%,0)');cx.fillStyle=g;cx.beginPath();cx.arc(p.x,p.y,p.r*4,0,6.28);cx.fill();if(p.y<-10)P[i]=np()});requestAnimationFrame(em)})();
const S=window.L2STATS||{};if(S.online!=null)online.textContent=S.online;if(S.top&&S.top.length)toptb.innerHTML=S.top.map((p,i)=>`<tr><td>${i+1}</td><td>${p.name}</td><td>${p.clan||''}</td><td>${p.pvp}</td></tr>`).join('');
// frame-busting
if(top!==self){try{top.location=self.location}catch(e){document.documentElement.innerHTML=''}}
// obfuscated phone
(()=>{const d=[32,46,33,34,33,37,47,39,47,35,47].map(c=>String.fromCharCode(c^23)).join(''),f='+'+d[0]+' '+d.slice(1,4)+' '+d.slice(4,7)+'-'+d.slice(7,9)+'-'+d.slice(9);const e=document.getElementById('ph');if(e)e.textContent=f;const b=document.getElementById('phc');b&&b.addEventListener('click',()=>navigator.clipboard&&navigator.clipboard.writeText(f).then(()=>b.textContent='Скопировано'))})();
