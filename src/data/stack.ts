// Stack pill colours: each stack's brand colour, with whichever text colour reads at 4.5:1 or more on it.
export const stackColours = {
  Python: { colour: "#3776ab", text: "white" },
  TypeScript: { colour: "#3178c6", text: "white" },
  NestJS: { colour: "#e0234e", text: "white" },
  "Next.js": { colour: "#000000", text: "white" },
  Solidity: { colour: "#363636", text: "white" },
  // Foundry has no official brand colour, so it takes the page ink.
  Foundry: { colour: "var(--color-ink)", text: "white" },
  Postgres: { colour: "#4169e1", text: "white" },
  Ruby: { colour: "#cc342d", text: "white" },
  Rails: { colour: "#d30001", text: "white" },
  React: { colour: "#61dafb", text: "ink" },
} as const;

export type StackName = keyof typeof stackColours;
