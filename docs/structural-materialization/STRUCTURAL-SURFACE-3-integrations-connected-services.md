# Structural Surface Materialization 3
## Integrations / Connected Services

### Concept A: Capability Lanes
### 1. Structural hierarchy diagram
```text
[Top: Service readiness summary]
[Primary: Capability lanes (Calendar / Conferencing / Messaging / Payments)]
[Secondary: Connected service rows per lane]
[Context: Lane-level and row-level trust notes]
[Hidden: Auth/technical diagnostics]
```
### 2. Primary/secondary/contextual zones
- Primary: capability lanes and readiness.
- Secondary: service details/actions.
- Contextual: degraded impact indicators.
### 3. Progressive disclosure map
- Capability lane -> service detail -> recovery detail -> technical diagnostics.
### 4. Expansion/collapse strategy
- One expanded service per lane.
### 5. Responsive/mobile collapse behavior
- Lanes become stacked accordions.
### 6. Trust visibility placement
- Lane trust summary + per-service state chip.
### 7. Escalation placement
- Inline reconnect prompts; modal only for destructive disconnects.
### 8. Interaction zoning
- Connect/manage zone, readiness zone, recovery zone.
### 9. Density-risk analysis
- Risk: provider-directory sprawl.
- Control: capability-lane limits and “view all services” collapse.
### 10. Orchestration leakage analysis
- Risk: token/auth lifecycle shown as front-stage content.
- Control: technical context remains hidden tier.

### Concept B: Readiness Board (Non-Telemetry)
### 1. Structural hierarchy diagram
```text
[Header: “Can I schedule reliably?”]
[Main: Ready / Attention / Action-needed groups]
[Sub: Service cards with clear next action]
[Hidden: Advanced diagnostics drawer]
```
### 2. Primary/secondary/contextual zones
- Primary: readiness groups.
- Secondary: service metadata.
- Contextual: impact statements.
### 3. Progressive disclosure map
- Group -> service card -> details -> technical root cause.
### 4. Expansion/collapse strategy
- Expand only action-needed cards by default.
### 5. Responsive/mobile collapse behavior
- Default only ready-count + action-needed cards.
### 6. Trust visibility placement
- Trust states embedded into each readiness group.
### 7. Escalation placement
- High-impact failures get sticky inline action panel.
### 8. Interaction zoning
- State filter zone, service action zone, detail zone.
### 9. Density-risk analysis
- Risk: turning into KPI board.
- Control: no metric tiles without direct action relevance.
### 10. Orchestration leakage analysis
- Risk: provider-specific error taxonomy exposed in list view.
- Control: list view only uses capability impact language.

### Validation Questions
- Is this capability-first and not provider-directory-first?
- Are trust and remediation contextual?
- Are diagnostics progressive and non-dominant?
- Does this maintain calm product identity?
- Would non-technical users know next actions quickly?
