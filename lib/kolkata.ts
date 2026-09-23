// Kolkata's clock and what that hour usually looks like, shared by the hero's
// status chip and the contact globe's reply-time line, so the two can never
// disagree about whether Miit is awake.

export type KolkataMood = {
  /** Short status for the hero chip. */
  label: string;
  color: string;
  /** When a message sent now is likely to be answered. */
  reply: string;
};

// "probably asleep" is also what the astronaut and the idle alien check for
// night, so keep that label on the small hours
const HOURS: ({ until: number } & KolkataMood)[] = [
  { until: 6, label: "probably asleep", color: "#818cf8", reply: "expect a reply by morning" },
  { until: 8, label: "waking up slowly", color: "#fcd34d", reply: "replies after the first coffee" },
  { until: 10, label: "morning coffee", color: "#fbbf24", reply: "replies after the first coffee" },
  { until: 13, label: "deep in code", color: "#34d399", reply: "replies usually within a few hours" },
  { until: 14, label: "lunch break", color: "#fb923c", reply: "replies after lunch" },
  { until: 17, label: "probably coding", color: "#34d399", reply: "replies usually within a few hours" },
  { until: 18, label: "evening chai", color: "#f59e0b", reply: "replies usually within a few hours" },
  { until: 20, label: "wrapping up the day", color: "#38bdf8", reply: "replies likely tonight" },
  { until: 23, label: "on a side project", color: "#2dd4bf", reply: "replies likely tonight" },
  { until: 24, label: "late-night commits", color: "#a78bfa", reply: "expect a reply by morning" },
];

// Saturdays and Sundays, through the day
const WEEKEND: KolkataMood = { label: "weekend mode", color: "#f472b6", reply: "replies may take a little longer" };

/** ?kolkata=<0-23> previews an hour in Kolkata (the sleeping astronaut, the alien's torch). */
function previewHour(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("kolkata");
  const h = raw === null || raw === "" ? NaN : Number(raw);
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : null;
}

export function kolkataNow(date: Date = new Date()): { hour: number; time: string; mood: KolkataMood } {
  const preview = previewHour();
  const hour = preview ?? Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format(date),
  );
  const time =
    preview !== null
      ? `${preview % 12 || 12}:00 ${preview < 12 ? "AM" : "PM"}`
      : new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(date);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(date);
  const weekend = (weekday === "Sat" || weekday === "Sun") && hour >= 10 && hour < 20;
  const mood = weekend ? WEEKEND : HOURS.find((h) => hour < h.until) ?? HOURS[0];
  return { hour, time, mood };
}
