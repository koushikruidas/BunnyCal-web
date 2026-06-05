import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { EventWizardPage } from "../pages/EventWizardPage";
import { IntegrationsPage } from "../pages/IntegrationsPage";
import { BookingPage } from "../pages/BookingPage";
import { ConfirmationPage } from "../pages/ConfirmationPage";
import { assertAuthStateReady } from "../setup/shared-setup";
import { PERSONAS, type PersonaName } from "./personas";

interface PageObjects {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  eventWizardPage: EventWizardPage;
  integrationsPage: IntegrationsPage;
  bookingPage: BookingPage;
  confirmationPage: ConfirmationPage;
}

interface WorkerOptions {
  /** Persona whose auth state this worker loaded. Set to run a preflight check. */
  persona: PersonaName | null;
}

export const test = base.extend<PageObjects, WorkerOptions>({
  // Worker-scoped persona for preflight checks
  persona: [null, { scope: "worker", option: true }],

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  eventWizardPage: async ({ page }, use) => {
    await use(new EventWizardPage(page));
  },
  integrationsPage: async ({ page }, use) => {
    await use(new IntegrationsPage(page));
  },
  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },
  confirmationPage: async ({ page }, use) => {
    await use(new ConfirmationPage(page));
  },
});

export { expect } from "@playwright/test";
export { PERSONAS, assertAuthStateReady };
export type { PersonaName };
