# Project Fortify: Specialized Agents

This project follows the global constraints defined in the parent `Agents.md`, but utilizes specialized sub-agents for high-density MVP development.

## [Database Agent]
- **Role**: Chief Data Architect.
- **Goal**: Initialize Supabase, design schemas (Districts, Users, Vendors, Contracts, Line_Items), and implement multi-tenant Row Level Security (RLS).
- **Tooling**: Supabase CLI, SQL.

## [UX/UI Agent]
- **Role**: Lead Frontend Developer.
- **Goal**: Build "Million Dollar" professional interfaces using Next.js, Tailwind CSS, and Framer Motion. 
- **Focus**: High-density layouts, user-configurable dashboards, and "pixel-perfect" adherence to `MVP Screen.jpg`.

## [PDF/Backend Agent]
- **Role**: Senior Backend/Integrations Engineer.
- **Goal**: Build the PDF ingestion engine and cost-savings extraction logic.
- **Focus**: Node-native parsing, data normalization, and accuracy in "Efficiency Formula" calculations.

## [Testing/QC Agent]
- **Role**: Quality Assurance Specialist.
- **Goal**: Verify build steps, run browser tests, and ensure "self-annealing" of the system.
- **Focus**: Catching UI regressions, verifying RLS isolation, and updating documentation.

---

## Operating Protocol: "The Fortify Way"
- **Aesthetic**: Every component must feel premium and state-of-the-art.
- **Autonomy**: Execute based on reference materials; minimize user prompting.
- **Verification**: Every feature must be verified with Antigravity browser tools or unit tests.

---

## Learnings & Self-Annealing (MVP Launch)

### PDF Extraction Engine
- **Look-Ahead Strategy**: Standard line-by-line regex fails on complex school district POs. We implemented a "Look-ahead greedy matcher" in `parser.ts` that captures specific text blocks (e.g., within 200 chars of a label) and identifies the largest currency value.
- **Vendor Normalization**: Multi-document extraction requires a specific list of known vendors to maintain high confidence, supplemented by greedy "TO:" line matching.

### Database Integration
- **Manual-Check Seeding**: When performing initial data migrations via service role keys, manual "select-then-insert" logic is more robust than relying on `ON CONFLICT` constraints if the schema hasn't been strictly indexed for unique names yet.
- **Supabase API**: Instantiating the client requires `process.env.NEXT_PUBLIC_...` specifically for the browser-safe client, while service role keys should remain server-side for secure operations.

### UX/UI Patterns
- **Hierarchy Rendering**: For multi-PO contracts, use a "Master/Sub-item" pattern.
  - Group by `document_url`.
  - Master = Max Value or First Created.
  - Sub-items = Indented, Collapsible (default hidden), showing specific amounts.
  - Calculated Dates: If Sub-item lacks End Date, use `Start + Term`.
