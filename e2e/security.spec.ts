import { expect, test } from "@playwright/test";

test("sets a Content Security Policy that the page's own scripts and files all pass", async ({
  page,
}) => {
  // Record every CSP violation from the first byte, before the page's own scripts run.
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.assign(window, { violations });
    document.addEventListener("securitypolicyviolation", (event) =>
      violations.push(`${event.violatedDirective} ${event.blockedURI}`),
    );
  });
  await page.goto("/");

  const policy = page.locator(
    'head meta[http-equiv="content-security-policy"]',
  );
  await expect(policy).toHaveAttribute("content", /default-src 'self'/);
  await expect(policy).toHaveAttribute("content", /script-src 'self' 'sha256-/);

  // Contact's dialog opens only if its script was allowed to run.
  await page
    .getByRole("navigation", { name: "Contact" })
    .getByRole("button", { name: "Contact" })
    .click();
  await expect(page.getByRole("dialog", { name: "let's talk" })).toBeVisible();

  expect(
    await page.evaluate(
      () => (window as unknown as { violations: string[] }).violations,
    ),
  ).toEqual([]);
});
