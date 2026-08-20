export interface RevealStyle {
  opacity: number;
  translateY: number;
  interactive: boolean;
}

const LOOKAHEAD = 3;
const TRAIL = [0.5, 0.24, 0.1];

export function revealStyle(index: number, revealed: number): RevealStyle {
  const distance = index - revealed;

  if (distance < 0) {
    return { opacity: 1, translateY: 0, interactive: true };
  }

  if (distance < LOOKAHEAD) {
    return {
      opacity: TRAIL[distance] ?? 0,
      translateY: 2 + distance * 2,
      interactive: false,
    };
  }

  return { opacity: 0, translateY: 8, interactive: false };
}
