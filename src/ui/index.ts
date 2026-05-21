// Barrel re-exports for the ui/ layer.
//
// Layering rules (from docs/architecture/frontend-layering.md):
//   - ui/* MUST NOT import from domain/, services/, state/, features/, or pages/.
//   - components/, features/, and pages/ import from this barrel or from
//     ui/layout / ui/controls directly. Either is fine.

export * from "./layout";
export * from "./controls";
