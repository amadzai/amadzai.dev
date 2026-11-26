import { stackColours } from "./stack";

// Language breakdown colours: the site palette and its tints, so the bar sits with the page.
// A language not listed takes mute.
export const languageColours: Readonly<Record<string, string>> = {
  TypeScript: "var(--color-blue)",
  Python: "var(--color-yellow)",
  // The site red, a little redder.
  Ruby: "#a5372f",
  // Same grey as its stack pill.
  Solidity: stackColours.Solidity.colour,
  // Between the site red and yellow, so it reads red but stays apart from Ruby.
  Scala: "#c25a36",
  // Halfway between a palette colour and paper.
  JavaScript: "#dbbf80",
  Astro: "#ca9380",
  CSS: "#8d979e",
  HTML: "var(--color-shade)",
  // Ink a third of the way to paper.
  Dockerfile: "#a39c90",
  Shell: "var(--color-mute)",
};
