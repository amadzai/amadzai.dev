import type { APIRoute } from "astro";
import mark from "../assets/mark.svg?raw";

// The favicon is the same drawing as the logo in the top bar and footer.
export const GET = (() =>
  new Response(mark, {
    headers: { "Content-Type": "image/svg+xml" },
  })) satisfies APIRoute;
