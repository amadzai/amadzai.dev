import {
  siNestjs,
  siNextdotjs,
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
  // The site's yellow rather than Python's blue, to match the Language breakdown. White text, like the other
  // pills, by Amad's choice: it reads at about 2.5:1, under the 4.5:1 the rest keep.
  Python: { ...pill(siPython), colour: "var(--color-yellow)" },
  TypeScript: pill(siTypescript),
  NestJS: pill(siNestjs),
  "Next.js": pill(siNextdotjs),
  Solidity: pill(siSolidity),
  Ruby: pill(siRuby),
  Rails: pill(siRubyonrails),
  React: pill(siReact, "ink"),
} as const;

export type StackName = keyof typeof stackColours;
