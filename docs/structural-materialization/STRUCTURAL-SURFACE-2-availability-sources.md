# Structural Surface Materialization 2
## Availability Sources

### Concept A: Role Clusters First
### 1. Structural hierarchy diagram
```text
[Header: Overall availability confidence]
[Primary: Role clusters (blocking / contextual / supporting)]
[Secondary: Source rows inside each role cluster]
[Context: Impact notes per degraded source]
[Hidden: Advanced source diagnostics]
```
### 2. Primary/secondary/contextual zones
- Primary: role clusters and impact.
- Secondary: source metadata.
- Contextual: degraded impact statements.
### 3. Progressive disclosure map
- Role summary -> source details -> advanced diagnostics.
### 4. Expansion/collapse strategy
- Expand one role cluster; nested source detail on demand.
### 5. Responsive/mobile collapse behavior
- Role cards stack vertically; source rows behind expandable sections.
### 6. Trust visibility placement
- Confidence at role header, issue chips at source row.
### 7. Escalation placement
- Role warning for medium risk, blocking prompt only when reliability invalidates booking confidence.
### 8. Interaction zoning
- Zone 1 role navigation, Zone 2 source actions, Zone 3 recovery details.
### 9. Density-risk analysis
- Risk: multi-source grid overload.
- Control: strict role-first grouping and collapsed metadata.
### 10. Orchestration leakage analysis
- Risk: provider internals shown as primary grouping.
- Control: never group by provider first.

### Concept B: Impact Ladder
### 1. Structural hierarchy diagram
```text
[Top: “What affects availability now” ladder]
[Middle: Source cards ordered by user impact]
[Lower: Optional technical context]
```
### 2. Primary/secondary/contextual zones
- Primary: impact ladder.
- Secondary: source controls.
- Contextual: trust/recovery nudges.
### 3. Progressive disclosure map
- Impact card -> why -> how to fix -> advanced trace.
### 4. Expansion/collapse strategy
- Impact card expansion reveals source-level sub-items.
### 5. Responsive/mobile collapse behavior
- Show only top-impact items first; “show more influences” for lower-priority sources.
### 6. Trust visibility placement
- Trust badges within each impact card, not as global wall.
### 7. Escalation placement
- Escalate only for high-impact booking uncertainty.
### 8. Interaction zoning
- Scan zone, action zone, optional detail zone.
### 9. Density-risk analysis
- Risk: too many medium-impact items flatten priority.
- Control: impact tier caps and progressive reveal.
### 10. Orchestration leakage analysis
- Risk: exposing sync mechanics in first-view copy.
- Control: default copy always states user-facing effect.

### Validation Questions
- Is this role-first rather than provider-first?
- Is availability confidence understandable without internals?
- Are advanced details hidden by default?
- Is calmness preserved under degraded states?
- Is it free/pro/enterprise continuous rather than fragmented?
