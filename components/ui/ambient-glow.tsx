"use client"

import { useEffect, useRef } from "react"

// Scroll-linked ambient tint: each section warms the sky with its own hue so
// the page reads as one continuous voyage through different regions of space.
// Deliberately faint - the starfield stays the hero of the backdrop, and the
// hues steer away from the site's omnipresent teal.

type Stop = { id: string; rgb: [number, number, number] }

const STOPS: Stop[] = [
  { id: "about-me", rgb: [56, 189, 248] }, // sky
  { id: "workex", rgb: [251, 146, 60] }, // amber
  { id: "education", rgb: [96, 165, 250] }, // blue
  { id: "skills-achievements", rgb: [167, 139, 250] }, // violet
  { id: "projects", rgb: [244, 114, 182] }, // rose
  { id: "publications", rgb: [129, 140, 248] }, // indigo
  { id: "contact", rgb: [251, 191, 36] }, // gold
]

const PEAK_ALPHA = 0.085

export const AmbientGlow = () => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let anchors: { top: number; rgb: [number, number, number] }[] = []

    // Layout position up the offset chain - immune to reveal-animation
    // transforms, same approach as the scroll-progress checkpoints
    const offsetTopOf = (node: HTMLElement) => {
      let y = 0
      let cur: HTMLElement | null = node
      while (cur) {
        y += cur.offsetTop
        cur = cur.offsetParent as HTMLElement | null
      }
      return y
    }

    const apply = () => {
      if (!anchors.length) return
      const center = window.scrollY + window.innerHeight / 2
      const first = anchors[0]

      let rgb = first.rgb
      let alpha = PEAK_ALPHA
      if (center < first.top) {
        // Fade in from nothing across the hero so the tint never fights the
        // hero's own gradient
        alpha = PEAK_ALPHA * Math.max(0, Math.min(1, center / Math.max(1, first.top)))
      } else {
        for (let i = 0; i < anchors.length - 1; i++) {
          const a = anchors[i]
          const b = anchors[i + 1]
          if (center >= a.top && center < b.top) {
            let t = (center - a.top) / Math.max(1, b.top - a.top)
            t = t * t * (3 - 2 * t) // ease so each hue lingers on its section
            rgb = [
              Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t),
              Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t),
              Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t),
            ]
            break
          }
          rgb = b.rgb
        }
      }

      const [r, g, b] = rgb
      el.style.background = [
        `radial-gradient(120% 85% at 50% -10%, rgba(${r},${g},${b},${alpha.toFixed(3)}) 0%, rgba(${r},${g},${b},0) 62%)`,
        `radial-gradient(90% 70% at 88% 108%, rgba(${r},${g},${b},${(alpha * 0.55).toFixed(3)}) 0%, rgba(${r},${g},${b},0) 58%)`,
      ].join(", ")
    }

    const measure = () => {
      anchors = STOPS.flatMap((s) => {
        const target = document.getElementById(s.id)
        return target ? [{ top: offsetTopOf(target), rgb: s.rgb }] : []
      })
      apply()
    }

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        apply()
      })
    }

    measure()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", measure)
    // Re-measure when the page height changes (async Projects load, reveals)
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", measure)
      ro.disconnect()
    }
  }, [])

  return <div ref={ref} aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }} />
}
