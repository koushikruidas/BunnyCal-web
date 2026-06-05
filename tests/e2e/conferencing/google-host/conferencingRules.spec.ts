import { test, assertAuthStateReady, PERSONAS } from "../../fixtures";
import { createUniqueEvent } from "../../helpers/appHelpers";
import { expectOptionState, conferencingCard } from "../conferencingHelpers";

test.describe("Conferencing rules - google-host", () => {
  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.googleHost, "google-host");
  });

  test("shows the correct conferencing options for Google projection", async ({ page, eventWizardPage }) => {
    await eventWizardPage.goto({ resetSession: true });
    await eventWizardPage.fillEventName(createUniqueEvent("E2E Conferencing Google"));
    await eventWizardPage.advanceToConferencing(10_000, "google");

    const expectedEnabled = ["Google Meet", "Zoom", "Custom URL", "Phone call", "In person"];
    const expectedDisabled = ["Microsoft Teams"];

    for (const label of expectedEnabled) {
      await expectOptionState(conferencingCard(page, label), true);
    }

    for (const label of expectedDisabled) {
      await expectOptionState(conferencingCard(page, label), false);
    }
  });
});
