import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

// A calendar month as "YYYY-MM", read as the first of that month in UTC.
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM")
  .transform((value) => new Date(`${value}-01T00:00:00Z`));

const work = defineCollection({
  loader: file("src/data/work.json"),
  schema: ({ image }) =>
    z
      .object({
        company: z.string().trim().min(1),
        role: z.string().trim().min(1),
        url: z.url({ protocol: /^https$/ }),
        // Hover colour for the company name, from the logo; keep it at 3:1 or more on paper.
        brand: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a #rrggbb colour"),
        start: month,
        end: month,
        logo: image(),
      })
      .refine(({ start, end }) => end >= start, "end is before start"),
});

export const collections = { work };
