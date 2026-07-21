export const LOGO_LINES: readonly string[] = [
  "    ▄██▄            ",
  "    █  █            ",
  "   █▀██▀█           ",
  " █▄▀ █   █ █▄ █ █▄▀ ",
  " █ █ █▄▄ █ █ ▀█ █ █ ",
];

export const LOGO_WIDTH = Math.max(...LOGO_LINES.map((l) => [...l].length));

export const SPROUT_CELLS: ReadonlySet<string> = new Set([
  "0,4", "0,5", "0,6", "0,7",
  "1,4", "1,7",
  "2,3", "2,4", "2,5", "2,6", "2,7", "2,8",
]);
