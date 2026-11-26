import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";
import { stackColours, type StackName } from "./data/stack";

// A calendar month as "YYYY-MM", read as the first of that month in UTC.
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM")
  .transform((value) => new Date(`${value}-01T00:00:00Z`));

const https = z.url({ protocol: /^https$/ });

const work = defineCollection({
  loader: file("src/data/work.json"),
  schema: ({ image }) =>
    z
      .object({
        company: z.string().trim().min(1),
        role: z.string().trim().min(1),
        // One line on what the role was about, shown between the role and the dates.
        summary: z.string().trim().min(1),
        url: https,
        // Hover colour for the company name, from the logo; keep it at 3:1 or more on paper.
        brand: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a #rrggbb colour"),
        start: month,
        end: month,
        logo: image(),
      })
      .refine(({ start, end }) => end >= start, "end is before start"),
});

// The id is the GitHub repo name, so Recent commits can match a repo to its card.
const projects = defineCollection({
  loader: file("src/data/projects.json"),
  schema: ({ image }) =>
    z.object({
      order: z.number().int().positive(),
      name: z.string().trim().min(1),
      description: z.string().trim().min(1),
      stack: z.array(z.enum(Object.keys(stackColours) as StackName[])).min(1),
      site: https.optional(),
      source: https,
      // Colour of the Cover's corner and the card's link underlines.
      corner: z.enum(["red", "blue", "yellow", "ink"]),
      cover: image(),
    }),
});

export const collections = { work, projects };
