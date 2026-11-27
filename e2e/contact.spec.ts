import { expect, test, type Page } from "@playwright/test";

const contact = (page: Page) =>
  page
    .getByRole("navigation", { name: "Contact" })
    .getByRole("button", { name: "Contact" });
const dialog = (page: Page) => page.getByRole("dialog", { name: "let's talk" });

test("Contact opens a dialog by keyboard, Escape closes it, and focus returns to Contact", async ({
  page,
}) => {
  await page.goto("/");
  await contact(page).focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(contact(page)).toBeFocused();
});

test.describe("with clipboard access", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("Copy email puts the address on the clipboard and says Copied", async ({
    page,
  }) => {
    await page.goto("/");
    await contact(page).click();
    const copy = dialog(page).getByRole("button", { name: /Copy email/ });
    await copy.click();

    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "amadzainurin@gmail.com",
    );
    await expect(copy).toContainText("Copied");
    await expect(dialog(page).getByRole("status")).toHaveText(
      "Email copied: amadzainurin@gmail.com",
    );
  });
});

test("still copies when the browser refuses the Clipboard API", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("denied"));
  });
  // Catch what the older copy route copies: the text in the focused textarea it selects.
  await page.evaluate(() => {
    document.addEventListener("copy", () => {
      (window as unknown as { copied: string }).copied = (
        document.activeElement as HTMLTextAreaElement
      ).value;
    });
  });
  await contact(page).click();
  const copy = dialog(page).getByRole("button", { name: /Copy email/ });
  await copy.click();

  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe("amadzainurin@gmail.com");
  await expect(copy).toContainText("Copied");
  // The older route copies through a hidden textarea; keyboard focus must come back to the button.
  await expect(copy).toBeFocused();
});

test("Book a call opens the 30-minute cal.com event in a new tab", async ({
  page,
}) => {
  await page.goto("/");
  await contact(page).click();
  const book = dialog(page).getByRole("link", { name: /Book a call/ });
  await expect(book).toHaveAttribute(
    "href",
    "https://cal.com/amadzai/30min?overlayCalendar=true",
  );
  await expect(book).toHaveAttribute("target", "_blank");
});

test("the close button and a click on the backdrop each close the dialog", async ({
  page,
}) => {
  await page.goto("/");
  await contact(page).click();
  await dialog(page).getByRole("button", { name: "Close" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(contact(page)).toBeFocused();

  await contact(page).click();
  await expect(dialog(page)).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog(page)).toBeHidden();
});

test("a click on the dialog's own padding leaves it open", async ({ page }) => {
  await page.goto("/");
  await contact(page).click();
  const box = (await dialog(page).boundingBox())!;
  await page.mouse.click(box.x + 8, box.y + box.height - 8);
  await expect(dialog(page)).toBeVisible();
});
