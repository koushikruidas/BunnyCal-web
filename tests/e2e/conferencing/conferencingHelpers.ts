import { expect, type Locator } from "@playwright/test";

export async function expectOptionState(card: Locator, enabled: boolean) {
  await expect(card).toBeVisible();
  if (enabled) {
    await expect(card).toBeEnabled();
  } else {
    await expect(card).toBeDisabled();
  }
}

export function conferencingCard(page: { locator: (selector: string) => Locator }, name: string) {
  return page.locator(".onb-radio-card").filter({ hasText: new RegExp(name, "i") }).first();
}
