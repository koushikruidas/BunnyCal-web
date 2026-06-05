import { test, assertAuthStateReady, PERSONAS } from "../../fixtures";
import { createUniqueEvent } from "../../helpers/appHelpers";
import { expectOptionState, conferencingCard } from "../conferencingHelpers";

test.describe("Conferencing rules - ms-work", () => {
  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.msWork, "ms-work");
  });

  test("shows the correct conferencing options for Microsoft work projection", async ({ page, eventWizardPage }) => {
    await eventWizardPage.goto({ resetSession: true });
    await eventWizardPage.fillEventName(createUniqueEvent("E2E Conferencing MS Work"));
    await eventWizardPage.advanceToConferencing(10_000, "microsoft");

    const expectedEnabled = ["Microsoft Teams", "Zoom", "Custom URL", "Phone call", "In person"];
    const expectedDisabled = ["Google Meet"];

    for (const label of expectedEnabled) {
      await expectOptionState(conferencingCard(page, label), true);
    }

    for (const label of expectedDisabled) {
      await expectOptionState(conferencingCard(page, label), false);
    }
  });
});
