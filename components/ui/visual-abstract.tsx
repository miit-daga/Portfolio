"use client";
import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

// Small animated diagrams that sit on the publication cards, so a visitor gets
// the idea of each paper before (or instead of) reading its abstract.
//
// Every number drawn here comes straight from the paper's own abstract as
// quoted in components/Publications.tsx. Where an animation needs motion that
// the paper does not quantify (which kernel a dataset leans on, which fish get
// set aside), it stays deliberately unlabelled rather than inventing a figure.
//
// They loop only while on screen. Reduced motion gets a still of the finished
// state.

export type VisualAbstractKind = "verix" | "quantum" | "aquaselect" | "patent" | "hemocline";

const VIOLET = "#a78bfa";
const INDIGO = "#818cf8";
const LAVENDER = "#c4b5fd";
const EMERALD = "#34d399";
const AMBER = "#fbbf24";
const MUTED = "#71717a";
const FAINT = "rgba(255,255,255,0.08)";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type Props = { play: boolean };

export const VisualAbstract = ({ kind }: { kind: VisualAbstractKind }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const play = inView && !reduce;

  const Figure = FIGURES[kind];
  return (
    <div ref={ref} aria-hidden className="mt-5 rounded-xl border border-white/[0.07] bg-black/40 px-2 pb-2 pt-1.5">
      <svg viewBox="0 0 300 120" className="block h-auto w-full" style={{ fontFamily: MONO }}>
        <Figure.Svg play={play} />
      </svg>
      <p className="mt-1 text-center font-mono text-[10px] leading-snug tracking-tight text-violet-200/80">
        {Figure.caption}
      </p>
    </div>
  );
};

const Label = ({ x, y, children, anchor = "middle", fill = MUTED }: {
  x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; fill?: string;
}) => (
  <text x={x} y={y} textAnchor={anchor} fontSize="7.5" letterSpacing="0.4" fill={fill}>
    {children}
  </text>
);

/* -------------------------------------------------------------------------- */
/* VeriX-Anon: three orthogonal checks on the cloud's anonymisation            */
/* -------------------------------------------------------------------------- */

const LEAVES = [16, 38, 60, 82];
const MIDS = [27, 71];
const ROOT = 49;

const VerixSvg = ({ play }: Props) => {
  // Leaf -> mid -> root climb for each leaf, staggered
  const climbs = LEAVES.map((lx, i) => {
    const mx = MIDS[i < 2 ? 0 : 1];
    return { xs: [lx, mx, ROOT], ys: [92, 62, 32], delay: i * 0.35 };
  });
  const rows = [0, 1, 2, 3, 4, 5, 6];
  const traps = new Set([2, 5]);

  return (
    <g>
      {/* Panel labels */}
      <Label x={49} y={12} fill={LAVENDER}>HASH TREE</Label>
      <Label x={150} y={12} fill={LAVENDER}>TRAP ROWS</Label>
      <Label x={252} y={12} fill={LAVENDER}>XAI FINGERPRINT</Label>
      <line x1={100} y1={20} x2={100} y2={110} stroke={FAINT} />
      <line x1={202} y1={20} x2={202} y2={110} stroke={FAINT} />

      {/* 1. Merkle-style tree: hashes climb, the root verifies */}
      {LEAVES.map((lx, i) => (
        <line key={`l${i}`} x1={lx} y1={92} x2={MIDS[i < 2 ? 0 : 1]} y2={62} stroke="rgba(167,139,250,0.35)" />
      ))}
      {MIDS.map((mx, i) => (
        <line key={`m${i}`} x1={mx} y1={62} x2={ROOT} y2={32} stroke="rgba(167,139,250,0.35)" />
      ))}
      {LEAVES.map((lx) => (
        <rect key={`lr${lx}`} x={lx - 5} y={89} width={10} height={6} rx={1.5} fill="rgba(167,139,250,0.25)" stroke={VIOLET} strokeWidth={0.6} />
      ))}
      {MIDS.map((mx) => (
        <rect key={`mr${mx}`} x={mx - 5} y={59} width={10} height={6} rx={1.5} fill="rgba(129,140,248,0.25)" stroke={INDIGO} strokeWidth={0.6} />
      ))}
      <motion.circle
        cx={ROOT}
        cy={32}
        r={6}
        stroke={EMERALD}
        strokeWidth={1}
        initial={false}
        animate={{ fill: play ? ["rgba(52,211,153,0)", "rgba(52,211,153,0)", "rgba(52,211,153,0.35)", "rgba(52,211,153,0.35)"] : "rgba(52,211,153,0.35)" }}
        transition={play ? { duration: 3.2, times: [0, 0.55, 0.65, 1], repeat: Infinity, repeatDelay: 0.6 } : { duration: 0 }}
      />
      <path d="M46.2 32.2 l2 2 l3.8 -4" fill="none" stroke={EMERALD} strokeWidth={1.2} strokeLinecap="round" />
      {play &&
        climbs.map((c, i) => (
          <motion.circle
            key={`p${i}`}
            r={1.8}
            fill={LAVENDER}
            initial={{ cx: c.xs[0], cy: c.ys[0], opacity: 0 }}
            animate={{ cx: c.xs, cy: c.ys, opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, delay: c.delay, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }}
          />
        ))}
      <Label x={49} y={108}>SHA-256</Label>

      {/* 2. Sentinels and twins hidden among the rows, checked by a sweep */}
      {rows.map((r) => {
        const y = 24 + r * 11;
        const trap = traps.has(r);
        return (
          <g key={`row${r}`}>
            <rect
              x={112}
              y={y}
              width={70}
              height={6}
              rx={1.5}
              fill={trap ? "rgba(251,191,36,0.14)" : "rgba(255,255,255,0.07)"}
              stroke={trap ? AMBER : "none"}
              strokeWidth={0.6}
            />
            {trap && (
              <motion.path
                d={`M186 ${y + 3} l1.6 1.6 l3 -3.4`}
                fill="none"
                stroke={EMERALD}
                strokeWidth={1.1}
                strokeLinecap="round"
                initial={false}
                animate={{ opacity: play ? [0, 0, 1, 1, 0] : 1 }}
                transition={
                  play
                    ? { duration: 2.6, times: [0, (r * 11) / 90, (r * 11) / 90 + 0.05, 0.9, 1], repeat: Infinity, repeatDelay: 0.4 }
                    : { duration: 0 }
                }
              />
            )}
          </g>
        );
      })}
      {play && (
        <motion.rect
          x={108}
          width={78}
          height={1.2}
          fill={LAVENDER}
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: [22, 102], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.4, ease: "linear" }}
        />
      )}
      <Label x={150} y={110}>SENTINELS · TWINS</Label>

      {/* 3. SHAP distributions before and after: near-identical means faithful */}
      <line x1={212} y1={96} x2={294} y2={96} stroke="rgba(255,255,255,0.15)" />
      <motion.path
        d="M212 96 C 230 96, 238 40, 252 40 S 274 96, 294 96"
        fill="none"
        stroke={VIOLET}
        strokeWidth={1.4}
        initial={false}
        animate={{ pathLength: play ? [0, 1, 1] : 1 }}
        transition={play ? { duration: 3, times: [0, 0.5, 1], repeat: Infinity, repeatDelay: 0.6 } : { duration: 0 }}
      />
      <motion.path
        d="M212 96 C 231 96, 240 44, 254 44 S 276 96, 294 96"
        fill="none"
        stroke={INDIGO}
        strokeWidth={1.2}
        strokeDasharray="3 2"
        initial={false}
        // Fades rather than draws: pathLength would overwrite the dash pattern
        animate={{ opacity: play ? [0, 0, 1, 1] : 1 }}
        transition={play ? { duration: 3, times: [0, 0.2, 0.7, 1], repeat: Infinity, repeatDelay: 0.6 } : { duration: 0 }}
      />
      <Label x={222} y={34} anchor="start" fill={VIOLET}>before</Label>
      <Label x={276} y={52} anchor="start" fill={INDIGO}>after</Label>
      <Label x={252} y={108}>WASSERSTEIN</Label>
    </g>
  );
};

/* -------------------------------------------------------------------------- */
/* Quantum stacking: three feature maps, one meta-learner                      */
/* -------------------------------------------------------------------------- */

const MAPS = [
  { y: 26, label: "Angle" },
  { y: 60, label: "Amplitude" },
  { y: 94, label: "ZZ" },
];

// Per-phase edge weights. Only the idea (the meta-learner reweights kernels per
// dataset) is drawn; the paper's per-dataset weights are not implied.
const WEIGHTS = [
  [3, 1, 1],
  [1, 1, 3],
  [1, 3, 1],
];

const QuantumSvg = ({ play }: Props) => (
  <g>
    <Label x={44} y={10} fill={LAVENDER}>FEATURE MAPS</Label>
    <Label x={150} y={10} fill={LAVENDER}>GRAM MATRICES</Label>
    <Label x={250} y={10} fill={LAVENDER}>STACKING</Label>

    {MAPS.map((m, i) => (
      <g key={m.label}>
        {/* Edge: map -> Gram -> meta-learner, with flowing dashes */}
        <motion.path
          d={`M80 ${m.y} L136 ${m.y} M164 ${m.y} C 190 ${m.y}, 200 60, 216 60`}
          fill="none"
          stroke={i === 1 ? INDIGO : VIOLET}
          strokeOpacity={0.7}
          strokeDasharray="4 3"
          initial={false}
          animate={
            play
              ? { strokeDashoffset: [0, -28], strokeWidth: WEIGHTS.map((w) => w[i] * 0.7).concat(WEIGHTS[0][i] * 0.7) }
              : { strokeDashoffset: 0, strokeWidth: 1.2 }
          }
          transition={
            play
              ? {
                  strokeDashoffset: { duration: 1.6, repeat: Infinity, ease: "linear" },
                  strokeWidth: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
                }
              : { duration: 0 }
          }
        />
        {/* Feature map node with a qubit wave */}
        <rect x={8} y={m.y - 9} width={72} height={18} rx={4} fill="rgba(167,139,250,0.12)" stroke={VIOLET} strokeWidth={0.6} />
        <path
          d={`M13 ${m.y} q 3 -5 6 0 t 6 0 t 6 0`}
          fill="none"
          stroke={LAVENDER}
          strokeWidth={0.8}
          opacity={0.8}
        />
        <text x={35} y={m.y + 2.3} fontSize="6.5" fill="#e4e4e7">{m.label}</text>
        {/* 3x3 Gram matrix glyph */}
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}${c}`}
              x={140 + c * 7.5}
              y={m.y - 10.5 + r * 7.5}
              width={6.5}
              height={6.5}
              rx={1}
              fill={i === 1 ? INDIGO : VIOLET}
              opacity={r === c ? 0.9 : 0.18 + (((r * 3 + c + i * 2) * 37) % 50) / 100}
            />
          )),
        )}
      </g>
    ))}

    {/* Meta-learner, trained on out-of-fold predictions */}
    <rect x={216} y={44} width={76} height={32} rx={6} fill="rgba(52,211,153,0.1)" stroke={EMERALD} strokeWidth={0.8} />
    <text x={254} y={57} textAnchor="middle" fontSize="7" fill="#e4e4e7">meta-learner</text>
    <text x={254} y={67} textAnchor="middle" fontSize="5.5" fill={MUTED}>out-of-fold LR</text>
    <Label x={254} y={96}>QSVM + QKNN</Label>
    <Label x={254} y={105}>per kernel</Label>
  </g>
);

/* -------------------------------------------------------------------------- */
/* AquaSelect: learn when to abstain                                           */
/* -------------------------------------------------------------------------- */

// 10 predictions stream through the selection head; 2 in 10 are set aside,
// which is what 80% coverage means. Which ones is illustrative.
const FISH = Array.from({ length: 10 }, (_, i) => ({ i, abstain: i === 3 || i === 7 }));
const GATE_X = 88;

const Fish = ({ color }: { color: string }) => (
  <g>
    <ellipse cx={0} cy={0} rx={4.2} ry={2.4} fill={color} />
    <path d="M-3.6 0 l-3 -2.4 v4.8 z" fill={color} />
    <circle cx={2} cy={-0.5} r={0.5} fill="#0a0a0a" />
  </g>
);

const AquaSvg = ({ play }: Props) => {
  // Bars on an axis that starts at 80%, labelled as such
  const x0 = 170;
  const w = 118;
  const toX = (pct: number) => x0 + ((pct - 80) / 20) * w;

  return (
    <g>
      <Label x={75} y={10} fill={LAVENDER}>SELECTION HEAD</Label>
      <Label x={229} y={10} fill={LAVENDER}>ACCURACY</Label>

      {/* Stream and gate */}
      <line x1={6} y1={52} x2={150} y2={52} stroke={FAINT} strokeDasharray="2 3" />
      <line x1={GATE_X} y1={28} x2={GATE_X} y2={76} stroke={VIOLET} strokeWidth={1} strokeDasharray="3 2" />
      <rect x={GATE_X - 5} y={46} width={10} height={12} rx={2} fill="rgba(167,139,250,0.2)" stroke={VIOLET} strokeWidth={0.6} />
      {/* Abstain bin */}
      <rect x={GATE_X + 14} y={92} width={40} height={14} rx={3} fill="rgba(113,113,122,0.12)" stroke={MUTED} strokeWidth={0.6} strokeDasharray="2 2" />
      <Label x={GATE_X + 34} y={101.5}>ABSTAIN</Label>
      <Label x={146} y={46} anchor="end" fill={EMERALD}>PREDICT</Label>

      {play
        ? FISH.map((f) => (
            <motion.g
              key={f.i}
              initial={{ x: -8, y: 52, opacity: 0 }}
              animate={
                f.abstain
                  ? { x: [-8, GATE_X, GATE_X + 26, GATE_X + 34], y: [52, 52, 82, 99], opacity: [0, 1, 1, 0] }
                  : { x: [-8, GATE_X, 150], y: [52, 52, 52], opacity: [0, 1, 0] }
              }
              transition={{ duration: 2.4, delay: f.i * 0.45, repeat: Infinity, repeatDelay: 10 * 0.45 - 2.4 + 1.2, ease: "linear" }}
            >
              <Fish color={f.abstain ? MUTED : EMERALD} />
            </motion.g>
          ))
        : [20, 50, 118, 136].map((x, k) => (
            <g key={k} transform={`translate(${x} 52)`}>
              <Fish color={EMERALD} />
            </g>
          ))}

      {/* Accuracy bars: every prediction vs. 80% coverage */}
      <line x1={x0} y1={30} x2={x0} y2={90} stroke="rgba(255,255,255,0.2)" />
      <Label x={x0} y={100} anchor="middle">80%</Label>
      <Label x={x0 + w} y={100} anchor="middle">100%</Label>
      <line x1={x0 + w} y1={30} x2={x0 + w} y2={90} stroke={FAINT} strokeDasharray="2 2" />

      <text x={x0 + 2} y={36} fontSize="6" fill={MUTED}>all predictions</text>
      <motion.rect
        x={x0}
        y={39}
        height={9}
        rx={2}
        fill="rgba(167,139,250,0.55)"
        initial={false}
        animate={{ width: play ? [0, toX(87.3) - x0, toX(87.3) - x0] : toX(87.3) - x0 }}
        transition={play ? { duration: 4, times: [0, 0.3, 1], repeat: Infinity, repeatDelay: 0.5 } : { duration: 0 }}
      />
      {/* Each value lands with its bar rather than floating ahead of it */}
      <motion.text
        x={toX(87.3) + 3}
        y={46}
        fontSize="7"
        fill="#e4e4e7"
        initial={false}
        animate={{ opacity: play ? [0, 0, 1, 1] : 1 }}
        transition={play ? { duration: 4, times: [0, 0.28, 0.33, 1], repeat: Infinity, repeatDelay: 0.5 } : { duration: 0 }}
      >
        87.3%
      </motion.text>

      <text x={x0 + 2} y={64} fontSize="6" fill={MUTED}>at 80% coverage</text>
      <motion.rect
        x={x0}
        y={67}
        height={9}
        rx={2}
        fill={EMERALD}
        fillOpacity={0.75}
        initial={false}
        animate={{ width: play ? [0, 0, toX(94.8) - x0, toX(94.8) - x0] : toX(94.8) - x0 }}
        transition={play ? { duration: 4, times: [0, 0.3, 0.6, 1], repeat: Infinity, repeatDelay: 0.5 } : { duration: 0 }}
      />
      <motion.text
        x={toX(94.8) + 3}
        y={74}
        fontSize="7"
        fill={EMERALD}
        initial={false}
        animate={{ opacity: play ? [0, 0, 1, 1] : 1 }}
        transition={play ? { duration: 4, times: [0, 0.58, 0.63, 1], repeat: Infinity, repeatDelay: 0.5 } : { duration: 0 }}
      >
        94.8%
      </motion.text>
    </g>
  );
};

/* -------------------------------------------------------------------------- */
/* Patent: multi-crop disease detection                                        */
/* -------------------------------------------------------------------------- */

const CROPS = ["coconut", "rubber", "black gram", "turmeric", "eggplant"];

const PatentSvg = ({ play }: Props) => {
  const spots = [
    { x: 58, y: 44, r: 4.5, t: 0.35 },
    { x: 84, y: 66, r: 3.5, t: 0.6 },
    { x: 66, y: 82, r: 3, t: 0.8 },
  ];
  return (
    <g>
      <Label x={75} y={10} fill={LAVENDER}>LEAF SCAN</Label>
      <Label x={225} y={10} fill={LAVENDER}>FIVE CROPS</Label>

      {/* Leaf */}
      <path
        d="M30 100 C 30 55, 70 22, 124 20 C 122 70, 90 102, 30 100 Z"
        fill="rgba(52,211,153,0.16)"
        stroke={EMERALD}
        strokeWidth={0.9}
      />
      <path d="M30 100 C 60 76, 90 50, 124 20" fill="none" stroke={EMERALD} strokeWidth={0.7} opacity={0.6} />
      {[0.3, 0.5, 0.7].map((t) => {
        const x = 30 + (124 - 30) * t;
        const y = 100 - (100 - 20) * t;
        return (
          <path key={t} d={`M${x} ${y} q 10 4 18 2 M${x} ${y} q -4 -10 -2 -18`} fill="none" stroke={EMERALD} strokeWidth={0.5} opacity={0.45} />
        );
      })}

      {/* Disease spots, boxed as the scan passes */}
      {spots.map((s, k) => (
        <g key={k}>
          <circle cx={s.x} cy={s.y} r={s.r} fill="rgba(180,83,9,0.7)" />
          <motion.rect
            x={s.x - s.r - 3}
            y={s.y - s.r - 3}
            width={(s.r + 3) * 2}
            height={(s.r + 3) * 2}
            rx={1}
            fill="none"
            stroke={AMBER}
            strokeWidth={0.8}
            initial={false}
            animate={{ opacity: play ? [0, 0, 1, 1, 0] : 1 }}
            transition={play ? { duration: 3, times: [0, s.t, s.t + 0.05, 0.92, 1], repeat: Infinity, repeatDelay: 0.3 } : { duration: 0 }}
          />
        </g>
      ))}
      {play && (
        <motion.rect
          y={16}
          width={1.4}
          height={90}
          fill={LAVENDER}
          initial={{ x: 26, opacity: 0 }}
          animate={{ x: [26, 128], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 0.3, ease: "linear" }}
        />
      )}

      {/* Crops the system supports */}
      {CROPS.map((c, k) => (
        <motion.g
          key={c}
          initial={false}
          animate={{ opacity: play ? [0.35, 1, 0.35] : 1 }}
          transition={play ? { duration: 2.5, delay: k * 0.5, repeat: Infinity, repeatDelay: 0 } : { duration: 0 }}
        >
          <rect x={172} y={22 + k * 17} width={106} height={13} rx={6.5} fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.5)" strokeWidth={0.6} />
          <circle cx={181} cy={28.5 + k * 17} r={2} fill={AMBER} />
          <text x={188} y={31 + k * 17} fontSize="7" fill="#e4e4e7">{c}</text>
        </motion.g>
      ))}
    </g>
  );
};

/* -------------------------------------------------------------------------- */
/* HemoCline: the gap that opens                                               */
/* -------------------------------------------------------------------------- */

// In a cumulative-link model an interior stage's probability can never pass
// P_max(g) = 2σ(g/2) − 1, where g is the gap between its two thresholds. The
// paper reports the optimizer widening the narrow gaps from 1.0 to 2.0 on its
// own; the two ceilings drawn are that formula at those gaps, 2σ(0.5) − 1 =
// 0.245 and 2σ(1) − 1 = 0.462. The hills are the model's actual interior
// probabilities along the latent score, σ(θ_right − η) − σ(θ_left − η). At a
// gap of 1.0 a cell sitting mid-stage is still more likely a neighbour, so the
// rare ones are swallowed; at 2.0 the interior stage wins. How many dots fall
// where is illustrative (the real imbalance is far steeper, 167:1).
const HEMO_T = 10;
const HEMO_WIDEN = [0, 0.35, 0.55, 0.92, 1];
const HEMO_BASE = 96;
const HEMO_UNIT = 40; // px per latent unit
const HEMO_TALL = 100; // px per unit of probability
const HEMO_THETA = [
  { at: [110, 70], label: "θ1" },
  { at: [150, 150], label: "θ2" },
  { at: [190, 230], label: "θ3" },
];
const sigma = (z: number) => 1 / (1 + Math.exp(-z));
const ceilingY = (gap: number) => HEMO_BASE - HEMO_TALL * (2 * sigma(gap / 2) - 1);

const hill = (left: number, right: number) => {
  const pts: string[] = [];
  for (let x = 8; x <= 292; x += 4) {
    const p = sigma((right - x) / HEMO_UNIT) - sigma((left - x) / HEMO_UNIT);
    pts.push(`L${x} ${(HEMO_BASE - HEMO_TALL * p).toFixed(2)}`);
  }
  return `M8 ${HEMO_BASE} ${pts.join(" ")} L292 ${HEMO_BASE} Z`;
};
// Metamyelocyte between θ1 and θ2, band between θ2 and θ3; bunched, then widened
const HILLS = [
  [hill(110, 150), hill(70, 150)],
  [hill(150, 190), hill(150, 230)],
];

type Dot = { t0: number; x: number; y: number; color: string; to?: { x: number; color: string } };
// The segmented pile, bottom row first
const PILE = [
  ...Array.from({ length: 7 }, (_, i) => ({ x: 253 + i * 5.5, y: 93.5 })),
  ...Array.from({ length: 5 }, (_, i) => ({ x: 255.75 + i * 5.5, y: 88.5 })),
];
const SEG_TIMES = [0.02, 0.06, 0.1, 0.17, 0.21, 0.28, 0.57, 0.61, 0.68, 0.72, 0.79, 0.86];
const HEMO_DOTS: Dot[] = [
  ...SEG_TIMES.map((t0, i) => ({ t0, ...PILE[i], color: AMBER })),
  // Gap 1.0: heading for their own stage, taken by the neighbour
  { t0: 0.13, x: 130, y: 94, color: EMERALD, to: { x: 94, color: LAVENDER } },
  { t0: 0.24, x: 170, y: 94, color: EMERALD, to: { x: 206, color: AMBER } },
  // Gap 2.0: they land
  { t0: 0.64, x: 110, y: 93.5, color: EMERALD },
  { t0: 0.75, x: 190, y: 93.5, color: EMERALD },
];

const HemoDot = ({ d, play }: { d: Dot; play: boolean }) => {
  const fall = 0.06;
  const top = 42;
  if (!play) {
    // The finished state: the pile, and the two that landed
    if (d.to) return null;
    return <circle cx={d.x} cy={d.y} r={d.color === EMERALD ? 2.6 : 2.2} fill={d.color} />;
  }
  const loop = { duration: HEMO_T, repeat: Infinity, ease: "linear" as const };
  if (d.to) {
    const times = [0, d.t0, d.t0 + 0.01, d.t0 + fall, d.t0 + fall + 0.04, d.t0 + fall + 0.09, 1];
    return (
      <motion.circle
        r={2.4}
        initial={{ cx: d.x, cy: top, opacity: 0, fill: d.color }}
        animate={{
          cx: [d.x, d.x, d.x, d.x, d.to.x, d.to.x, d.to.x],
          cy: [top, top, top + (d.y - top) / 6, d.y, d.y, d.y, d.y],
          opacity: [0, 0, 1, 1, 1, 0, 0],
          fill: [d.color, d.color, d.color, d.color, d.to.color, d.to.color, d.to.color],
        }}
        transition={{ ...loop, times }}
      />
    );
  }
  const times = [0, d.t0, d.t0 + 0.01, d.t0 + fall, 0.93, 0.97, 1];
  return (
    <motion.circle
      cx={d.x}
      r={d.color === EMERALD ? 2.6 : 2.2}
      fill={d.color}
      initial={{ cy: top, opacity: 0 }}
      animate={{
        cy: [top, top, top + (d.y - top) / 6, d.y, d.y, d.y, d.y],
        opacity: [0, 0, 1, 1, 1, 0, 0],
      }}
      transition={{ ...loop, times }}
    />
  );
};

// The nucleus as it really changes along the chain
const arc = (r: number, from: number, to: number) => {
  const p = (a: number) => `${(r * Math.cos((a * Math.PI) / 180)).toFixed(2)} ${(r * Math.sin((a * Math.PI) / 180)).toFixed(2)}`;
  return `M${p(from)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${p(to)}`;
};
const NUCLEI = [
  { name: "MYELOCYTE", x: 40, draw: <circle cx={-0.8} cy={0.4} r={4.4} fill={VIOLET} /> },
  { name: "METAMYELOCYTE", x: 110, draw: <path d={arc(2.6, 5, 175)} stroke={VIOLET} strokeWidth={4.4} strokeLinecap="round" fill="none" /> },
  { name: "BAND", x: 190, draw: <path d={arc(4, -40, 220)} stroke={VIOLET} strokeWidth={2.3} strokeLinecap="round" fill="none" /> },
  {
    name: "SEGMENTED",
    x: 260,
    draw: (
      <g fill={VIOLET} stroke={VIOLET}>
        <path d="M-3.6 -1.4 L0 2.2 L3.6 -1.4" strokeWidth={0.7} fill="none" />
        <circle cx={-3.6} cy={-1.4} r={2.3} />
        <circle cx={0} cy={2.2} r={2.3} />
        <circle cx={3.6} cy={-1.4} r={2.3} />
      </g>
    ),
  },
];

const HemoSvg = ({ play }: Props) => {
  const widen = (from: number, to: number) =>
    play
      ? { animate: [from, from, to, to, from], transition: { duration: HEMO_T, times: HEMO_WIDEN, repeat: Infinity, ease: "easeInOut" as const } }
      : { animate: to, transition: { duration: 0 } };
  const cell = widen(0.35, 1);
  const ceilY = widen(ceilingY(1), ceilingY(2));
  const ceilX = widen(170, 190);

  return (
    <g>
      {/* The maturation chain */}
      {NUCLEI.map((n, i) => {
        const interior = i === 1 || i === 2;
        return (
          <motion.g
            key={n.name}
            initial={false}
            animate={{ opacity: interior ? cell.animate : 1 }}
            transition={interior ? cell.transition : { duration: 0 }}
          >
            <g transform={`translate(${n.x} 14)`}>
              <circle r={9} fill="rgba(196,181,253,0.07)" stroke={LAVENDER} strokeOpacity={0.55} strokeWidth={0.6} />
              {n.draw}
            </g>
            <text x={n.x} y={31} textAnchor="middle" fontSize="5.6" letterSpacing="0.3" fill={interior ? EMERALD : MUTED}>
              {n.name}
            </text>
          </motion.g>
        );
      })}
      {[75, 150, 225].map((x) => (
        <path key={x} d={`M${x - 2} 11.5 L${x + 1} 14 L${x - 2} 16.5`} stroke={MUTED} strokeWidth={0.7} fill="none" />
      ))}

      {/* The interior stages' probability, capped by the gap. Its tails run
          past the ends of the axis, so they fade out there. */}
      <defs>
        <linearGradient id="hemo-fade" x1="8" x2="292" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.16" stopColor="#fff" stopOpacity={1} />
          <stop offset="0.84" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id="hemo-ends" maskUnits="userSpaceOnUse" x={0} y={0} width={300} height={120}>
          <rect x={8} y={36} width={284} height={HEMO_BASE - 36} fill="url(#hemo-fade)" />
        </mask>
      </defs>
      <g mask="url(#hemo-ends)">
      {HILLS.map(([from, to], i) => (
        <motion.path
          key={i}
          fill="rgba(167,139,250,0.16)"
          stroke={VIOLET}
          strokeWidth={0.8}
          initial={false}
          animate={{ d: play ? [from, from, to, to, from] : to }}
          transition={cell.transition}
        />
      ))}
      </g>
      <motion.line
        x1={36}
        stroke={LAVENDER}
        strokeOpacity={0.6}
        strokeWidth={0.5}
        strokeDasharray="1.5 1.5"
        initial={false}
        animate={{ y1: ceilY.animate, y2: ceilY.animate, x2: ceilX.animate }}
        transition={ceilY.transition}
      />
      <motion.text
        x={34}
        textAnchor="end"
        fontSize="5"
        letterSpacing="0.3"
        fill={LAVENDER}
        initial={false}
        animate={{ y: typeof ceilY.animate === "number" ? ceilY.animate + 1.8 : ceilY.animate.map((y) => y + 1.8) }}
        transition={ceilY.transition}
      >
        CEILING
      </motion.text>

      {/* The latent score and its thresholds */}
      <line x1={8} y1={HEMO_BASE} x2={292} y2={HEMO_BASE} stroke="rgba(255,255,255,0.22)" />
      <text x={292} y={105} textAnchor="end" fontSize="5.6" fill={MUTED}>score →</text>
      {HEMO_THETA.map((t) => {
        const move = widen(t.at[0], t.at[1]);
        return (
          <motion.g key={t.label} initial={false} animate={{ x: move.animate }} transition={move.transition}>
            <line x1={0} y1={44} x2={0} y2={HEMO_BASE + 2} stroke={LAVENDER} strokeOpacity={0.55} strokeWidth={0.6} strokeDasharray="2 2" />
            <text x={0} y={105} textAnchor="middle" fontSize="6" fill={LAVENDER}>{t.label}</text>
          </motion.g>
        );
      })}

      {HEMO_DOTS.map((d, i) => (
        <HemoDot key={i} d={d} play={play} />
      ))}

      <text x={8} y={116} fontSize="6.2" letterSpacing="0.3" fill="#e4e4e7">
        gap 1.0 → 2.0 · ceiling 0.24 → 0.46
      </text>
    </g>
  );
};

const FIGURES: Record<VisualAbstractKind, { Svg: (p: Props) => React.ReactElement; caption: string }> = {
  verix: {
    Svg: VerixSvg,
    // The paper reports both: 25/28 at a fixed threshold, 27/28 calibrated per dataset
    caption: "caught 25/28, or 27/28 calibrated · no false alarms",
  },
  quantum: {
    Svg: QuantumSvg,
    caption: "Parkinson's specificity 0.585 → 0.813 · recall kept above 0.95",
  },
  aquaselect: {
    Svg: AquaSvg,
    caption: "149 FPS · 2.8× faster than Deep Ensembles",
  },
  patent: {
    Svg: PatentSvg,
    caption: "99.3% accuracy · under 2.5 s · no specialised hardware",
  },
  hemocline: {
    Svg: HemoSvg,
    caption: "532K params · 93.36% accuracy at 167:1 imbalance",
  },
};
