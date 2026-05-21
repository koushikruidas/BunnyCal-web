# Structural Surface Materialization 6
## Booking Management

### Concept A: State-Aware Commitment Stream
### 1. Structural hierarchy diagram
```text
[Top: Commitments overview + urgent actions]
[Primary: Upcoming / Changed / Past-actionable booking groups]
[Secondary: Booking detail panels]
[Context: Trust/recovery notes per booking]
[Hidden: Lifecycle diagnostics]
```
### 2. Primary/secondary/contextual zones
- Primary: commitment groups and actions.
- Secondary: participant and event context.
- Contextual: booking-level trust signals.
### 3. Progressive disclosure map
- Booking row -> detail -> issue reason -> deep diagnostics.
### 4. Expansion/collapse strategy
- One expanded booking per group.
### 5. Responsive/mobile collapse behavior
- Group tabs become segmented control; card list with one open detail at a time.
### 6. Trust visibility placement
- Inline confidence chip per booking.
### 7. Escalation placement
- Escalate only for irreversible participant-impacting actions.
### 8. Interaction zoning
- Browse/filter zone, action zone, recovery zone.
### 9. Density-risk analysis
- Risk: status proliferation and scanning fatigue.
- Control: cap visible states and hide low-signal metadata.
### 10. Orchestration leakage analysis
- Risk: lifecycle internals visible as list labels.
- Control: user-facing commitment language in primary views.

### Concept B: Agenda + Exceptions
### 1. Structural hierarchy diagram
```text
[Main: Time-ordered agenda of commitments]
[Adjacent/Below: Exceptions queue (conflicts, failures, pending recoveries)]
[Context: Exception links back to specific commitment]
```
### 2. Primary/secondary/contextual zones
- Primary: agenda.
- Secondary: exception queue.
- Contextual: trust notes tied to commitments.
### 3. Progressive disclosure map
- Exception summary -> affected booking -> remediation path -> technical details.
### 4. Expansion/collapse strategy
- Exception expansion opens linked booking context.
### 5. Responsive/mobile collapse behavior
- Agenda first, exceptions as collapsible “needs attention.”
### 6. Trust visibility placement
- Trust states attached to agenda items, not separate trust dashboard.
### 7. Escalation placement
- Escalation appears only when commitment outcome is uncertain.
### 8. Interaction zoning
- Timeline zone, intervention zone, detail zone.
### 9. Density-risk analysis
- Risk: dual-pane overload.
- Control: mobile single-flow with toggled exceptions.
### 10. Orchestration leakage analysis
- Risk: exception queue becomes operations board.
- Control: keep queue scoped to user commitments and actions.

### Validation Questions
- Is this commitment-coordination-first, not lifecycle-monitoring-first?
- Are actions close to affected bookings?
- Is trust contextual and lightweight?
- Is orchestration abstracted for non-technical users?
- Does the structure preserve calmness under change pressure?
