(() => {
  const canvas = document.getElementById('bubbleCanvas');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || prefersReducedMotion) return;

  const ctx = canvas.getContext('2d');
  let bubbles = [];
  let width = window.innerWidth;
  let height = window.innerHeight;
  const maxBubbles = 80;
  const popRings = [];
  let pressBubble = null;
  const isInteractiveTarget = (target) => {
    return target.closest('a, button, .nav-link, .btn, .panda-sprite, .game-card, .stack-card, canvas, input, textarea, select, .bubble-frame');
  };
  const playSound = (src, volume = 1, cutoff = null) => {
    try {
      const audio = new Audio(src);
      audio.volume = volume;
      if (cutoff !== null) {
        audio.addEventListener('timeupdate', () => {
          if (audio.currentTime > cutoff) {
            audio.pause();
            audio.currentTime = 0;
          }
        });
      }
      audio.play();
    } catch (e) {
      /* ignore */
    }
  };
  const sounds = {
    button: new Audio('assets/bubble_pop_button.mp3'),
    base: new Audio('assets/bubble_pop.mp3'),
    panda: new Audio('assets/bubble_pop_panda.mp3')
  };
  Object.values(sounds).forEach(a => { a.preload = 'auto'; a.muted = false; a.volume = 1; });
  const playSafe = (audio) => {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (e) {
      /* ignore */
    }
  };
  const unlockAudio = () => {
    Object.values(sounds).forEach(a => {
      try {
        a.muted = false;
        a.currentTime = 0;
        a.play().then(() => {
          a.pause();
          a.currentTime = 0;
        }).catch(() => {});
      } catch (e) { /* ignore */ }
    });
  };
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  const playButtonPop = () => playSafe(sounds.button);
  const playBasePop = () => playSafe(sounds.base);
  const playPandaPop = () => playSafe(sounds.panda);

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  };

  window.addEventListener('resize', resize);
  resize();

  const random = (min, max) => Math.random() * (max - min) + min;

  const createBubble = (x = random(0, width), y = height + random(10, 80), size) => ({
    x,
    y,
    radius: size || random(8, 28),
    speed: random(0.5, 1.15),
    drift: random(-0.25, 0.25),
    wobble: random(0.6, 1.5),
    phase: random(0, Math.PI * 2),
    alpha: random(0.2, 0.65),
    hue: random(185, 210),
    shine: random(0.25, 0.55)
  });

  const spawnInitial = () => {
    bubbles = [];
    for (let i = 0; i < maxBubbles * 0.7; i++) {
      bubbles.push(createBubble(random(0, width), random(0, height)));
    }
  };

  const spawnBurst = (x, y) => {
    for (let i = 0; i < 10; i++) {
      bubbles.push(createBubble(x + random(-18, 18), y + random(-18, 18), random(6, 18)));
    }
    popRings.push({
      x,
      y,
      radius: 4,
      alpha: 0.9,
      width: 2
    });
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    growPressBubble();
    for (const b of bubbles) {
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(b.x - b.radius * 0.4, b.y - b.radius * 0.4, b.radius * 0.2, b.x, b.y, b.radius);
      gradient.addColorStop(0, `hsla(${b.hue}, 95%, 94%, ${b.alpha})`);
      gradient.addColorStop(0.45, `hsla(${b.hue}, 85%, 78%, ${b.alpha * 0.8})`);
      gradient.addColorStop(1, `hsla(${b.hue}, 75%, 60%, ${b.alpha * 0.2})`);
      ctx.fillStyle = gradient;
      ctx.shadowColor = `hsla(${b.hue}, 90%, 75%, 0.35)`;
      ctx.shadowBlur = 18;
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // shimmer highlight
      ctx.beginPath();
      ctx.fillStyle = `hsla(200, 100%, 97%, ${b.shine})`;
      ctx.ellipse(b.x - b.radius * 0.4, b.y - b.radius * 0.5, b.radius * 0.32, b.radius * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      b.phase += 0.02;
      b.y -= b.speed;
      b.x += Math.sin(b.phase) * b.wobble + b.drift;
      b.alpha -= 0.0007;

      if (b.y < -40 || b.alpha <= 0) {
        popRings.push({
          x: b.x,
          y: b.y,
          radius: b.radius * 0.8,
          alpha: 0.8,
          width: 2
        });
        b.x = random(0, width);
        b.y = height + random(10, 60);
        b.alpha = random(0.25, 0.7);
        b.radius = random(8, 28);
        b.speed = random(0.5, 1.15);
        b.drift = random(-0.25, 0.25);
        b.wobble = random(0.6, 1.5);
        b.phase = random(0, Math.PI * 2);
      }
    }

    for (let i = popRings.length - 1; i >= 0; i--) {
      const p = popRings[i];
      ctx.beginPath();
      ctx.strokeStyle = `hsla(195, 90%, 85%, ${p.alpha})`;
      ctx.lineWidth = p.width;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `hsla(195, 90%, 85%, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      p.radius += 1.8;
      p.alpha -= 0.018;
      p.width *= 0.97;
      if (p.alpha <= 0) popRings.splice(i, 1);
    }

    if (bubbles.length < maxBubbles) bubbles.push(createBubble());
    requestAnimationFrame(draw);
  };

  spawnInitial();
  requestAnimationFrame(draw);

  // random ambient pops to feel alive
  setInterval(() => {
    popRings.push({
      x: random(0, width),
      y: random(0, height * 0.8),
      radius: random(4, 10),
      alpha: 0.7,
      width: 1.8
    });
  }, 1400);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll('.card, .pill-card, .metric, .bubble-frame, .project-column, .project-row').forEach((el) => {
    el.classList.add('fade-up');
    observer.observe(el);
  });


  const portrait = document.querySelector('.bubble-frame');
  if (portrait) {
    portrait.style.cursor = 'pointer';
    portrait.addEventListener('click', (e) => {
      const img = portrait.querySelector('img');
      const pandaSrc = img?.dataset.panda;
      const profileSrc = img?.dataset.profile;
    if (img && pandaSrc && profileSrc) {
      const showingPanda = img.src.includes('panda_profile') || img.src.includes('panda');
      img.src = showingPanda ? profileSrc : pandaSrc;
    }
    playButtonPop();
    portrait.classList.remove('pop');
    // force reflow to restart animation
    void portrait.offsetWidth;
    portrait.classList.add('pop');
    setTimeout(() => portrait.classList.remove('pop'), 800);
      e.stopPropagation();
    });
  }

  // Press-and-hold bubble spawn
  document.addEventListener('mousedown', (e) => {
    if (isInteractiveTarget(e.target)) return;
    pressBubble = {
      x: e.clientX,
      y: e.clientY,
      radius: 12,
      growth: 1.2,
      max: 56,
      hue: random(185, 205),
      alpha: 0.4
    };
  });

  document.addEventListener('mouseup', () => {
    if (pressBubble) {
      popRings.push({
        x: pressBubble.x,
        y: pressBubble.y,
        radius: pressBubble.radius,
        alpha: 0.9,
        width: 2
      });
      playBasePop();
    }
    pressBubble = null;
  });

  const growPressBubble = () => {
    if (pressBubble) {
      pressBubble.radius = Math.min(pressBubble.radius + pressBubble.growth, pressBubble.max);
      const grad = ctx.createRadialGradient(
        pressBubble.x - pressBubble.radius * 0.4,
        pressBubble.y - pressBubble.radius * 0.4,
        pressBubble.radius * 0.2,
        pressBubble.x,
        pressBubble.y,
        pressBubble.radius
      );
      grad.addColorStop(0, `hsla(${pressBubble.hue}, 95%, 92%, ${pressBubble.alpha})`);
      grad.addColorStop(0.5, `hsla(${pressBubble.hue}, 80%, 70%, ${pressBubble.alpha * 0.9})`);
      grad.addColorStop(1, `hsla(${pressBubble.hue}, 70%, 55%, ${pressBubble.alpha * 0.3})`);
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(pressBubble.x, pressBubble.y, pressBubble.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };
})();

// Mini-game logic with multiple modes
(() => {
  const overlay = document.getElementById('gameOverlay');
  const area = document.getElementById('gameArea');
  const scoreEl = document.getElementById('gameScore');
  const timeEl = document.getElementById('gameTime');
  const startBtn = document.getElementById('gameStart');
  const closeBtn = document.getElementById('closeGame');
  const brandDot = document.querySelector('.bubble-dot');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const descEl = document.getElementById('gameDesc');

  if (!overlay || !area || !scoreEl || !timeEl || !startBtn || !closeBtn) return;

  let score = 0;
  let timeLeft = 20;
  let timerId = null;
  let spawnId = null;
  let growId = null;
  let moveId = null;
  let activeMode = 'pop';
  let precisionRounds = 5;
  let targetSize = 90;
  let currentBubble = null;
  const movers = [];

  const updateStats = () => {
    scoreEl.textContent = `Score: ${score}`;
    timeEl.textContent = activeMode === 'precision' ? `Rounds: ${precisionRounds}` : `Time: ${timeLeft}s`;
  };

  const endGame = () => {
    clearInterval(timerId);
    clearInterval(spawnId);
    clearInterval(growId);
    cancelAnimationFrame(moveId);
    timerId = null;
    spawnId = null;
    growId = null;
    moveId = null;
    area.innerHTML = '';
    movers.length = 0;
    currentBubble = null;
  };

  // Pop sprint
  const spawnBubble = () => {
    const bubble = document.createElement('div');
    bubble.className = 'game-bubble';
    const { width, height } = area.getBoundingClientRect();
    const size = 50 + Math.random() * 20;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * (width - size)}px`;
    bubble.style.top = `${Math.random() * (height - size)}px`;
    bubble.addEventListener('click', () => {
      score += 1;
      updateStats();
      playButtonPop();
      bubble.remove();
    });
    setTimeout(() => bubble.remove(), 1800);
    area.appendChild(bubble);
  };

  const startPopSprint = () => {
    timeLeft = 20;
    spawnId = setInterval(spawnBubble, 420);
    timerId = setInterval(() => {
      timeLeft -= 1;
      updateStats();
      if (timeLeft <= 0) endGame();
    }, 1000);
    spawnBubble();
  };

  // Precision mode
  const setTarget = () => {
    targetSize = 70 + Math.random() * 70;
    area.dataset.target = `Target size: ${Math.round(targetSize)}px`;
    updateStats();
  };
  const handlePrecisionDown = (e) => {
    if (currentBubble) return;
    const bubble = document.createElement('div');
    bubble.className = 'game-bubble';
    bubble.style.width = '20px';
    bubble.style.height = '20px';
    bubble.style.left = `${e.offsetX - 10}px`;
    bubble.style.top = `${e.offsetY - 10}px`;
    area.appendChild(bubble);
    currentBubble = { el: bubble, size: 20, x: e.offsetX, y: e.offsetY };
    growId = setInterval(() => {
      if (!currentBubble) return;
      currentBubble.size += 2.5;
      currentBubble.el.style.width = `${currentBubble.size}px`;
      currentBubble.el.style.height = `${currentBubble.size}px`;
      currentBubble.el.style.left = `${currentBubble.x - currentBubble.size / 2}px`;
      currentBubble.el.style.top = `${currentBubble.y - currentBubble.size / 2}px`;
      if (currentBubble.size >= 160) handlePrecisionUp();
    }, 30);
  };
  const handlePrecisionUp = () => {
    if (!currentBubble) return;
    clearInterval(growId);
    growId = null;
    const diff = Math.abs(currentBubble.size - targetSize);
    if (diff <= 12) score += 2;
    else if (diff <= 25) score += 1;
    playButtonPop();
    precisionRounds -= 1;
    currentBubble.el.remove();
    currentBubble = null;
    if (precisionRounds <= 0) {
      endGame();
      updateStats();
      return;
    }
    setTarget();
    updateStats();
  };
  const startPrecision = () => {
    precisionRounds = 5;
    setTarget();
  };

  // Catch mode
  const spawnMover = () => {
    const bubble = document.createElement('div');
    bubble.className = 'game-bubble';
    const { width, height } = area.getBoundingClientRect();
    const size = 45 + Math.random() * 20;
    let x = Math.random() * (width - size);
    let y = Math.random() * (height - size);
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    const vel = { x: (Math.random() - 0.5) * 2.2, y: (Math.random() - 0.5) * 2.2 };
    bubble.addEventListener('click', () => {
      score += 1;
      updateStats();
      playButtonPop();
      bubble.remove();
      const idx = movers.findIndex((m) => m.el === bubble);
      if (idx >= 0) movers.splice(idx, 1);
    });
    area.appendChild(bubble);
    movers.push({ el: bubble, size, vel });
  };

  const moveBubbles = () => {
    const { width, height } = area.getBoundingClientRect();
    movers.forEach((m) => {
      let x = parseFloat(m.el.style.left);
      let y = parseFloat(m.el.style.top);
      x += m.vel.x * 2;
      y += m.vel.y * 2;
      if (x < 0 || x + m.size > width) m.vel.x *= -1;
      if (y < 0 || y + m.size > height) m.vel.y *= -1;
      m.el.style.left = `${Math.max(0, Math.min(width - m.size, x))}px`;
      m.el.style.top = `${Math.max(0, Math.min(height - m.size, y))}px`;
    });
    moveId = requestAnimationFrame(moveBubbles);
  };

  const startCatch = () => {
    timeLeft = 20;
    spawnId = setInterval(spawnMover, 600);
    timerId = setInterval(() => {
      timeLeft -= 1;
      updateStats();
      if (timeLeft <= 0) endGame();
    }, 1000);
    spawnMover();
    moveId = requestAnimationFrame(moveBubbles);
  };

  const setMode = (mode) => {
    activeMode = mode;
    modeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    switch (mode) {
      case 'precision':
        descEl.textContent = 'Hold to grow a bubble to the target size. Release close to target for points. Five rounds.';
        timeEl.textContent = 'Rounds: 5';
        break;
      case 'catch':
        descEl.textContent = 'Catch moving bubbles in 20 seconds. They bounce around—tap fast.';
        timeEl.textContent = 'Time: 20s';
        break;
      default:
        descEl.textContent = 'Click the bubbles before they fade. 20 seconds to set a high score.';
        timeEl.textContent = 'Time: 20s';
    }
  };

  const startGame = () => {
    score = 0;
    endGame();
    updateStats();
    if (activeMode === 'precision') startPrecision();
    else if (activeMode === 'catch') startCatch();
    else startPopSprint();
  };

  const openOverlay = () => {
    overlay.classList.add('active');
    startGame();
  };

  const closeOverlay = () => {
    overlay.classList.remove('active');
    endGame();
  };

  startBtn.addEventListener('click', startGame);
  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });

  area.addEventListener('mousedown', (e) => {
    if (activeMode === 'precision') handlePrecisionDown(e);
  });
  area.addEventListener('mouseup', () => {
    if (activeMode === 'precision') handlePrecisionUp();
  });

  // expose opener for bubble tab
  window.openBubbleGames = openOverlay;
})();

// Stack Up mini-game
(() => {
  const canvas = document.getElementById('stackCanvas');
  const startBtn = document.getElementById('stackStart');
  const scoreEl = document.getElementById('stackScore');
  const statusEl = document.getElementById('stackStatus');
  if (!canvas || !startBtn || !scoreEl || !statusEl) return;

  let ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;
  let stack = [];
  let current = null;
  let speed = 2.2;
  let running = false;
  let animId = null;
  const blockHeight = 24;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const newW = Math.min(620, Math.max(340, rect.width));
    const newH = height;
    const imgData = ctx.getImageData(0, 0, width, height);
    canvas.width = newW;
    canvas.height = newH;
    ctx.putImageData(imgData, 0, 0);
    width = newW;
    height = newH;
    draw();
  };
  window.addEventListener('resize', resize);

  const randColor = () => {
    const hue = Math.floor(Math.random() * 50) + 180;
    return `hsl(${hue}, 80%, 65%)`;
  };

  const reset = () => {
    running = true;
    stack = [{
      x: width / 2 - 80,
      width: 160,
      color: randColor()
    }];
    addCurrent();
    updateScore();
    statusEl.textContent = 'Stacking...';
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  };

  const addCurrent = () => {
    const last = stack[stack.length - 1];
    current = {
      x: 0,
      width: last.width,
      dir: 1,
      color: randColor()
    };
  };

  const updateScore = () => {
    scoreEl.textContent = `Score: ${stack.length - 1}`;
  };

  const gameOver = () => {
    running = false;
    statusEl.textContent = 'Game over — restart to try again.';
  };

  const drop = () => {
    if (!running || !current) return;
    const last = stack[stack.length - 1];
    const overlapLeft = Math.max(current.x, last.x);
    const overlapRight = Math.min(current.x + current.width, last.x + last.width);
    const overlap = overlapRight - overlapLeft;
    if (overlap <= 0) {
      gameOver();
      return;
    }
    stack.push({
      x: overlapLeft,
      width: overlap,
      color: randColor()
    });
    speed += 0.08;
    updateScore();
    addCurrent();
  };

  const drawBlock = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    const baseY = height - blockHeight;
    stack.forEach((b, i) => {
      const y = baseY - i * blockHeight;
      drawBlock(b.x, y, b.width, blockHeight, b.color);
    });
    if (current) {
      const y = baseY - stack.length * blockHeight;
      drawBlock(current.x, y, current.width, blockHeight, current.color);
    }
  };

  const loop = () => {
    if (running && current) {
      current.x += current.dir * speed;
      if (current.x <= 0 || current.x + current.width >= width) current.dir *= -1;
    }
    draw();
    if (running) animId = requestAnimationFrame(loop);
  };

  const handleKey = (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      drop();
    }
  };

  canvas.addEventListener('click', () => { playButtonPop(); drop(); });
  startBtn.addEventListener('click', () => { playButtonPop(); reset(); });
  document.addEventListener('keydown', handleKey);
  resize();
})();

// Game tabs
(() => {
  const tabs = document.querySelectorAll('.game-tab');
  const panes = document.querySelectorAll('.game-pane');
  if (!tabs.length || !panes.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.querySelector(`.game-pane[data-game="${tab.dataset.game}"]`);
      if (pane) pane.classList.add('active');
      if (tab.dataset.game === 'bubble-mini' && window.openBubbleGames) {
        window.openBubbleGames();
      }
    });
  });
})();

// Phone reveal
(() => {
  document.querySelectorAll('.blurred-phone').forEach((el) => {
    el.addEventListener('click', () => {
      el.textContent = el.dataset.phone;
      el.classList.add('revealed');
    });
  });
})();

// Snake game
(() => {
  const canvas = document.getElementById('snakeCanvas');
  const startBtn = document.getElementById('snakeStart');
  const scoreEl = document.getElementById('snakeScore');
  const statusEl = document.getElementById('snakeStatus');
  if (!canvas || !startBtn) return;
  const ctx = canvas.getContext('2d');
  const grid = 20;
  let snake, dir, food, score, alive, loopId;
  let lastTime = 0;
  const step = 120; // ms per move

  const reset = () => {
    snake = [{ x: 5, y: 5 }];
    dir = { x: 1, y: 0 };
    food = placeFood();
    score = 0;
    alive = true;
    scoreEl.textContent = 'Score: 0';
    statusEl.textContent = 'Playing';
    cancelAnimationFrame(loopId);
    lastTime = performance.now();
    loopId = requestAnimationFrame(loop);
  };

  const placeFood = () => {
    return {
      x: Math.floor(Math.random() * (canvas.width / grid)),
      y: Math.floor(Math.random() * (canvas.height / grid))
    };
  };

  const loop = (ts) => {
    if (!alive) return;
    if (ts - lastTime >= step) {
      move();
      draw();
      lastTime = ts;
    }
    loopId = requestAnimationFrame(loop);
  };

  const move = () => {
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= canvas.width / grid || head.y >= canvas.height / grid) {
      alive = false;
      statusEl.textContent = 'Game over';
      return;
    }
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      alive = false;
      statusEl.textContent = 'Game over';
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      scoreEl.textContent = `Score: ${score}`;
      food = placeFood();
    } else {
      snake.pop();
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5de6e9';
    snake.forEach(seg => ctx.fillRect(seg.x * grid, seg.y * grid, grid - 1, grid - 1));
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(food.x * grid, food.y * grid, grid - 1, grid - 1);
  };

  const handleKey = (e) => {
    if (e.code === 'ArrowUp' && dir.y !== 1) dir = { x: 0, y: -1 };
    if (e.code === 'ArrowDown' && dir.y !== -1) dir = { x: 0, y: 1 };
    if (e.code === 'ArrowLeft' && dir.x !== 1) dir = { x: -1, y: 0 };
    if (e.code === 'ArrowRight' && dir.x !== -1) dir = { x: 1, y: 0 };
  };

  startBtn.addEventListener('click', reset);
  document.addEventListener('keydown', handleKey);
})();

// Flappy game
(() => {
  const canvas = document.getElementById('flappyCanvas');
  const startBtn = document.getElementById('flappyStart');
  const scoreEl = document.getElementById('flappyScore');
  const statusEl = document.getElementById('flappyStatus');
  if (!canvas || !startBtn) return;
  const ctx = canvas.getContext('2d');
  let bird, pipes, gravity, lift, score, alive, loopId, pipeTimer;

  const reset = () => {
    bird = { x: 80, y: canvas.height / 2, vy: 0 };
    pipes = [];
    gravity = 0.4;
    lift = -6.5;
    score = 0;
    alive = true;
    statusEl.textContent = 'Playing';
    scoreEl.textContent = 'Score: 0';
    clearInterval(pipeTimer);
    pipeTimer = setInterval(addPipe, 1300);
    cancelAnimationFrame(loopId);
    loop();
  };

  const addPipe = () => {
    const gap = 120;
    const top = Math.random() * (canvas.height - gap - 60) + 20;
    pipes.push({ x: canvas.width, w: 60, top, bottom: top + gap });
  };

  const loop = () => {
    if (!alive) return;
    update();
    draw();
    loopId = requestAnimationFrame(loop);
  };

  const update = () => {
    bird.vy += gravity;
    bird.y += bird.vy;
    if (bird.y > canvas.height - 12 || bird.y < 0) return gameOver();
    pipes.forEach(p => p.x -= 2.5);
    pipes = pipes.filter(p => p.x + p.w > 0);
    pipes.forEach(p => {
      if (bird.x > p.x + p.w && !p.scored) {
        score += 1;
        p.scored = true;
        scoreEl.textContent = `Score: ${score}`;
      }
      const withinX = bird.x + 14 > p.x && bird.x - 14 < p.x + p.w;
      const hitTop = bird.y - 12 < p.top;
      const hitBottom = bird.y + 12 > p.bottom;
      if (withinX && (hitTop || hitBottom)) gameOver();
    });
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5de6e9';
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#77f0c4';
    pipes.forEach(p => {
      ctx.fillRect(p.x, 0, p.w, p.top);
      ctx.fillRect(p.x, p.bottom, p.w, canvas.height - p.bottom);
    });
  };

  const gameOver = () => {
    alive = false;
    statusEl.textContent = 'Game over';
    clearInterval(pipeTimer);
  };

  const flap = () => {
    if (!alive) return;
    bird.vy = lift;
    playButtonPop();
  };

  startBtn.addEventListener('click', reset);
  canvas.addEventListener('click', flap);
  document.addEventListener('keydown', (e) => { if (e.code === 'Space') flap(); });
})();

// Dino run
(() => {
  const canvas = document.getElementById('dinoCanvas');
  const startBtn = document.getElementById('dinoStart');
  const scoreEl = document.getElementById('dinoScore');
  const statusEl = document.getElementById('dinoStatus');
  if (!canvas || !startBtn) return;
  const ctx = canvas.getContext('2d');
  let dino, obstacles, gravity, score, alive, loopId, spawnTimer;

  const reset = () => {
    dino = { x: 40, y: canvas.height - 40, vy: 0, onGround: true };
    obstacles = [];
    gravity = 0.6;
    score = 0;
    alive = true;
    statusEl.textContent = 'Playing';
    scoreEl.textContent = 'Score: 0';
    clearInterval(spawnTimer);
    spawnTimer = setInterval(addObstacle, 900);
    cancelAnimationFrame(loopId);
    loop();
  };

  const addObstacle = () => {
    const size = 20 + Math.random() * 18;
    obstacles.push({ x: canvas.width, size });
  };

  const loop = () => {
    if (!alive) return;
    update();
    draw();
    loopId = requestAnimationFrame(loop);
  };

  const update = () => {
    dino.vy += gravity;
    dino.y += dino.vy;
    if (dino.y >= canvas.height - 40) {
      dino.y = canvas.height - 40;
      dino.vy = 0;
      dino.onGround = true;
    }
    obstacles.forEach(o => o.x -= 3.2);
    obstacles = obstacles.filter(o => o.x + o.size > 0);
    obstacles.forEach(o => {
      if (dino.x < o.x + o.size && dino.x + 24 > o.x && dino.y + 24 > canvas.height - o.size) {
        gameOver();
      }
      if (!o.scored && o.x + o.size < dino.x) {
        o.scored = true;
        score += 1;
        scoreEl.textContent = `Score: ${score}`;
      }
    });
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5de6e9';
    ctx.fillRect(dino.x, dino.y, 24, 24);
    ctx.fillStyle = '#77f0c4';
    obstacles.forEach(o => ctx.fillRect(o.x, canvas.height - o.size, o.size, o.size));
  };

  const jump = () => {
    if (dino.onGround) {
      dino.vy = -10;
      dino.onGround = false;
    }
  };

  const gameOver = () => {
    alive = false;
    statusEl.textContent = 'Game over';
    clearInterval(spawnTimer);
  };

  startBtn.addEventListener('click', reset);
  canvas.addEventListener('click', jump);
  document.addEventListener('keydown', (e) => { if (e.code === 'Space') jump(); });
})();

// Dodger game
(() => {
  const canvas = document.getElementById('dodgerCanvas');
  const startBtn = document.getElementById('dodgerStart');
  const scoreEl = document.getElementById('dodgerScore');
  const statusEl = document.getElementById('dodgerStatus');
  if (!canvas || !startBtn) return;
  const ctx = canvas.getContext('2d');
  let player, blocks, score, alive, loopId, spawnTimer, keys;

  const reset = () => {
    player = { x: canvas.width / 2 - 12, y: canvas.height - 24, w: 24, h: 24 };
    blocks = [];
    score = 0;
    alive = true;
    keys = {};
    scoreEl.textContent = 'Score: 0';
    statusEl.textContent = 'Playing';
    clearInterval(spawnTimer);
    spawnTimer = setInterval(addBlock, 700);
    cancelAnimationFrame(loopId);
    loop();
  };

  const addBlock = () => {
    const size = 18 + Math.random() * 16;
    blocks.push({ x: Math.random() * (canvas.width - size), y: -size, s: 2 + Math.random() * 2, w: size, h: size });
  };

  const loop = () => {
    if (!alive) return;
    update();
    draw();
    loopId = requestAnimationFrame(loop);
  };

  const update = () => {
    const speed = 4;
    if (keys['ArrowLeft'] || keys['a']) player.x -= speed;
    if (keys['ArrowRight'] || keys['d']) player.x += speed;
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    blocks.forEach(b => b.y += b.s);
    blocks = blocks.filter(b => b.y < canvas.height + 50);
    blocks.forEach(b => {
      if (player.x < b.x + b.w && player.x + player.w > b.x && player.y < b.y + b.h && player.y + player.h > b.y) {
        gameOver();
      }
      if (!b.scored && b.y > canvas.height) {
        b.scored = true;
        score += 1;
        scoreEl.textContent = `Score: ${score}`;
      }
    });
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5de6e9';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#77f0c4';
    blocks.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
  };

  const gameOver = () => {
    alive = false;
    statusEl.textContent = 'Game over';
    clearInterval(spawnTimer);
  };

  startBtn.addEventListener('click', reset);
  document.addEventListener('keydown', (e) => { keys[e.key] = true; });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });
})();

// Whack bubbles
(() => {
  const canvas = document.getElementById('whackCanvas');
  const startBtn = document.getElementById('whackStart');
  const scoreEl = document.getElementById('whackScore');
  const statusEl = document.getElementById('whackStatus');
  if (!canvas || !startBtn) return;
  const ctx = canvas.getContext('2d');
  let bubbles = [];
  let score = 0;
  let timeLeft = 30;
  let timerId = null;
  let spawnId = null;

  const reset = () => {
    score = 0;
    timeLeft = 30;
    bubbles = [];
    scoreEl.textContent = 'Score: 0';
    statusEl.textContent = 'Playing';
    clearInterval(timerId);
    clearInterval(spawnId);
    timerId = setInterval(() => {
      timeLeft -= 1;
      statusEl.textContent = `Time: ${timeLeft}s`;
      if (timeLeft <= 0) end();
    }, 1000);
    spawnId = setInterval(spawn, 600);
    spawn();
    loop();
  };

  const end = () => {
    clearInterval(timerId);
    clearInterval(spawnId);
    timerId = null;
    spawnId = null;
    statusEl.textContent = 'Done';
  };

  const spawn = () => {
    const size = 30 + Math.random() * 30;
    bubbles.push({
      x: Math.random() * (canvas.width - size),
      y: Math.random() * (canvas.height - size),
      r: size / 2,
      alpha: 1
    });
    if (bubbles.length > 12) bubbles.shift();
  };

  const loop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bubbles.forEach((b) => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(93, 230, 233, ${b.alpha})`;
      ctx.arc(b.x + b.r, b.y + b.r, b.r, 0, Math.PI * 2);
      ctx.fill();
      b.alpha -= 0.01;
    });
    bubbles = bubbles.filter(b => b.alpha > 0);
    if (timerId) requestAnimationFrame(loop);
  };

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    bubbles.forEach((b, idx) => {
      const dx = x - (b.x + b.r);
      const dy = y - (b.y + b.r);
      if (Math.sqrt(dx*dx + dy*dy) <= b.r) {
        score += 1;
        scoreEl.textContent = `Score: ${score}`;
        bubbles.splice(idx, 1);
      }
    });
  });

  startBtn.addEventListener('click', reset);
})();

// Paddle bounce
(() => {
  const canvas = document.getElementById('paddleCanvas');
  const startBtn = document.getElementById('paddleStart');
  const scoreEl = document.getElementById('paddleScore');
  const statusEl = document.getElementById('paddleStatus');
  if (!canvas || !startBtn) return;
  const ctx = canvas.getContext('2d');
  let ball, paddle, score, alive, loopId, keys;

  const reset = () => {
    ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 2.5, vy: -2.3, r: 8 };
    paddle = { w: 90, h: 14, x: canvas.width / 2 - 45, y: canvas.height - 20 };
    score = 0;
    alive = true;
    keys = {};
    scoreEl.textContent = 'Score: 0';
    statusEl.textContent = 'Playing';
    cancelAnimationFrame(loopId);
    loop();
  };

  const loop = () => {
    if (!alive) return;
    update();
    draw();
    loopId = requestAnimationFrame(loop);
  };

  const update = () => {
    const speed = 4;
    if (keys['ArrowLeft'] || keys['a']) paddle.x -= speed;
    if (keys['ArrowRight'] || keys['d']) paddle.x += speed;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, paddle.x));
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) ball.vx *= -1;
    if (ball.y - ball.r < 0) ball.vy *= -1;
    if (ball.y + ball.r > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
      ball.vy *= -1;
      ball.y = paddle.y - ball.r;
      score += 1;
      scoreEl.textContent = `Score: ${score}`;
    }
    if (ball.y - ball.r > canvas.height) {
      alive = false;
      statusEl.textContent = 'Game over';
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5de6e9';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#77f0c4';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  };

  startBtn.addEventListener('click', reset);
  document.addEventListener('keydown', (e) => { keys[e.key] = true; });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });
})();

// Catcher game
(() => {
  const canvas = document.getElementById('catchCanvas');
  const startBtn = document.getElementById('catchStart');
  const scoreEl = document.getElementById('catchScore');
  const statusEl = document.getElementById('catchStatus');
  if (!canvas || !startBtn) return;
  const ctx = canvas.getContext('2d');
  let player, drops, score, lives, alive, loopId, spawnTimer, keys;

  const reset = () => {
    player = { x: canvas.width / 2 - 30, y: canvas.height - 20, w: 60, h: 12 };
    drops = [];
    score = 0;
    lives = 3;
    alive = true;
    keys = {};
    scoreEl.textContent = 'Score: 0';
    statusEl.textContent = 'Lives: 3';
    clearInterval(spawnTimer);
    spawnTimer = setInterval(addDrop, 700);
    cancelAnimationFrame(loopId);
    loop();
  };

  const addDrop = () => {
    const good = Math.random() > 0.25;
    const size = 12;
    drops.push({
      x: Math.random() * (canvas.width - size),
      y: -size,
      w: size,
      h: size,
      s: 2.5 + Math.random() * 1.5,
      good
    });
  };

  const loop = () => {
    if (!alive) return;
    update();
    draw();
    loopId = requestAnimationFrame(loop);
  };

  const update = () => {
    const speed = 5;
    if (keys['ArrowLeft'] || keys['a']) player.x -= speed;
    if (keys['ArrowRight'] || keys['d']) player.x += speed;
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    drops.forEach(d => d.y += d.s);
    drops = drops.filter(d => d.y < canvas.height + 20);
    drops.forEach(d => {
      const hit = player.x < d.x + d.w && player.x + player.w > d.x && player.y < d.y + d.h && player.y + player.h > d.y;
      if (hit) {
        if (d.good) score += 1; else lives -= 1;
        scoreEl.textContent = `Score: ${score}`;
        statusEl.textContent = `Lives: ${lives}`;
        d.y = canvas.height + 50;
      }
      if (d.y > canvas.height && d.good) {
        lives -= 1;
        statusEl.textContent = `Lives: ${lives}`;
      }
      if (lives <= 0) {
        alive = false;
        statusEl.textContent = 'Game over';
      }
    });
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#77f0c4';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    drops.forEach(d => {
      ctx.fillStyle = d.good ? '#5de6e9' : '#ff7676';
      ctx.fillRect(d.x, d.y, d.w, d.h);
    });
  };

  startBtn.addEventListener('click', reset);
  document.addEventListener('keydown', (e) => { keys[e.key] = true; });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });
})();

// Memory flip
(() => {
  const grid = document.getElementById('memoryGrid');
  const startBtn = document.getElementById('memoryStart');
  const statusEl = document.getElementById('memoryStatus');
  if (!grid || !startBtn) return;
  let cards = [];
  let first = null;
  let lock = false;
  let matches = 0;

  const reset = () => {
    const values = [];
    for (let i = 1; i <= 8; i++) { values.push(i); values.push(i); }
    shuffle(values);
    grid.innerHTML = '';
    cards = values.map(v => createCard(v));
    cards.forEach(c => grid.appendChild(c.el));
    matches = 0;
    statusEl.textContent = 'Find all pairs.';
    first = null;
    lock = false;
  };

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  const createCard = (value) => {
    const el = document.createElement('div');
    el.className = 'memory-card';
    el.textContent = '?';
    const card = { el, value, flipped: false, matched: false };
    el.addEventListener('click', () => flip(card));
    return card;
  };

  const flip = (card) => {
    if (lock || card.flipped || card.matched) return;
    card.flipped = true;
    card.el.classList.add('flipped');
    card.el.textContent = card.value;
    if (!first) {
      first = card;
    } else {
      lock = true;
      if (first.value === card.value) {
        first.matched = card.matched = true;
        matches += 1;
        lock = false;
        first = null;
        if (matches === 8) statusEl.textContent = 'All matched!';
      } else {
        setTimeout(() => {
          first.flipped = card.flipped = false;
          first.el.classList.remove('flipped');
          card.el.classList.remove('flipped');
          first.el.textContent = '?';
          card.el.textContent = '?';
          first = null;
          lock = false;
        }, 700);
      }
    }
  };

  startBtn.addEventListener('click', reset);
})();

// Target chase
(() => {
  const canvas = document.getElementById('chaseCanvas');
  const startBtn = document.getElementById('chaseStart');
  const scoreEl = document.getElementById('chaseScore');
  const statusEl = document.getElementById('chaseStatus');
  if (!canvas || !startBtn) return;
  const ctx = canvas.getContext('2d');
  let target, score, timeLeft, timerId, moveId, alive;

  const reset = () => {
    target = spawn();
    score = 0;
    timeLeft = 20;
    alive = true;
    scoreEl.textContent = 'Score: 0';
    statusEl.textContent = 'Time: 20s';
    clearInterval(timerId);
    timerId = setInterval(() => {
      timeLeft -= 1;
      statusEl.textContent = `Time: ${timeLeft}s`;
      if (timeLeft <= 0) {
        alive = false;
        statusEl.textContent = 'Done';
        clearInterval(timerId);
      }
    }, 1000);
    cancelAnimationFrame(moveId);
    loop();
  };

  const spawn = () => {
    const size = 28;
    return {
      x: Math.random() * (canvas.width - size),
      y: Math.random() * (canvas.height - size),
      size,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3
    };
  };

  const update = () => {
    target.x += target.vx;
    target.y += target.vy;
    if (target.x < 0 || target.x + target.size > canvas.width) target.vx *= -1;
    if (target.y < 0 || target.y + target.size > canvas.height) target.vy *= -1;
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5de6e9';
    ctx.fillRect(target.x, target.y, target.size, target.size);
  };

  const loop = () => {
    if (!alive) return;
    update();
    draw();
    moveId = requestAnimationFrame(loop);
  };

  canvas.addEventListener('click', (e) => {
    if (!alive) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x >= target.x && x <= target.x + target.size && y >= target.y && y <= target.y + target.size) {
      score += 1;
      scoreEl.textContent = `Score: ${score}`;
      target = spawn();
      playButtonPop();
    }
  });

  startBtn.addEventListener('click', reset);
})();

// Panda scatter + hunt
(() => {
  const respawnBtn = document.getElementById('pandaRespawn');
  const foundEl = document.getElementById('pandaFound');
  const totalEl = document.getElementById('pandaTotal');
  if (!respawnBtn || !foundEl || !totalEl) return;

  let pandas = [];
  let found = 0;

  const clearPandas = () => {
    pandas.forEach(p => p.remove());
    pandas = [];
  };

  const updateCounts = () => {
    foundEl.textContent = `Found: ${found}`;
    totalEl.textContent = `Total: ${pandas.length}`;
  };

  const pandaSources = Array.from({ length: 31 }, (_, i) => `assets/panda${i + 1}.gif`).concat('assets/panda.png');

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const scatterPandas = (count = 15) => {
    clearPandas();
    found = 0;
    const body = document.body;
    const maxW = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const maxH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const pool = shuffle([...pandaSources]);
    for (let i = 0; i < count; i++) {
      const img = document.createElement('img');
      img.src = pool[i % pool.length];
      img.alt = 'Hidden panda';
      img.className = 'panda-sprite';
      const size = 70 + Math.random() * 35;
      img.style.width = `${size}px`;
      img.style.left = `${Math.random() * (maxW - size)}px`;
      img.style.top = `${Math.random() * Math.max(200, maxH - 200)}px`;
      img.addEventListener('click', () => {
        if (!img.classList.contains('found')) {
          img.classList.add('found');
          img.style.opacity = 0.35;
          found += 1;
          updateCounts();
          playPandaPop();
          img.remove();
        }
      });
      pandas.push(img);
      body.appendChild(img);
    }
    updateCounts();
  };

  respawnBtn.addEventListener('click', () => scatterPandas());
  scatterPandas();
})();
// Bubble mini-games opener button
(() => {
  const btn = document.getElementById('bubbleOpen');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (window.openBubbleGames) window.openBubbleGames();
  });
})();

// Game info popup on load
(() => {
  const info = document.getElementById('gameInfo');
  const closeBtn = document.getElementById('closeInfo');
  if (!info || !closeBtn) return;
  const show = () => info.classList.add('active');
  const hide = () => info.classList.remove('active');
  closeBtn.addEventListener('click', hide);
  window.addEventListener('load', show);
})();
