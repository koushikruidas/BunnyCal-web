import { useSearchParams } from "react-router-dom";
import { EventTypeSelectionPage, OnboardingEventPage } from "@/pages/OnboardingEventPage";
import { useOnboardingState } from "@/state/OnboardingContext";
import { isSupportedEventTypeKind, normalizeEventTypeKind, type SupportedEventTypeKind } from "@/features/event-types/eventTypeCatalog";

export function OnboardingEventEntryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setDraft } = useOnboardingState();
  const requestedKind = normalizeEventTypeKind(searchParams.get("kind"));

  if (isSupportedEventTypeKind(requestedKind)) {
    return <OnboardingEventPage />;
  }

  return (
    <EventTypeSelectionPage
      onChoose={(kind: SupportedEventTypeKind) => {
        setDraft((prev) => ({
          ...prev,
          eventKind: kind,
          capacity: kind === "GROUP" ? Math.max(prev.capacity, 2) : 1,
          currentStep: 0,
        }));
        const next = new URLSearchParams(searchParams);
        next.set("kind", kind);
        next.set("step", "1");
        next.delete("fresh");
        setSearchParams(next, { replace: true });
      }}
    />
  );
}

