export const LOGO_LINES: readonly string[] = [
  " █▀█  █▄▀ █   █ █▄ █ █▄▀",
  "▐█▀█▌ █ █ █▄▄ █ █ ▀█ █ █",
];

export const LOGO_WIDTH = Math.max(...LOGO_LINES.map((l) => [...l].length));

// Silver/steel: padlock shackle (the arch on top)
export const SHACKLE_CELLS: ReadonlySet<string> = new Set([
  "0,1", "0,2", "0,3",
]);

// Gold: padlock body
export const BODY_CELLS: ReadonlySet<string> = new Set([
  "1,0", "1,1", "1,2", "1,3", "1,4",
]);

// Red: the K letter (top: █▄▀ = cols 6,7,8 | bottom: █ █ = cols 6 & 8)
export const KEY_CELLS: ReadonlySet<string> = new Set([
  "0,6", "0,7", "0,8",
  "1,6", "1,8",
]);

// Legacy alias so any other import still compiles
export const SPROUT_CELLS: ReadonlySet<string> = BODY_CELLS;
