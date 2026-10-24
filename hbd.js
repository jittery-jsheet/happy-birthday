// [frequency in Hz, length in beats]
const SONG = [
  [392, .75], [392, .25], [440, 1], [392, 1], [523, 1], [494, 2],
  [392, .75], [392, .25], [440, 1], [392, 1], [587, 1], [523, 2],
  [392, .75], [392, .25], [784, 1], [659, 1], [523, 1], [494, 1], [440, 2],
  [698, .75], [698, .25], [659, 1], [523, 1], [587, 1], [523, 2]
];
// The first label ("Click for a surprise") lives in the HTML. This one shows after the show.
const LABEL_AGAIN = 'Play again';

const BEAT = 0.5;       // seconds per beat (lower = faster)
const LIT_AT = 5.3;     // seconds until the last flame is lit (matches the CSS timeline)

const cake = document.getElementById('cake');
const title = document.getElementById('title');

// Split the title into letters so each one can animate on its own
(function splitTitle() {
  const words = title.textContent.trim().split(' ');
  title.textContent = '';
  let i = 0;                                   // running letter number
  words.forEach((w, wi) => {
    const word = document.createElement('span');
    word.className = 'word';
    word.setAttribute('aria-hidden', 'true');  // the h1's aria-label is read instead
    [...w].forEach(ch => {
      const l = document.createElement('span');
      l.className = 'letter';
      l.textContent = ch;
      l.style.setProperty('--i', i);                   // used for hue + order
      l.style.setProperty('--appear', i * 0.05 + 's'); // 0.05s stagger per letter
      word.appendChild(l);
      i++;
    });
    title.appendChild(word);
    if (wi < words.length - 1) title.appendChild(document.createTextNode(' '));
  });
})();
const btn = document.getElementById('playBtn');
let ctx = null;
let playing = false;

// Restart the CSS intro: remove the class, force a reflow, add it back
function replay() {
  cake.classList.remove('intro', 'out');
  title.classList.remove('pop-in');
  void cake.offsetWidth;
  cake.classList.add('intro');
  title.classList.add('pop-in');
  scheduleConfetti();
}

// startDelay = seconds to wait before the first note
function playSong(startDelay) {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();

  let time = ctx.currentTime + startDelay;

  SONG.forEach(([freq, beats]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
    gain.gain.linearRampToValueAtTime(0, time + beats * BEAT - 0.03);

    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + beats * BEAT);

    time += beats * BEAT;
  });

  // Blow out the candles when the song ends
  setTimeout(() => {
    cake.classList.add('out');
    playing = false;
    showButton(LABEL_AGAIN);          // the button comes back
  }, (time - ctx.currentTime) * 1000);
}

// Bring the button back with a pop
function showButton(label) {
  btn.textContent = label;
  btn.disabled = false;
  btn.classList.remove('is-hidden', 'leave', 'reappear');
  void btn.offsetWidth;               // restart the animation
  btn.classList.add('reappear');
}

// Reveal the title and cake, then start music + confetti
function startShow() {
  const firstTime = document.body.classList.contains('waiting');
  document.body.classList.remove('waiting');   // title + cake appear, their animations begin
  if (!firstTime) replay();                    // on later clicks, restart the animations
  playSong(LIT_AT);                            // music starts right when the flames light
  scheduleConfetti();
}

btn.addEventListener('click', () => {
  if (playing) return;
  playing = true;
  btn.disabled = true;
  btn.classList.remove('reappear');
  btn.classList.add('leave');                  // button pops out...
  setTimeout(() => {                           // ...then the show begins
    btn.classList.remove('leave');
    btn.classList.add('is-hidden');
    startShow();
  }, 350);
});

// ---------- CONFETTI ----------
const confetti = document.getElementById('confetti');
const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#b388ff', '#ffa94d'];
const rand = (min, max) => Math.random() * (max - min) + min;
let confettiTimer = null;

// Fire one burst from the top of the cake
// opts lets us aim bursts from different places (defaults = from the cake)
function burst(opts = {}) {
  // Skip if the user turned off motion in their OS
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const r = cake.getBoundingClientRect();
  const {
    x = r.left + r.width / 2, y = r.top + 70,
    count = 90, minAngle = -160, maxAngle = -20, minSpeed = 140, maxSpeed = 360
  } = opts;
  const originX = x;
  const originY = y;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'piece';

    // Random size, color, and shape (rectangle or circle)
    const w = rand(6, 11);
    const h = Math.random() < 0.5 ? w : rand(4, 6);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.left = originX - w / 2 + 'px';
    el.style.top = originY - h / 2 + 'px';
    el.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    if (Math.random() < 0.3) el.style.borderRadius = '50%';
    confetti.appendChild(el);

    // Shoot out in a fan pointing upward (-160deg to -20deg)
    const angle = rand(minAngle, maxAngle) * Math.PI / 180;
    const speed = rand(minSpeed, maxSpeed);
    const dx = Math.cos(angle) * speed;       // sideways distance
    const dy = Math.sin(angle) * speed;       // negative = up
    const fall = Math.abs(dy) + rand(150, 400); // drops back past where it started
    const spin = rand(-720, 720);

    // 3 stops: pop in at the origin -> peak of the arc -> fall and fade
    const anim = el.animate([
      { transform: 'translate(0, 0) rotate(0deg) scale(0)', opacity: 1,
        offset: 0, easing: 'cubic-bezier(0.15, 0.85, 0.3, 1)' },       // fast burst, slows near the peak
      { transform: `translate(${dx * 0.8}px, ${dy}px) rotate(${spin * 0.4}deg) scale(1)`, opacity: 1,
        offset: 0.35, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },      // gravity pulls it down
      { transform: `translate(${dx}px, ${dy + fall}px) rotate(${spin}deg) scale(1)`, opacity: 1,
        offset: 0.85 },
      { transform: `translate(${dx}px, ${dy + fall + 40}px) rotate(${spin}deg) scale(1)`, opacity: 0,
        offset: 1 }
    ], { duration: rand(2200, 3200), fill: 'forwards' });

    anim.onfinish = () => el.remove();        // clean up when done
  }
}

// Fire the burst at the moment the last flame lights
function scheduleConfetti() {
  clearTimeout(confettiTimer);
  confettiTimer = setTimeout(() => {
    burst();                                   // main burst from the cake
    setTimeout(() => {                         // then two cannons from the bottom corners
      burst({ x: 0, y: innerHeight, count: 50, minAngle: -80, maxAngle: -45, minSpeed: 500, maxSpeed: 900 });
      burst({ x: innerWidth, y: innerHeight, count: 50, minAngle: -135, maxAngle: -100, minSpeed: 500, maxSpeed: 900 });
    }, 250);
  }, LIT_AT * 1000);
}

// Click the cake to blow out the candles
cake.addEventListener('click', () => cake.classList.add('out'));