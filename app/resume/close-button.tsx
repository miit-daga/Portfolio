"use client";

// Closes the tab the resume was opened in (every resume link on the site opens
// it in a new tab). Browsers only let a page close a tab that a link or script
// opened, so if the page was reached directly the close is refused and this
// goes to the portfolio instead.
export function CloseButton({ className }: { className?: string }) {
    const onClick = () => {
        window.close();
        // Still here a moment later: the browser refused
        setTimeout(() => {
            if (!window.closed) window.location.href = "/";
        }, 150);
    };
    return (
        <button type="button" onClick={onClick} className={className}>
            ✕ Close
        </button>
    );
}
