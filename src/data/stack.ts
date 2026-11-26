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
  // Python, TypeScript and Ruby take the site's dusky palette rather than their brand colours, so they match
  // the Language breakdown. Python's white text is Amad's choice: it reads at about 2.5:1, under the 4.5:1 the rest keep.
  Python: { ...pill(siPython), colour: "var(--color-yellow)" },
  TypeScript: { ...pill(siTypescript), colour: "var(--color-blue)" },
  NestJS: pill(siNestjs),
  "Next.js": pill(siNextdotjs),
  Solidity: pill(siSolidity),
  // The site red, a little redder.
  Ruby: { ...pill(siRuby), colour: "#a5372f" },
  Rails: pill(siRubyonrails),
  // A dusky teal rather than React's pale cyan, so it can take white text like the others (about 4.6:1).
  React: { ...pill(siReact), colour: "#2f7f94" },
} as const;

export type StackName = keyof typeof stackColours;
