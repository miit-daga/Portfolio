// The resume lives in Google Drive; the site shows it at /resume in an
// embedded Drive preview. Every "Resume" link on the site points to /resume,
// so the Drive file can be swapped here without touching them.

// NEXT_PUBLIC_RESUME_LINK is a Drive "view" link; the id is taken from it,
// with the current file as the fallback
const FALLBACK_ID = "1s1R9I9_M97iFpcxYwwsb490K2puJW4r1";
const fromEnv = process.env.NEXT_PUBLIC_RESUME_LINK?.match(/\/file\/d\/([^/]+)/)?.[1];

export const RESUME_DRIVE_ID = fromEnv || FALLBACK_ID;

/** Embeddable viewer (Drive allows /preview in an iframe). */
export const RESUME_PREVIEW_URL = `https://drive.google.com/file/d/${RESUME_DRIVE_ID}/preview`;
/** Direct PDF download. */
export const RESUME_DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${RESUME_DRIVE_ID}`;
/** The file in Drive itself. */
export const RESUME_DRIVE_URL = `https://drive.google.com/file/d/${RESUME_DRIVE_ID}/view`;

/** The on-site page every resume link opens. */
export const RESUME_PAGE = "/resume";
export const RESUME_PAGE_ABSOLUTE = "https://miitdaga.dev/resume";
