# Structural Surface Materialization 7
## Availability Diagnostics

### Concept A: Guided Recovery Flow
### 1. Structural hierarchy diagram
```text
[Top: Issue summary + impact scope]
[Primary: Recommended recovery steps (ordered)]
[Secondary: Cause categories with confidence]
[Context: Linked surfaces impacted]
[Hidden: Technical trace panel]
```
### 2. Primary/secondary/contextual zones
- Primary: actionable recovery steps.
- Secondary: cause explanation.
- Contextual: affected area links/trust state.
### 3. Progressive disclosure map
- Issue -> first fix -> alternate fixes -> technical traces.
### 4. Expansion/collapse strategy
- Expand one remediation step details at a time.
### 5. Responsive/mobile collapse behavior
- Sticky top with issue + first action; rest in step cards.
### 6. Trust visibility placement
- Recovery confidence shown next to each step.
### 7. Escalation placement
- Escalate only when scheduling reliability remains unsafe after guided steps.
### 8. Interaction zoning
- Diagnose zone, recover zone, validate outcome zone.
### 9. Density-risk analysis
- Risk: too many simultaneous issue branches.
- Control: single primary path with optional alternates.
### 10. Orchestration leakage analysis
- Risk: logs/traces appear before recovery actions.
- Control: recovery-first ordering mandatory.

### Concept B: Symptom-to-Resolution Matrix (Calm Version)
### 1. Structural hierarchy diagram
```text
[Primary: Symptom cards ordered by user impact]
[Secondary: Resolution snippets per symptom]
[Context: “Why this might happen” collapsed]
[Hidden: Deep technical context]
```
### 2. Primary/secondary/contextual zones
- Primary: symptom and resolution.
- Secondary: confidence and alternatives.
- Contextual: links to affected settings/sources.
### 3. Progressive disclosure map
- Symptom card -> expanded resolution steps -> technical context.
### 4. Expansion/collapse strategy
- Card-level expansion with clear back-to-summary path.
### 5. Responsive/mobile collapse behavior
- Top-impact symptom pinned, others in compact list.
### 6. Trust visibility placement
- Trust language in resolution outcome (“availability confidence restored / limited”).
### 7. Escalation placement
- Escalate to interrupt only for unresolved high-impact symptoms.
### 8. Interaction zoning
- Symptom scan zone, action zone, optional investigation zone.
### 9. Density-risk analysis
- Risk: matrix layout can mimic telemetry grid.
- Control: use cards and narrative steps, not dense tables.
### 10. Orchestration leakage analysis
- Risk: provider-specific errors dominate symptom labels.
- Control: symptom names remain user-facing.

### Validation Questions
- Is guided recovery clearly primary over telemetry?
- Does this reduce anxiety rather than increase it?
- Are trust and confidence messages contextual?
- Are deep diagnostics hidden unless requested?
- Would a non-technical host recover confidently?
