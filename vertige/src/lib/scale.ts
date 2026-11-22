/**
 * L'échelle VERTIGE : logarithmique, de 10⁻⁵ € (grain de riz) à 10¹⁴ € (PIB mondial).
 * Toute position verticale (altimètre, ascension) se calcule en log10.
 */
export const LOG_MIN = -5;
export const LOG_MAX = 14;
export const DECADES = LOG_MAX - LOG_MIN; // 19 ordres de grandeur

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** log10 sûr : les prix sont toujours > 0 (validé à l'import). */
export const toLog = (priceEur: number) => Math.log10(priceEur);

/** Position 0..1 d'un log-prix sur l'échelle complète. */
export const altitudeOf = (log: number) => clamp((log - LOG_MIN) / DECADES, 0, 1);

/** Inverse de altitudeOf. */
export const logAtAltitude = (alt: number) => LOG_MIN + clamp(alt, 0, 1) * DECADES;

/**
 * Interpolation logarithmique entre deux prix.
 * En linéaire, une animation vers 1 Md€ passerait 99 % du temps dans les milliards.
 */
export const logInterp = (fromEur: number, toEur: number, t: number) =>
  10 ** lerp(toLog(fromEur), toLog(toEur), t);

/** Puissances de 10 de l'échelle, pour les graduations. */
export const DECADE_TICKS = Array.from({ length: DECADES + 1 }, (_, i) => LOG_MIN + i);
