// WCAG contrast ratio of two computed CSS colours, e.g. "rgb(27, 25, 22)".
export function contrast(a: string, b: string): number {
  const luminance = (colour: string): number => {
    const [red, green, blue] = colour
      .match(/\d+/g)!
      .slice(0, 3)
      .map((value) => {
        const s = Number(value) / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
