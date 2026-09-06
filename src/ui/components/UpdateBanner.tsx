import { Text } from "ink";

// A quiet one-liner above the wordmark when a newer release exists. Passive by
// design: it never steals focus or a key, it just points at `klink update`.
export function UpdateBanner({ latest }: { latest: string | null }) {
  if (!latest) return null;
  return <Text dimColor>{`↑ Klink v${latest} available · klink update`}</Text>;
}
