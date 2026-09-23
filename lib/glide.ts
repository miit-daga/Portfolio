// Smooth-scroll an element to the middle of the screen, then pulse a teal
// outline round it so the eye lands on it. Used by the command palette's
// search and the About paragraph's keywords.

export function glideTo(el: Element, then?: () => void) {
    const r = el.getBoundingClientRect();
    const top = window.scrollY + r.top - window.innerHeight / 2 + r.height / 2;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    window.setTimeout(() => {
        const h = el as HTMLElement;
        const prev = { outline: h.style.outline, offset: h.style.outlineOffset, radius: h.style.borderRadius };
        h.style.outline = "2px solid rgba(45,212,191,0)";
        h.style.outlineOffset = "6px";
        if (!prev.radius) h.style.borderRadius = "12px";
        const anim = h.animate(
            [
                { outlineColor: "rgba(45,212,191,0)" },
                { outlineColor: "rgba(45,212,191,0.95)", offset: 0.15 },
                { outlineColor: "rgba(45,212,191,0.95)", offset: 0.75 },
                { outlineColor: "rgba(45,212,191,0)" },
            ],
            { duration: 1900, easing: "ease-in-out" },
        );
        anim.onfinish = () => {
            h.style.outline = prev.outline;
            h.style.outlineOffset = prev.offset;
            h.style.borderRadius = prev.radius;
        };
        then?.();
    }, 750);
}
