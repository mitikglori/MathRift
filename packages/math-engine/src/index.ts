export type Question = {
  prompt: string;
  type: "definite" | "derivative";
  answer: string;     // canonical exact form e.g. "2/3"
  numeric?: number;   // optional numeric value for tolerant checks
};

// Tiny deterministic PRNG
export function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function intIn(rng: () => number, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function genQuestion(seed: number, round: number): Question {
  const rng = mulberry32(seed ^ round);
  const kind = intIn(rng, 0, 2);      // 0 poly integral, 1 trig integral, 2 derivative
  if (kind === 0) return genPolyIntegral(seed, round);
  if (kind === 1) return genSinIntegral(seed, round);
  return genDerivative(seed, round);
}

function rationalize(x: number): string {
  const tol = 1e-9;
  for (let den = 1; den <= 64; den++) {
    const num = Math.round(x * den);
    if (Math.abs(num / den - x) < tol) return den === 1 ? `${num}` : `${num}/${den}`;
  }
  return x.toFixed(4);
}

// ∫_a^b (p x^n + q) dx with clean numbers
function genPolyIntegral(seed: number, round: number): Question {
  const rng = mulberry32(seed ^ (round * 17 + 3));
  const n = intIn(rng, 1, 4);
  const p = intIn(rng, 1, 5);
  const q = intIn(rng, -3, 3);
  const a = intIn(rng, 0, 3);
  const b = a + intIn(rng, 1, 3);
  const val = p * (Math.pow(b, n + 1) - Math.pow(a, n + 1)) / (n + 1) + q * (b - a);
  return {
    prompt: `Compute ∫_${a}^${b} (${p}x^${n}${q >= 0 ? "+" : ""}${q}) dx`,
    type: "definite",
    answer: rationalize(val),
    numeric: val
  };
}

// ∫_0^π sin(kx) dx → 2/k if k odd, 0 if even
function genSinIntegral(seed: number, round: number): Question {
  const rng = mulberry32(seed ^ (round * 37 + 9));
  const k = intIn(rng, 1, 6);
  const val = (1 - Math.cos(k * Math.PI)) / k;
  return {
    prompt: `Compute ∫_0^π sin(${k}x) dx`,
    type: "definite",
    answer: (k % 2 === 1) ? `2/${k}` : `0`,
    numeric: val
  };
}

// Derivatives: ax^n or sin(kx)
function genDerivative(seed: number, round: number): Question {
  const rng = mulberry32(seed ^ (round * 7 + 13));
  const choice = intIn(rng, 0, 1);
  if (choice === 0) {
    const a = intIn(rng, 1, 9), n = intIn(rng, 2, 6);
    return { prompt: `Differentiate: ${a}x^${n}`, type: "derivative", answer: `${a * n}x^${n - 1}` };
  }
  const k = intIn(rng, 1, 7);
  return { prompt: `Differentiate: sin(${k}x)`, type: "derivative", answer: `${k}cos(${k}x)` };
}

// Normalize user input for comparison
export function canonicalizeAnswer(s: string): string {
  return s.toLowerCase()
    .replace(/\s+/g, "")
    .replace(/π/g, "pi")
    .replace(/×/g, "*")
    .replace(/\(([^()]+)\)/g, "$1");
}

// Server-grade verdict
export function verifyAnswer(seed: number, round: number, user: string) {
  const q = genQuestion(seed, round);
  const canon = canonicalizeAnswer(q.answer);
  const userCanon = canonicalizeAnswer(user);
  let ok = userCanon === canon;
  if (!ok && q.numeric != null) {
    const num = Number(user);
    if (!Number.isNaN(num)) {
      const tol = 1e-3 * Math.max(1, Math.abs(q.numeric));
      ok = Math.abs(num - q.numeric) <= tol;
    }
  }
  return { ok, canonical: q.answer, prompt: q.prompt };
}
