// ORCID's iD icon: the white "iD" on its green circle
export function OrcidIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" aria-hidden className={className}>
            <circle cx="16" cy="16" r="16" fill="#A6CE39" />
            <rect x="9" y="11.5" width="2.6" height="11" rx="0.4" fill="#fff" />
            <circle cx="10.3" cy="8.3" r="1.6" fill="#fff" />
            <path d="M 14 11.5 H 18 C 22.2 11.5 24.4 14.2 24.4 17 C 24.4 19.8 22.2 22.5 18 22.5 H 14 Z M 16.6 13.9 V 20.1 H 18 C 20.4 20.1 21.7 18.7 21.7 17 C 21.7 15.3 20.4 13.9 18 13.9 Z" fill="#fff" fillRule="evenodd" />
        </svg>
    );
}
