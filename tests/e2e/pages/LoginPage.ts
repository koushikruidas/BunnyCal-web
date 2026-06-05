import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;

  // Sign-in panel elements
  readonly heading: Locator;
  readonly primaryAuthButton: Locator;
  readonly authButtons: Locator;
  readonly providersError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1");
    this.primaryAuthButton = page.locator(".auth-btn.primary");
    this.authButtons = page.locator(".auth-btn");
    this.providersError = page.locator(".providers-error");
  }

  async goto() {
    await this.page.goto("/sign-in");
  }

  async waitForProviders() {
    // Poll until the primary button text changes away from the loading placeholder
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector<HTMLButtonElement>(".auth-btn.primary .label");
        return btn && !btn.textContent?.includes("Loading sign-in options");
      },
      { timeout: 10_000 },
    );
  }

  async clickPrimaryProvider() {
    await this.primaryAuthButton.click();
  }

  async clickProviderByName(displayName: string) {
    await this.page.locator(`.auth-btn:has-text("${displayName}")`).click();
  }

  /** Returns the provider display names visible on the page. */
  async visibleProviderNames(): Promise<string[]> {
    await this.waitForProviders();
    const buttons = await this.authButtons.all();
    return Promise.all(
      buttons.map((btn) => btn.locator(".label").innerText()),
    );
  }

  async isRedirectedAway(): Promise<boolean> {
    return !this.page.url().includes("/sign-in");
  }
}
