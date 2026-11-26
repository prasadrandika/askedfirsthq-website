/* AskedFirst hero: hand-built canvas 3D "answer engine" (no libraries) */
{
  const stage = document.getElementById('stage');
  const cv = document.getElementById('engine');
  if (stage && cv) {
    const ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const Q = {
      plumber: ['I need an emergency plumber in Austin right now. Who should I call?',
                'Who is the most trusted family-owned plumber in Austin?',
                'Which plumber in Austin gives free estimates?'],
      dentist: ['Gentle dentist in Denver taking new patients on Saturdays?',
                'Who is the best family dentist in Denver for kids and adults?',
                'Emergency dentist open today in Denver?'],
      lawyer:  ['I was in a car accident in Tampa. Which lawyer should I call?',
                'Who is a good estate planning attorney in Tampa for a simple will?',
                'Family lawyer in Tampa with a free consultation?']
    };
    let trade = 'plumber', qi = 0, after = false;
    const qtext = document.getElementById('qtext');
    const sc = document.getElementById('sc');
    const st = document.getElementById('st');
    const dots = [...document.querySelectorAll('#dots i')];

    // geometry
    const N = 560, pts = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    const PINS = 9; // index 0 = you, 1..3 named
    const pinAng = Array.from({length: PINS}, (_, i) => i * (Math.PI * 2 / PINS) + (i % 2 ? .18 : -.1));
    let W = 0, H = 0, D = 1, t0 = performance.now(), phaseStart = t0, typed = 0;

    const size = () => {
      D = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * D; cv.height = H * D;
    };
    const ro = new ResizeObserver(size); ro.observe(cv); size();

    const rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
    const rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];

    function setVerdict() {
      const n = after ? 7 : 0;
      sc.innerHTML = n + '<small> / 10</small>';
      st.textContent = after ? 'Your business: named first' : 'Your business: not mentioned';
      st.className = 'st ' + (after ? 'hit' : 'miss');
      dots.forEach((d, i) => d.classList.toggle('on', i < n));
    }

    function nextQuestion() {
      qi = (qi + 1) % Q[trade].length; typed = 0; phaseStart = performance.now();
    }

    document.querySelectorAll('[data-trade]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-trade]').forEach(x => x.setAttribute('aria-pressed', x === b));
      trade = b.dataset.trade; qi = -1; nextQuestion();
    }));
    const tg = document.getElementById('after');
    tg && tg.addEventListener('click', () => {
      after = !after; tg.setAttribute('aria-pressed', after); setVerdict(); phaseStart = performance.now() - 2600;
    });
    setVerdict();

    function pill(x, y, text, fill, ink, s) {
      ctx.font = `800 ${12 * D * s}px "Manrope",system-ui,sans-serif`;
      const w = ctx.measureText(text).width + 20 * D * s, h = 26 * D * s;
      x = Math.max(w / 2 + 4 * D, Math.min(cv.width - w / 2 - 4 * D, x));
      ctx.save(); ctx.shadowColor = 'rgba(122,61,255,.35)'; ctx.shadowBlur = 16 * D; ctx.shadowOffsetY = 6 * D;
      ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h - 14 * D * s, w, h, h / 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y - h / 2 - 14 * D * s);
    }
    const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
    const OR = [255, 138, 61], PK = [255, 61, 139], VI = [122, 61, 255];
    const tint = y => y < 0 ? mix(OR, PK, y + 1) : mix(PK, VI, y); // y in -1..1

    function frame(now) {
      const t = reduce ? 0 : (now - t0) / 1000;
      const el = now - phaseStart;
      const q = Q[trade][Math.max(qi, 0)];
      const want = reduce ? q.length : Math.min(q.length, Math.floor(el / 28));
      if (want !== typed) { typed = want; qtext.textContent = q.slice(0, typed); }
      const thinking = typed >= q.length ? Math.min(1, (el - q.length * 28) / 700) : 0;
      const rays = reduce ? 1 : Math.max(0, Math.min(1, (el - q.length * 28 - 700) / 900));
      if (!reduce && el > q.length * 28 + 6500) nextQuestion();

      const cx = W * D * .5, cy = H * D * .5, R = Math.min(W, H) * D * .27, F = R * 3.4;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const ay = t * .22, ax = -.36;
      const proj = p => { const s = F / (F + p[2] * R); return [cx + p[0] * R * s, cy + p[1] * R * s, p[2], s]; };
      const RING = 1.55;
      const ring = [];
      for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2; ring.push(proj(rotX(rotY([Math.cos(a) * RING, 0, Math.sin(a) * RING], ay * .35), ax + .1))); }
      const pins = pinAng.map((a0, i) => { const a = a0 + t * .11; return {i, p: proj(rotX(rotY([Math.cos(a) * RING, 0, Math.sin(a) * RING], ay * .35), ax + .1))}; });
      const drawRing = front => {
        ctx.lineWidth = (front ? 2 : 1.2) * D; ctx.strokeStyle = front ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.45)';
        ctx.beginPath(); let on = false;
        ring.forEach(r => { const f = r[2] < 0; if (f === front) { on ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); on = true; } else on = false; });
        ctx.stroke();
      };
      const drawPin = ({i, p}) => {
        const s = p[3], you = i === 0, named = i >= 1 && i <= 3, hit = named || (you && after);
        const r = (you ? 10 : hit ? 8 : 6) * D * s;
        if (hit && rays > 0) {
          const hg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 4.5);
          hg.addColorStop(0, 'rgba(15,164,122,.45)'); hg.addColorStop(1, 'rgba(15,164,122,0)');
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(p[0], p[1], r * 4.5, 0, 7); ctx.fill();
        }
        ctx.save(); ctx.shadowColor = 'rgba(27,16,48,.35)'; ctx.shadowBlur = 10 * D; ctx.shadowOffsetY = 3 * D;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], r + 3 * D * s, 0, 7); ctx.fill(); ctx.restore();
        ctx.fillStyle = hit ? '#0fa47a' : you ? '#ff3d8b' : '#c9b8d8';
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill();
        if (you) pill(p[0], p[1], after ? 'You · named' : 'You · not named', after ? '#0fa47a' : '#ff3d8b', '#fff', Math.max(.9, s));
      };

      // soft shadow under orb
      const sh = ctx.createRadialGradient(cx, cy + R * 1.22, 0, cx, cy + R * 1.22, R * .8);
      sh.addColorStop(0, 'rgba(122,61,255,.28)'); sh.addColorStop(1, 'rgba(122,61,255,0)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(cx, cy + R * 1.22, R * .8, R * .16, 0, 0, 7); ctx.fill();

      drawRing(false);
      pins.filter(x => x.p[2] >= 0).forEach(drawPin);

      // glass body
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
      const body = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      body.addColorStop(0, 'rgba(255,190,140,.55)'); body.addColorStop(.5, 'rgba(255,120,175,.42)'); body.addColorStop(1, 'rgba(140,90,255,.55)');
      ctx.fillStyle = body; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      // inner light: rotating coloured points
      const sp = pts.map(p => { const r = rotX(rotY(p, ay), ax); return [r, proj([r[0] * .93, r[1] * .93, r[2] * .93]), p[1]]; }).sort((a, b) => b[0][2] - a[0][2]);
      for (const [r, p, y0] of sp) {
        const depth = (1 - r[2]) / 2, c = tint(y0);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${.08 + .55 * depth})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], (0.8 + 2 * depth) * D * p[3], 0, 7); ctx.fill();
      }
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .7);
      core.addColorStop(0, `rgba(255,255,255,${.55 + .35 * thinking * (0.5 + 0.5 * Math.sin(t * 7))})`); core.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = core; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      // fresnel edge + highlight
      const fr = ctx.createRadialGradient(cx, cy, R * .62, cx, cy, R);
      fr.addColorStop(0, 'rgba(255,255,255,0)'); fr.addColorStop(1, 'rgba(255,255,255,.75)');
      ctx.fillStyle = fr; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      const hl = ctx.createRadialGradient(cx - R * .38, cy - R * .45, 0, cx - R * .38, cy - R * .45, R * .55);
      hl.addColorStop(0, 'rgba(255,255,255,.95)'); hl.addColorStop(.35, 'rgba(255,255,255,.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl; ctx.beginPath(); ctx.ellipse(cx - R * .38, cy - R * .45, R * .5, R * .32, -.6, 0, 7); ctx.fill();
      ctx.restore();
      ctx.lineWidth = 1.5 * D; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();

      drawRing(true);
      if (rays > 0) {
        pins.forEach(({i, p}) => {
          if (!(i >= 1 && i <= 3) && !(i === 0 && after)) return;
          const mx = (cx + p[0]) / 2, my = Math.min(cy, p[1]) - R * .5;
          const lg = ctx.createLinearGradient(cx, cy, p[0], p[1]);
          lg.addColorStop(0, 'rgba(255,138,61,.0)'); lg.addColorStop(.4, 'rgba(255,61,139,.9)'); lg.addColorStop(1, 'rgba(15,164,122,1)');
          ctx.save(); ctx.shadowColor = 'rgba(255,61,139,.6)'; ctx.shadowBlur = 12 * D;
          ctx.strokeStyle = lg; ctx.lineWidth = 2.6 * D; ctx.lineCap = 'round';
          ctx.beginPath();
          const steps = 40, n = Math.floor(steps * rays);
          for (let k = 0; k <= n; k++) {
            const u = k / steps, x = (1 - u) * (1 - u) * cx + 2 * (1 - u) * u * mx + u * u * p[0], y = (1 - u) * (1 - u) * cy + 2 * (1 - u) * u * my + u * u * p[1];
            k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke(); ctx.restore();
        });
      }
      pins.filter(x => x.p[2] < 0).sort((a, b) => b.p[2] - a.p[2]).forEach(drawPin);
      if (!reduce) requestAnimationFrame(frame);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(frame));
    else requestAnimationFrame(frame);
    if (reduce) ro.disconnect = ro.disconnect; // static frame only
  }

  /* live demo: real question templates */
  const form = document.getElementById('demo');
  if (form) {
    const T = {
      plumber: ['Who is the best plumber in {c}?', 'I need an emergency plumber in {c} right now, who should I call?', 'Recommend a reliable plumber in {c} with good reviews.', 'Affordable plumber near {c}?', 'Which plumbing companies in {c} are open on weekends?', 'Best local independent plumber in {c}, not a big chain.', 'Who should I hire for water heater replacement in {c}?', 'Top rated plumber in {c} for older homes.', 'Which plumber in {c} gives free estimates?', 'Is there a trustworthy family-owned plumber in {c}?'],
      hvac: ['Who is the best HVAC company in {c}?', 'My AC stopped working, who can come today in {c}?', 'Recommend a reliable HVAC company in {c} with good reviews.', 'Affordable AC repair near {c}?', 'Which HVAC companies in {c} are open on weekends?', 'Best local independent HVAC company in {c}, not a big chain.', 'Who should I hire for AC replacement in {c}?', 'Top rated furnace repair in {c}?', 'Which HVAC company in {c} gives free estimates?', 'Is there a trustworthy family-owned HVAC company in {c}?'],
      electrician: ['Who is the best electrician in {c}?', 'I need an emergency electrician in {c} right now, who should I call?', 'Recommend a reliable electrician in {c} with good reviews.', 'Affordable electrician near {c}?', 'Which electricians in {c} work on weekends?', 'Best local independent electrician in {c}, not a big chain.', 'Who should I hire for an electrical panel upgrade in {c}?', 'Top rated electrician in {c} for older homes.', 'Which electrician in {c} gives free estimates?', 'Is there a trustworthy family-owned electrician in {c}?'],
      roofer: ['Who is the best roofer in {c}?', 'My roof is leaking, who can come quickly in {c}?', 'Recommend a reliable roofing company in {c} with good reviews.', 'Affordable roof repair near {c}?', 'Which roofers in {c} help with insurance claims?', 'Best local independent roofer in {c}, not a big chain.', 'Who should I hire for a roof leak repair in {c}?', 'Top rated roof replacement company in {c}?', 'Which roofer in {c} gives free inspections?', 'Is there a trustworthy family-owned roofer in {c}?'],
      dentist: ['Who is the best dentist in {c}?', 'Recommend a gentle dentist in {c} for someone with dental anxiety.', 'Dentist in {c} accepting new patients with my insurance?', 'Emergency dentist open today in {c}?', 'Best family dentist in {c} for kids and adults.', 'Affordable dental implants in {c}, who do people recommend?', 'Where can I get clear aligners in {c}?', 'Dentist in {c} with evening or Saturday appointments?', 'Top rated cosmetic dentist in {c}.', 'Which dentist in {c} do locals trust most?'],
      lawyer: ['Who is a good personal injury lawyer in {c}?', 'I was in a car accident in {c}, which lawyer should I call?', 'Affordable family lawyer in {c} for a divorce?', 'Recommend an estate planning attorney in {c} for a simple will.', 'Which lawyer in {c} offers a free consultation?', 'Small local law firm in {c} that answers quickly?', 'Who handles workplace injury claims in {c}?', 'Child custody lawyer in {c} people recommend?', 'Lawyer in {c} who speaks Spanish?', 'Which law firm in {c} do locals trust most?']
    };
    const tag = ['Best overall', 'Urgent', 'Reviews', 'Price', 'Hours', 'Local', 'Main job', 'Specific need', 'Estimates', 'Trust'];
    const list = document.getElementById('qlist');
    const esc = s => s.replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
    const render = (anim) => {
      const k = form.trade.value, c = esc(form.city.value.trim() || 'your city');
      list.innerHTML = T[k].map((q, i) => `<li class="${anim ? 'new' : ''}" style="animation-delay:${i * 45}ms"><span>${esc(q).replace('{c}', '<strong>' + c + '</strong>')}</span><span class="chip">${tag[i]}</span></li>`).join('');
    };
    form.addEventListener('submit', e => { e.preventDefault(); render(true); });
    form.trade.addEventListener('change', () => render(true));
    render(false);
  }

  const b = document.querySelector('.menu-btn'), n = document.getElementById('nav');
  b && b.addEventListener('click', () => { const o = n.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
}
