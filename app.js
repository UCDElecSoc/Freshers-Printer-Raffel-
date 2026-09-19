(() => {
  'use strict';
  const button = document.getElementById('draw');
  const name = document.getElementById('name');
  const status = document.getElementById('status');
  const stage = document.getElementById('stage');
  const prizeReveal = document.getElementById('prize-reveal');
  document.getElementById('close-prize').addEventListener('click', () => prizeReveal.close());
  prizeReveal.addEventListener('close', () => {
    document.body.classList.remove('prize-open');
    document.getElementById('confetti').replaceChildren();
    button.focus({ preventScroll: true });
  });
  const soundButton = document.getElementById('sound-toggle');
  const music = new Audio('assets/tiki-tiki.mp3');
  music.preload = 'auto';
  music.volume = 0.65;
  let soundEnabled = true;
  soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    music.muted = !soundEnabled || document.hidden;
    soundButton.textContent = soundEnabled ? 'Sound: On' : 'Sound: Off';
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
  });
  document.addEventListener('visibilitychange', () => {
    music.muted = !soundEnabled || document.hidden;
  });
  const data = window.RAFFLE_DATA;
  const participants = data?.participants;
  let state = 'ready';

  if (!Array.isArray(participants) || !participants.length || participants.some(p => typeof p.name !== 'string' || !p.name.trim())) {
    name.textContent = 'Start the raffle';
    status.textContent = location.protocol === 'file:' ? 'Double-click start-raffle.cmd in the project folder to load your list automatically.' : 'Could not read the saved guest list. Check the file and its Name column, then refresh.';
    return;
  }
  button.disabled = false;

  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const container = document.getElementById('confetti');
    container.replaceChildren();
    for (let i = 0; i < 110; i++) {
      const piece = document.createElement('i');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = ['#f1cd74', '#ffffff', '#9ca6ed'][i % 3];
      piece.style.animationDelay = `${Math.random() * 1.5}s`;
      piece.style.setProperty('--drift', `${Math.random() * 160 - 80}px`);
      container.append(piece);
    }
    setTimeout(() => container.replaceChildren(), 6000);
  }

  button.addEventListener('click', async () => {
    if (state === 'drawing') return;
    if (state === 'finished' && !confirm('Draw again? The previous winner will still be eligible.')) return;
    let winner, winnerIndex;
    try { winnerIndex = Raffle.randomIndex(participants.length); winner = participants[winnerIndex]; }
    catch { status.textContent = 'Secure random selection is unavailable. Please use a current version of Chrome or Edge.'; return; }
    music.pause();
    music.currentTime = 0;
    music.muted = !soundEnabled || document.hidden;
    state = 'drawing';
    button.disabled = true;
    button.textContent = 'Drawing…';
    stage.className = 'stage rolling';
    status.textContent = 'And the winner is…';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The first strong bass hit in this excerpt is at 10.52 seconds.
    const revealAt = 10520;
    const lockAt = revealAt - 1000;
    let winnerVisibleAt = null;
    const frames = [];
    for (let time = 0; time < lockAt; time += 90 + 1300 * Math.pow(time / lockAt, 3)) frames.push(time);
    frames.push(lockAt);
    let mediaDriven = false;
    let settled = false;
    let startupTimer;
    // Start from the click gesture. Missing/blocked audio must not block drawing.
    try {
      mediaDriven = await Promise.race([
        music.play().then(() => { if (settled && !mediaDriven) music.pause(); return true; }).catch(() => false),
        new Promise(resolve => { startupTimer = setTimeout(() => resolve(false), 2000); })
      ]);
    } catch { mediaDriven = false; }
    settled = true;
    clearTimeout(startupTimer);
    if (!mediaDriven) music.pause();
    let fallbackOrigin = performance.now();
    let lastMediaTime = music.currentTime * 1000;
    let lastProgress = performance.now();
    let frame = -1;

    function revealPrize() {
      status.textContent = `Congratulations, ${winner.name}!`;
      button.textContent = 'Draw again';
      button.disabled = false;
      state = 'finished';
      document.getElementById('prize-winner').textContent = winner.name;
      document.body.classList.add('prize-open');
      prizeReveal.showModal();
      celebrate();

    }

    function tick(now) {
      let elapsed = now - fallbackOrigin;
      if (mediaDriven) {
        elapsed = music.currentTime * 1000;
        if (elapsed > lastMediaTime) { lastMediaTime = elapsed; lastProgress = now; }
        // Continue silently if playback fails or stalls, preserving progress.
        if (music.error || music.paused || now - lastProgress > 1500) {
          mediaDriven = false;
          fallbackOrigin = now - elapsed;
          music.pause();
        }
      }
      let next = 0;
      while (next < frames.length - 1 && frames[next + 1] <= elapsed) next++;
      if (elapsed >= lockAt) next = frames.length - 1;
      if (next !== frame) {
        frame = next;
        const offset = winnerIndex - (frames.length - 1) + frame;
        const index = ((offset % participants.length) + participants.length) % participants.length;
        // Reduced motion keeps the name still until the same musical reveal cue.
        if (!reducedMotion || elapsed >= lockAt) name.textContent = participants[index].name;
      }
      if (elapsed >= lockAt && winnerVisibleAt === null) {
        name.textContent = winner.name;
        stage.className = 'stage winner';
        winnerVisibleAt = now;
      }
      // Ensure a real visible hold even after a delayed/background frame.
      if (elapsed >= revealAt && winnerVisibleAt !== null && now - winnerVisibleAt >= 1000) {
        revealPrize();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();
