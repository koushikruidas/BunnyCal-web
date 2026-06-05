import { test, assertAuthStateReady, PERSONAS } from "../../fixtures";
import { createUniqueEvent } from "../../helpers/appHelpers";
import { expectOptionState, conferencingCard } from "../conferencingHelpers";

test.describe("Conferencing rules - ms-personal", () => {
  test.beforeAll(() => {
    assertAuthStateReady(PERSONAS.msPersonal, "ms-personal");
  });

  test("shows the correct conferencing options for Microsoft personal projection", async ({ page, eventWizardPage }) => {
    await eventWizardPage.goto({ resetSession: true });
    await eventWizardPage.fillEventName(createUniqueEvent("E2E Conferencing MS Personal"));
    await eventWizardPage.advanceToConferencing(10_000, "microsoft");

    const expectedEnabled = ["Zoom", "Custom URL", "Phone call", "In person"];
    const expectedDisabled = ["Google Meet", "Microsoft Teams"];

    for (const label of expectedEnabled) {
      await expectOptionState(conferencingCard(page, label), true);
    }

    for (const label of expectedDisabled) {
      await expectOptionState(conferencingCard(page, label), false);
    }
  });
});
