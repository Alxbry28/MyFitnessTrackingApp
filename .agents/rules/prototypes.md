# Prototype Organization & Workflow Rules

## 1. Directory Structure & Definitions

The `prototypes/` directory uses a strict separation between shipped mobile app functionality and upcoming/unshipped designs:

- **`prototypes/current/` (Current Mobile App)**:
  - Represents **ONLY** features, screens, and UI flows that are **currently implemented and working in the mobile app** (`apps/mobile/`).
  - Do NOT put unreleased, draft, or proposed features into `prototypes/current/`.
  - When comparing side-by-side, `current/` serves as the exact baseline of the running phone app.
  - If a screen exists in `draft/` that is not yet in the mobile app at all (e.g. `meal-prep.html`, `cooking.html`), the `current/` version must show a clear notice stating it is not yet in the mobile app and links to the relevant current screen and draft prototype.

- **`prototypes/draft/` (Future Features & Experiments)**:
  - Represents **upcoming features, new workflows, concepts, and design iterations** that are **NOT YET implemented in the mobile app**.
  - Any new feature requested for exploration (e.g. Cooking with active timer and AI parse, Meal Prep tupperwares partitioning, Supplement text-log deduction) belongs in `prototypes/draft/`.

- **`prototypes/index.html` (Side-by-Side Comparison Hub)**:
  - Displays `prototypes/current/` in the left pane (● Current Mobile App) and `prototypes/draft/` in the right pane (○ Draft Prototypes).
  - Difference cards highlight what is already shipped vs what is being proposed in draft.

- **`prototypes/proto-nav.js`**:
  - Injected navigation toolbar providing easy switching between Current and Draft, 1-phone interactive mode, and direct screen selection.

---

## 2. Prototype-First Lifecycle

Always follow this progression:
1. **Explore in Draft First**:
   - Whenever the user asks for a new feature, workflow change, or UI concept, implement it in `prototypes/draft/`.
   - Never touch `apps/mobile/` code during prototyping.
2. **Review and Vet**:
   - Test and iterate on the user experience in the HTML prototype.
   - Wait for explicit user feedback and approval.
3. **Implement in Mobile App (Explicit Request Only)**:
   - Only modify `apps/mobile/` code when the user explicitly requests implementation (e.g. "I-implement na ito sa mobile app").
4. **Promote to Current Prototype**:
   - Once the feature is built and verified in `apps/mobile/`, update `prototypes/current/` so that it accurately reflects the newly shipped mobile app functionality.
