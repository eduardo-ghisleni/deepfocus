import { useEffect, useRef } from 'react'

export default function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 260 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.4 + 0.2,
      opacity: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.015 + 0.004,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
      driftY: Math.random() * 0.08 + 0.01,
      color: Math.random() > 0.85
        ? `rgba(147, 197, 253, `   // blue-ish
        : Math.random() > 0.5
          ? `rgba(196, 181, 253, ` // purple-ish
          : `rgba(255, 255, 255, `, // white
    }))

    // A few bigger "glow" stars
    const glowStars = Array.from({ length: 12 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 0.8 + 0.6,
      opacity: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 0.008 + 0.002,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
    }))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      stars.forEach(s => {
        s.opacity += s.twinkleSpeed * s.twinkleDir
        if (s.opacity >= 1)   { s.opacity = 1;   s.twinkleDir = -1 }
        if (s.opacity <= 0.1) { s.opacity = 0.1; s.twinkleDir =  1 }
        s.y += s.driftY
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width }
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${s.color}${s.opacity})`
        ctx.fill()
      })

      glowStars.forEach(s => {
        s.opacity += s.twinkleSpeed * s.twinkleDir
        if (s.opacity >= 0.8) { s.opacity = 0.8; s.twinkleDir = -1 }
        if (s.opacity <= 0.1) { s.opacity = 0.1; s.twinkleDir =  1 }

        // Glow effect
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 4)
        grad.addColorStop(0, `rgba(147, 197, 253, ${s.opacity})`)
        grad.addColorStop(1, `rgba(147, 197, 253, 0)`)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.radius * 4, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`
        ctx.fill()
      })

      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
