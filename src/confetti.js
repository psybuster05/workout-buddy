// Tiny dependency-free confetti burst for finishing a workout. Spawns a
// full-screen canvas, fires particles up from the bottom, and cleans itself
// up when the last one falls off screen. No loop timers survive it.
export function burstConfetti(accent = '#ff3b3b') {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;inset:0;z-index:100;pointer-events:none'
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const W = window.innerWidth
  const H = window.innerHeight
  const colors = [accent, accent, '#f5f5f7', '#ffb02e', '#ff3b3b', '#3b9dff', '#2ee66e']
  const rand = (a, b) => a + Math.random() * (b - a)

  // two poppers, bottom corners, firing up and inward
  const particles = []
  for (let i = 0; i < 140; i++) {
    const fromLeft = i % 2 === 0
    const angle = fromLeft ? rand(-80, -35) : rand(-145, -100) // degrees
    const speed = rand(9, 17)
    particles.push({
      x: fromLeft ? rand(-10, W * 0.15) : rand(W * 0.85, W + 10),
      y: H + rand(0, 40),
      vx: Math.cos((angle * Math.PI) / 180) * speed,
      vy: Math.sin((angle * Math.PI) / 180) * speed,
      w: rand(6, 11),
      h: rand(3, 6),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.3, 0.3),
      color: colors[i % colors.length],
    })
  }

  let last = performance.now()
  const tick = (now) => {
    // normalize to ~60fps steps so speed doesn't depend on refresh rate
    const dt = Math.min((now - last) / 16.7, 3)
    last = now
    ctx.clearRect(0, 0, W, H)
    let alive = false
    for (const p of particles) {
      p.vy += 0.25 * dt // gravity
      p.vx *= 0.99
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      if (p.y < H + 30) alive = true
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (alive) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}
