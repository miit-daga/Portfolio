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

const HOURS: ({ until: number } & KolkataMood)[] = [
  { until: 7, label: "probably asleep", color: "#818cf8", reply: "expect a reply by morning" },
  { until: 10, label: "morning coffee", color: "#fbbf24", reply: "replies after the first coffee" },
  { until: 19, label: "probably coding", color: "#34d399", reply: "replies usually within a few hours" },
  { until: 23, label: "on a side project", color: "#2dd4bf", reply: "replies likely tonight" },
  { until: 24, label: "late-night commits", color: "#a78bfa", reply: "expect a reply by morning" },
];

export function kolkataNow(date: Date = new Date()): { hour: number; time: string; mood: KolkataMood } {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format(date),
  );
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(date);
  const mood = HOURS.find((h) => hour < h.until) ?? HOURS[0];
  return { hour, time, mood };
}
