import { warpForJump } from "@/components/ui/warp-overlay";

// In-page jumps: scroll the WINDOW to the element's absolute position. Using
// window.scrollTo (not scrollIntoView) avoids scrolling the overflow-hidden
// wrapper, which the reveal transforms turn into a nested scroll container and
// which made the page "stick" at the Projects grid.
//
// Fixed-duration eased scroll that re-reads the target's LIVE position each
// frame, so it's a visible smooth glide that still follows any layout shift
// (sections revealing below) without the settle-then-jump of a fixed target.
// Pass "#" (or "#hero") to glide back to the top of the page.
export function scrollToSection(link: string) {
    const id = link.replace(/^#/, "");
    const el = id ? document.getElementById(id) : null;
    if (id && !el) return;

    // Disable pointer events so content sliding under the cursor can't trigger
    // hover-driven layout shifts (e.g. project cards expanding) mid-scroll.
    document.body.style.pointerEvents = "none";

    const getTop = () => (el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - 16) : 0);
    const startY = window.scrollY;
    const duration = 750;

    // Hyperspace streak only when skipping several sections
    warpForJump(link, 850);
    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    let startTime: number | null = null;

    const step = (now: number) => {
        if (startTime === null) startTime = now;
        const t = Math.min(1, (now - startTime) / duration);
        const y = startY + (getTop() - startY) * easeInOut(t);
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            window.scrollTo({ top: getTop(), behavior: "instant" as ScrollBehavior });
            document.body.style.pointerEvents = "";
        }
    };
    requestAnimationFrame(step);
}
