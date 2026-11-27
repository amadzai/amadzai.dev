// Draws the favicon fallbacks and the share image from the mark, into public/.
// Run against the built site, so the share image uses the real fonts and hero art:
//   pnpm build && pnpm preview --port 4322   (in one terminal)
//   pnpm brand-assets                        (in another)
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const SITE = "http://localhost:4322";
const mark = await readFile(
  new URL("../src/assets/mark.svg", import.meta.url),
  "utf8",
);
const out = (name) => new URL(`../public/${name}`, import.meta.url);

const browser = await chromium.launch();

// The mark alone at an exact pixel size.
async function markPng(size) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  });
  await page.setContent(
    `<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${mark}`,
  );
  const png = await page.screenshot();
  await page.close();
  return png;
}

// An ICO file that holds PNGs: a 6-byte header, a 16-byte entry per image, then the images.
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map(({ data }) => data)]);
}

const sizes = [16, 32, 48];

try {
  const icons = await Promise.all(
    sizes.map(async (size) => ({ size, data: await markPng(size) })),
  );
  await writeFile(out("favicon.ico"), ico(icons));
  await writeFile(out("apple-touch-icon.png"), await markPng(180));

  // The share image: the logo and name over the hero art, on the page's own paper and fonts.
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(SITE).catch(() => {
    throw new Error(
      `No site at ${SITE}. Start it first: pnpm build && pnpm preview --port 4322`,
    );
  });
  await page.evaluate((mark) => {
    const [first, last] = document.querySelectorAll("#hero-name .name");
    const intro = document.querySelector("#hero-name ~ p");
    const art = document.querySelector("section svg");
    if (!first || !last || !intro || !art) {
      throw new Error(
        "The hero's name, intro or art has moved; update the selectors.",
      );
    }
    // Inline styles, so the share image adds no classes to the site's stylesheet.
    document.body.innerHTML = `
      <div style="position:relative;height:630px;padding:64px 72px;box-sizing:border-box">
        <div style="width:104px;height:104px">${mark}</div>
        <h1 style="margin-top:28px;font-size:132px;line-height:.85;font-weight:800;letter-spacing:-.03em;text-transform:lowercase">
          <span style="display:block"></span><span style="display:block;color:var(--color-blue)"></span>
        </h1>
        <p style="margin-top:28px;max-width:24ch;font-size:30px;line-height:1.25"></p>
        <div style="position:absolute;right:64px;bottom:64px;width:600px">${art.outerHTML}</div>
      </div>`;
    const [a, b] = document.querySelectorAll("h1 span");
    a.textContent = first.textContent;
    b.textContent = last.textContent;
    document.querySelector("p").textContent = intro.textContent;
    document.body.style.padding = "0";
  }, mark);
  await page.evaluate(() => document.fonts.ready);
  await writeFile(out("og.png"), await page.screenshot());
} finally {
  await browser.close();
}
