(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const startScreen = document.getElementById('startScreen');
  const endScreen = document.getElementById('endScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const soundBtn = document.getElementById('soundBtn');
  const keys = Object.create(null);
  const platforms = [
    {x:265,y:365,w:125,h:18},{x:475,y:310,w:115,h:18},{x:670,y:370,w:145,h:18},
    {x:1120,y:355,w:130,h:18},{x:1340,y:300,w:125,h:18},{x:1540,y:350,w:150,h:18},
    {x:1840,y:360,w:150,h:18},{x:2080,y:305,w:135,h:18},{x:2290,y:360,w:140,h:18},
    {x:2560,y:320,w:150,h:18},{x:2810,y:365,w:130,h:18}
  ];
  const ground = [{x:0,w:850},{x:990,w:760},{x:1870,w:770},{x:2750,w:760}];
  const coinSpots = [
    [300,326],[340,326],[380,326],[510,270],[550,270],[710,330],[760,330],
    [920,375],[1040,380],[1160,315],[1200,315],[1380,260],[1420,260],[1580,310],
    [1785,385],[1900,320],[1940,320],[2120,265],[2160,265],[2330,320],[2450,385],
    [2600,280],[2640,280],[2840,325],[2900,325],[3100,380],[3190,380]
  ];
  const enemySpawns = [
    {x:550,min:500,max:630},{x:730,min:685,max:820},{x:1085,min:1030,max:1100},
    {x:1450,min:1280,max:1510},{x:1680,min:1580,max:1710},{x:1990,min:1890,max:2040},
    {x:2380,min:2320,max:2520},{x:2900,min:2800,max:3000}
  ];
  const goalX = 3370;
  let state = 'title', camera = 0, score = 0, lives = 3, frame = 0, soundOn = false;
  let player, coins, enemies, particles = [], audioCtx = null, toastTimer = 0;
  let lastTime = 0;

  function resetGame() {
    player = {x:72,y:382,w:34,h:53,vx:0,vy:0,face:1,onGround:false,invuln:0,anim:0,prevBottom:435};
    coins = coinSpots.map(([x,y]) => ({x,y,taken:false,phase:Math.random()*6.28}));
    enemies = enemySpawns.map((e,i) => ({...e,x:e.x,y:411,w:32,h:34,dir:i%2?1:-1,alive:true,speed:0.65+(i%3)*0.12}));
    score = 0; lives = 3; camera = 0; particles = []; frame = 0;
    updateHud();
  }
  resetGame();

  function updateHud() {
    document.getElementById('lives').textContent = lives;
    document.getElementById('coinCount').textContent = String(score).padStart(2,'0');
    document.getElementById('missionText').textContent = player && player.x > 3200 ? 'KEMBALI KE DESA' : 'TEMUKAN GULUNGAN';
  }
  function beep(freq=520,duration=.08,type='sine') {
    if (!soundOn) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.055,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
      o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);
    } catch (_) {}
  }
  function showToast(text) {
    const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');toastTimer=55;
  }
  function startGame() {
    resetGame();state='playing';startScreen.classList.add('hidden');endScreen.classList.add('hidden');pauseScreen.classList.add('hidden');
    document.getElementById('tipText').textContent='Lompat di atas musuh untuk mengalahkannya.';
    canvas.focus();
  }
  function togglePause() {
    if(state==='playing'){state='paused';pauseScreen.classList.remove('hidden')}
    else if(state==='paused'){state='playing';pauseScreen.classList.add('hidden')}
  }
  function endGame(won) {
    state=won?'won':'lost';endScreen.classList.remove('hidden');
    document.getElementById('endEyebrow').innerHTML=won?'<span></span> MISI SELESAI':'<span></span> MISI GAGAL';
    document.getElementById('endTitle').innerHTML=won?'KERJA BAGUS,<br><em>NARUTO!</em>':'COBA LAGI,<br><em>NINJA!</em>';
    document.getElementById('endCopy').textContent=won?'Gulungan sudah kembali ke desa. Hokage bangga padamu!':'Tak apa, ninja hebat selalu bangkit lagi.';
    document.getElementById('finalCoins').textContent=String(score).padStart(2,'0');
  }
  startBtn.addEventListener('click',startGame);restartBtn.addEventListener('click',startGame);resumeBtn.addEventListener('click',togglePause);pauseBtn.addEventListener('click',togglePause);
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;document.getElementById('soundIcon').textContent=soundOn?'♫':'♩';soundBtn.setAttribute('aria-label',soundOn?'Suara aktif':'Suara nonaktif');if(soundOn)beep(660,.1)});
  window.addEventListener('keydown',e=>{
    const key=e.key.toLowerCase();keys[key]=true;
    if([' ','arrowleft','arrowright','arrowup'].includes(key))e.preventDefault();
    if((key===' '||key==='arrowup'||key==='w')&&!e.repeat)jump();
    if(key==='escape'||key==='p')togglePause();
    if((key==='enter')&&(state==='title'||state==='won'||state==='lost'))startGame();
  });
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
  window.addEventListener('blur',()=>{for(const key in keys)keys[key]=false;if(state==='playing')togglePause()});
  document.querySelectorAll('.mobile-controls button').forEach(button=>{
    const control=button.dataset.control;
    const down=e=>{e.preventDefault();keys[control]=true;if(control==='jump')jump()};
    const up=e=>{e.preventDefault();keys[control]=false};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointerleave',up);button.addEventListener('pointercancel',up);
  });

  function jump() {
    if(state!=='playing'||!player.onGround)return;
    player.vy=-10.9;player.onGround=false;beep(390,.09,'triangle');
    burst(player.x+player.w/2,player.y+player.h, '#e8d9ad',5);
  }
  function isGroundedAt(x) { return ground.some(g=>x+player.w>g.x&&x<g.x+g.w); }
  function update(dt) {
    frame++;
    if(toastTimer>0&&!--toastTimer)document.getElementById('toast').classList.remove('show');
    if(state!=='playing')return;
    const p=player;p.anim+=dt*.012;
    const left=keys.arrowleft||keys.a||keys.left,right=keys.arrowright||keys.d||keys.right;
    if(left){p.vx-=.48*dt;p.face=-1} if(right){p.vx+=.48*dt;p.face=1}
    if(!left&&!right)p.vx*=Math.pow(.78,dt/16.67);
    p.vx=Math.max(-4.3,Math.min(4.3,p.vx));
    const oldX=p.x,oldY=p.y;p.prevBottom=p.y+p.h;
    p.x+=p.vx*dt/16.67;p.x=Math.max(0,Math.min(goalX+100,p.x));
    p.vy=Math.min(12,p.vy+.52*dt/16.67);p.y+=p.vy*dt/16.67;p.onGround=false;
    for(const platform of platforms){
      if(p.x+p.w>platform.x+4&&p.x<platform.x+platform.w-4&&p.prevBottom<=platform.y+5&&p.y+p.h>=platform.y&&p.vy>=0){p.y=platform.y-p.h;p.vy=0;p.onGround=true}
    }
    for(const g of ground){
      if(p.x+p.w>g.x&&p.x<g.x+g.w&&p.prevBottom<=445&&p.y+p.h>=445&&p.vy>=0){p.y=445-p.h;p.vy=0;p.onGround=true}
    }
    // Keep side collisions forgiving; horizontal momentum is damped when pressing into a wall.
    if(p.y>H+80){hurt(true)}
    if(p.invuln>0)p.invuln-=dt;
    for(const c of coins){
      if(c.taken)continue;const bob=Math.sin(frame*.08+c.phase)*3;
      if(p.x<c.x+13&&p.x+p.w>c.x-13&&p.y<c.y+bob+14&&p.y+p.h>c.y+bob-14){c.taken=true;score++;updateHud();beep(760+score*12,.08,'sine');burst(c.x,c.y,'#ffd56d',8);showToast('+1 KOIN')}
    }
    for(const e of enemies){
      if(!e.alive)continue;
      const support=ground.find(g=>e.x+e.w>g.x&&e.x<g.x+g.w);
      const platform=platforms.find(q=>e.x+e.w>q.x&&e.x<q.x+q.w&&Math.abs(q.y-445)<2);
      e.y=support?411:(platform?platform.y-e.h:411);
      e.x+=e.dir*e.speed*dt/16.67;
      if(e.x<e.min||e.x+e.w>e.max){e.dir*=-1;e.x=Math.max(e.min,Math.min(e.max-e.w,e.x))}
      if(p.x<e.x+e.w-3&&p.x+p.w>e.x+3&&p.y<e.y+e.h&&p.y+p.h>e.y+5){
        if(p.vy>1&&p.prevBottom<=e.y+13){e.alive=false;p.vy=-7.6;burst(e.x+16,e.y+10,'#ffc064',9);beep(180,.13,'square');showToast('MANTAP!');}
        else if(p.invuln<=0)hurt(false);
      }
    }
    for(const q of particles){q.x+=q.vx*dt/16.67;q.y+=q.vy*dt/16.67;q.vy+=.12*dt/16.67;q.life-=dt/16.67}
    particles=particles.filter(q=>q.life>0);
    const target=Math.max(0,Math.min(goalX-W+150,p.x-W*.36));camera+=(target-camera)*Math.min(1,.12*dt/16.67);
    if(p.x>=goalX){updateHud();endGame(true);beep(700,.25,'triangle')}
    else updateHud();
  }
  function hurt(fall) {
    if(player.invuln>0)return;
    lives--;updateHud();beep(130,.2,'sawtooth');burst(player.x+17,player.y+25,'#ff815e',10);
    if(lives<=0){endGame(false);return}
    player.x=Math.max(48,player.x-115);player.y=360;player.vy=-4;player.vx=0;player.invuln=1500;camera=Math.max(0,player.x-300);
    if(fall)showToast('HATI-HATI!');
  }
  function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*3;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,life:18+Math.random()*16,color,size:2+Math.random()*3})}}

  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
  function roundRect(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#83b5d6');sky.addColorStop(.58,'#b4d4d7');sky.addColorStop(1,'#e6d9af');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // warm sun and drifting clouds
    ctx.fillStyle='#ffe7a7';ctx.beginPath();ctx.arc(756-camera*.035,102,38,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff4c2';ctx.beginPath();ctx.arc(747-camera*.035,92,27,0,Math.PI*2);ctx.fill();
    for(let i=0;i<5;i++){const x=((i*245-camera*.16+frame*.12)%(W+180)+W+180)%(W+180)-70,y=70+(i%3)*46;ctx.fillStyle='#f8fbf2aa';ctx.beginPath();ctx.ellipse(x,y,36,9,0,0,Math.PI*2);ctx.ellipse(x+25,y-3,24,11,0,0,Math.PI*2);ctx.ellipse(x-22,y+1,19,7,0,0,Math.PI*2);ctx.fill()}
    // distant mountains
    ctx.fillStyle='#8baec1';ctx.beginPath();ctx.moveTo(0,310);for(let x=0;x<=W+40;x+=40){const y=215+Math.sin((x+camera*.08)/105)*38+Math.sin(x/47)*13;ctx.lineTo(x,y)}ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
    ctx.fillStyle='#6d9aa2';ctx.beginPath();ctx.moveTo(0,340);for(let x=0;x<=W+40;x+=40){const y=270+Math.sin((x+camera*.17)/92)*32+Math.cos(x/62)*14;ctx.lineTo(x,y)}ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
    drawVillage();
  }
  function drawVillage(){
    const base=397,par=camera*.3;
    for(let i=0;i<10;i++){let x=i*122-(par%122)-25;const h=45+(i*37%38);rect(x,base-h,67,h,'#527d82');rect(x+7,base-h-13,53,17,'#d7ad78');rect(x+15,base-h-22,8,10,'#d7ad78');rect(x+26,base-h-28,8,13,'#c89467');rect(x+41,base-h-21,8,11,'#d7ad78');rect(x+12,base-h+11,9,17,'#314b60');rect(x+43,base-h+8,11,11,'#a8c8bd');}
    // stylized distant leaf-like canopies
    for(let i=0;i<7;i++){const x=i*170-(camera*.43%170);ctx.fillStyle=i%2?'#527d64':'#62886c';ctx.beginPath();ctx.arc(x+26,386,28,Math.PI,0);ctx.fill();}
  }
  function drawTerrain(){
    for(const g of ground){const x=g.x-camera;if(x>W||x+g.w<0)continue;rect(x,445,g.w,95,'#79543f');rect(x,445,g.w,11,'#5b814c');rect(x,445,g.w,4,'#a8b86a');
      for(let tx=Math.max(0,Math.floor((x+camera)/40)*40-camera);tx<x+g.w;tx+=40){rect(tx,460,24,4,'#8e6247');rect(tx+15,482,18,4,'#694631');rect(tx+4,510,20,3,'#8b6045')}
    }
    for(const p of platforms){const x=p.x-camera;if(x>W||x+p.w<0)continue;rect(x,p.y,p.w,p.h,'#80583f');rect(x,p.y,p.w,6,'#58814c');rect(x,p.y,p.w,3,'#a8b86a');for(let i=12;i<p.w;i+=31)rect(x+i,p.y+9,13,3,'#684833')}
    // little grass tufts
    for(let i=0;i<28;i++){const x=((i*137-camera*.7)%(W+30)+W+30)%(W+30)-10;rect(x,439,3,7,'#719653');rect(x+4,442,2,4,'#8dac60')}
  }
  function drawCoin(c){const y=c.y+Math.sin(frame*.08+c.phase)*3,x=c.x-camera;if(x< -20||x>W+20)return;const wob=.65+Math.abs(Math.sin(frame*.09+c.phase))*.35;ctx.save();ctx.translate(x,y);ctx.scale(wob,1);ctx.fillStyle='#d38a35';ctx.beginPath();ctx.ellipse(0,0,9,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd76e';ctx.beginPath();ctx.ellipse(-1,-1,6,9,0,0,Math.PI*2);ctx.fill();rect(-1,-6,2,10,'#fff0a0');ctx.restore()}
  function drawEnemy(e){const x=e.x-camera,y=e.y;if(x<-50||x>W+50)return;ctx.save();ctx.translate(x+16,y+17);ctx.scale(e.dir,1);roundRect(-14,-10,28,23,7,'#39445b');rect(-10,-13,20,8,'#202a40');rect(-8,-4,4,3,'#fff0da');rect(4,-4,4,3,'#fff0da');rect(-7,-3,2,2,'#242b3b');rect(5,-3,2,2,'#242b3b');rect(-10,6,20,4,'#e85f54');rect(-10,12,7,5,'#252e43');rect(3,12,7,5,'#252e43');ctx.restore()}
  function drawPlayer(){
    const p=player;const x=p.x-camera,y=p.y;const run=p.onGround&&Math.abs(p.vx)>.45,step=run?Math.sin(p.anim*1.3)*3:0;
    ctx.save();if(p.invuln>0&&Math.floor(p.invuln/90)%2===0)ctx.globalAlpha=.35;
    // shadow
    ctx.fillStyle='#25384950';ctx.beginPath();ctx.ellipse(x+17,447,20,4,0,0,Math.PI*2);ctx.fill();
    // legs + sandals
    rect(x+7,y+39,8,10,'#263554');rect(x+20,y+39,8,10,'#263554');rect(x+5+step,y+47,12,5,'#41362f');rect(x+19-step,y+47,12,5,'#41362f');
    // orange suit
    roundRect(x+5,y+22,25,22,6,'#ef792e');rect(x+13,y+25,8,18,'#f3a043');rect(x+4,y+29,6,12,'#293b5c');rect(x+26,y+29,6,12,'#293b5c');
    // shoulders and arms
    roundRect(x+1,y+25+step,8,17,4,'#f28a37');roundRect(x+26,y+25-step,8,17,4,'#f28a37');rect(x+3,y+38+step,6,4,'#f2c9a0');rect(x+26,y+38-step,6,4,'#f2c9a0');
    // neck and face
    rect(x+13,y+18,9,7,'#eeb78e');roundRect(x+7,y+4,22,20,8,'#f2c6a0');
    // ear
    ctx.fillStyle='#eab18a';ctx.beginPath();ctx.arc(x+7,y+14,4,0,Math.PI*2);ctx.fill();
    // spiky blond hair silhouette
    ctx.fillStyle='#f4bf48';ctx.beginPath();ctx.moveTo(x+6,y+11);ctx.lineTo(x+3,y+2);ctx.lineTo(x+11,y+6);ctx.lineTo(x+13,y-1);ctx.lineTo(x+18,y+5);ctx.lineTo(x+24,y+1);ctx.lineTo(x+25,y+7);ctx.lineTo(x+32,y+4);ctx.lineTo(x+29,y+14);ctx.lineTo(x+24,y+12);ctx.lineTo(x+12,y+13);ctx.closePath();ctx.fill();
    // forehead protector
    rect(x+7,y+10,22,5,'#30445e');rect(x+13,y+10,11,4,'#9aa5ac');rect(x+17,y+10,4,3,'#d2d7d4');
    // eyes + whisker marks
    rect(x+11,y+16,3,2,'#36445a');rect(x+22,y+16,3,2,'#36445a');rect(x+9,y+19,4,1,'#bc816d');rect(x+23,y+19,4,1,'#bc816d');
    // blue collar and little leaf emblem
    rect(x+11,y+23,14,4,'#31598b');rect(x+15,y+31,7,7,'#f3c14e');rect(x+17,y+32,3,4,'#466f9b');
    // headband tails
    rect(x+3,y+12,5,3,'#30445e');rect(x+2,y+14,4,8,'#30445e');
    ctx.restore();
  }
  function drawGoal(){const x=goalX-camera;if(x<-50||x>W+60)return;rect(x+14,292,6,153,'#76543d');rect(x+78,292,6,153,'#76543d');rect(x,284,100,14,'#dc644d');rect(x+8,279,84,8,'#ed8157');rect(x+13,300,72,8,'#f4d18a');rect(x+26,308,46,87,'#f2e4c8');rect(x+32,318,34,72,'#e9d8b7');ctx.fillStyle='#ad4a3c';ctx.beginPath();ctx.moveTo(x+25,307);ctx.lineTo(x+49,326);ctx.lineTo(x+73,307);ctx.lineTo(x+49,337);ctx.closePath();ctx.fill();rect(x+44,358,11,25,'#745543');rect(x+38,386,23,5,'#745543');}
  function drawParticles(){for(const q of particles){ctx.globalAlpha=Math.min(1,q.life/15);rect(q.x-camera,q.y,q.size,q.size,q.color)}ctx.globalAlpha=1}
  function draw(){
    ctx.clearRect(0,0,W,H);drawBackground();drawTerrain();drawGoal();
    for(const c of coins)if(!c.taken)drawCoin(c);
    for(const e of enemies)if(e.alive)drawEnemy(e);
    drawPlayer();drawParticles();
    // soft vignette
    const vg=ctx.createRadialGradient(W/2,H/2,170,W/2,H/2,600);vg.addColorStop(0,'#10203800');vg.addColorStop(1,'#10203825');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  }
  function loop(now){const dt=Math.min(34,now-(lastTime||now));lastTime=now;update(dt||16.67);draw();requestAnimationFrame(loop)}
  requestAnimationFrame(loop);
})();
