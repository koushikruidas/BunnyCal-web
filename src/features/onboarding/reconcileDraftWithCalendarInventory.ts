import type { OnboardingDraft, SelectedCalendar } from "@/state/OnboardingContext";

interface InventoryRow {
  connectionId: string;
  provider: string;
  externalCalendarId: string;
  label: string;
}

export interface ReconciledCalendarDraftSlice {
  availabilityCalendars: SelectedCalendar[];
  projectionDestination: SelectedCalendar | null;
  changed: boolean;
}

function selectionKey(item: { connectionId: string; externalCalendarId: string }) {
  return `${item.connectionId}:${item.externalCalendarId}`;
}

function toSelectedCalendar(row: InventoryRow): SelectedCalendar {
  return {
    connectionId: row.connectionId,
    provider: row.provider,
    externalCalendarId: row.externalCalendarId,
    displayName: row.label,
  };
}

export function reconcileDraftWithCalendarInventory(
  draft: Pick<OnboardingDraft, "availabilityCalendars" | "projectionDestination">,
  availabilityRows: InventoryRow[],
  writableRows: InventoryRow[],
): ReconciledCalendarDraftSlice {
  const availabilityRowByKey = new Map(availabilityRows.map((row) => [selectionKey(row), row]));
  const writableRowByKey = new Map(writableRows.map((row) => [selectionKey(row), row]));

  const availabilityCalendars = draft.availabilityCalendars
    .map((selection) => {
      const match = availabilityRowByKey.get(selectionKey(selection));
      return match ? toSelectedCalendar(match) : null;
    })
    .filter((value): value is SelectedCalendar => Boolean(value));

  const projectionDestination = (() => {
    if (!draft.projectionDestination) return null;
    const match = writableRowByKey.get(selectionKey(draft.projectionDestination));
    return match ? toSelectedCalendar(match) : null;
  })();

  const availabilityChanged = JSON.stringify(availabilityCalendars) !== JSON.stringify(draft.availabilityCalendars);
  const projectionChanged = JSON.stringify(projectionDestination) !== JSON.stringify(draft.projectionDestination);

  return {
    availabilityCalendars,
    projectionDestination,
    changed: availabilityChanged || projectionChanged,
  };
}
