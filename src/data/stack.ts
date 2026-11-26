import {
  siNestjs,
  siNextdotjs,
  siPostgresql,
  siPython,
  siReact,
  siRuby,
  siRubyonrails,
  siSolidity,
  siTypescript,
  type SimpleIcon,
} from "simple-icons";

// The brand icon and colour for a stack pill, with whichever text colour reads at 4.5:1 or more on it.
const pill = ({ hex, path }: SimpleIcon, text: "white" | "ink" = "white") => ({
  colour: `#${hex}`,
  icon: path,
  text,
});

// Stack pill colours and icons, from Simple Icons.
export const stackColours = {
  Python: pill(siPython),
  TypeScript: pill(siTypescript),
  NestJS: pill(siNestjs),
  "Next.js": pill(siNextdotjs),
  Solidity: pill(siSolidity),
  // Foundry has no Simple Icons mark or official brand colour, so it takes the page ink and a plain anvil.
  Foundry: {
    colour: "var(--color-ink)",
    icon: "M1 6h17c0 2-1.5 4-4 4.5V13l3 4v2H7v-2l3-4v-2.5C6 10 2 9 1 6zm18 0h4v3h-4z",
    text: "white",
  },
  Postgres: pill(siPostgresql),
  Ruby: pill(siRuby),
  Rails: pill(siRubyonrails),
  React: pill(siReact, "ink"),
} as const;

export type StackName = keyof typeof stackColours;
