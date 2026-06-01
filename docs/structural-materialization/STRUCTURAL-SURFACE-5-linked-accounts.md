# Structural Surface Materialization 5
## Linked Accounts

### Concept A: Identity Confidence Stack
### 1. Structural hierarchy diagram
```text
[Top: Identity health summary]
[Primary: Account identity cards (active usage context first)]
[Secondary: Account metadata + roles]
[Context: Risk/relink prompts on affected account]
[Hidden: Security/auth diagnostics]
```
### 2. Primary/secondary/contextual zones
- Primary: account identity and active usage.
- Secondary: account metadata/roles.
- Contextual: risk and remediation notices.
### 3. Progressive disclosure map
- Account card -> account details -> permissions detail -> technical diagnostics.
### 4. Expansion/collapse strategy
- Single account detail expansion.
### 5. Responsive/mobile collapse behavior
- Cards stack; only active account expanded by default.
### 6. Trust visibility placement
- Trust badge per account + concise top summary.
### 7. Escalation placement
- Escalate on unlink/reassign actions and unsafe account states.
### 8. Interaction zoning
- Identity scan zone, management zone, recovery zone.
### 9. Density-risk analysis
- Risk: permission-detail overload.
- Control: default hide permissions depth.
### 10. Orchestration leakage analysis
- Risk: token/session lifecycle becomes visible first-view content.
- Control: technical auth detail behind explicit expansion.

### Concept B: Usage Context Lanes
### 1. Structural hierarchy diagram
```text
[Header: “Who powers what”]
[Primary: Usage lanes (booking, availability, communications)]
[Secondary: Accounts within each lane]
[Context: Lane-level trust note if account issue affects lane]
```
### 2. Primary/secondary/contextual zones
- Primary: usage lanes.
- Secondary: accounts and actions.
- Contextual: lane impact messages.
### 3. Progressive disclosure map
- Lane -> account -> account diagnostics.
### 4. Expansion/collapse strategy
- Expand one lane and one account within lane.
### 5. Responsive/mobile collapse behavior
- Lanes collapse into accordion; active issues pinned top.
### 6. Trust visibility placement
- Lane trust indicator + row-level issue chip.
### 7. Escalation placement
- Modal only for account changes with broad impact.
### 8. Interaction zoning
- Context navigation zone, account action zone, detail zone.
### 9. Density-risk analysis
- Risk: many lanes + accounts become noisy.
- Control: show top-impact lanes first.
### 10. Orchestration leakage analysis
- Risk: provider-specific auth states dominate account cards.
- Control: show account usability impact first.

### Validation Questions
- Is this identity-confidence-first and not auth-admin-first?
- Are account issues contextual and recoverable?
- Are technical security details progressive?
- Does it keep emotional calm while still trustworthy?
- Is tier depth additive without changing interaction identity?
