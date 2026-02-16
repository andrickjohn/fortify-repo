# Fortify Platform - Technical Requirements Document

**Product:** Vendor Management & Contract Intelligence Platform for K-12 School Districts
**Company:** Fortify Partners (Founded 2016)
**Version:** 1.0 | **Date:** February 8, 2026
**Pilot Client:** Orange Unified School District

---

## 1. Executive Summary

Fortify is a multi-tenant SaaS platform that provides school districts with vendor benchmarking, contract intelligence, and cost optimization tools. The platform ingests vendor contracts, applies AI-powered parsing, surfaces savings opportunities through peer benchmarking, and tracks negotiation outcomes.

**Target customers:** K-12 school districts paying $100k+ annually for the service.

**Core value proposition:** Districts average 375 active vendor contracts, 70% renewing annually over summer. Enrollment declines (e.g., 13.5% since 2019) have not been matched by contract right-sizing, creating a 20.4% "Value Delta" - meaning districts are overpaying relative to their current student populations.

---

## 2. Business Requirements

### 2.1 Program Objectives

1. **Clarity** - Organize, benchmark, and analyze all active vendor contracts
2. **Reduce Costs** - Decrease expenditures through renegotiation and consolidation
3. **Lead with Data** - Unlock efficiency and reduce risk with data-driven decisions

### 2.2 Operational Workflow (4 Phases)

| Phase | Activity | Key Actions |
|-------|----------|-------------|
| **Phase 1** | Baseline Contract Topography | Analyze past 24 months of renewals; organize/sort/tag by category, price, duration, scope; grade contracts as Keep/Question/Cut |
| **Phase 2** | Identify Savings | Research and compare like-size districts' contracts; precision bidding for competitive offerings; identify gaps, cracks, and overlaps |
| **Phase 3** | Realize Savings | Consolidate vs. renegotiate vendor contracts |
| **Phase 4** | Automate Forward-Facing Process | Qualification matrix, process, and filters for all new contracts; 3-year rolling review process |

### 2.3 Revenue Model

| Tier | Annual Price | Services |
|------|-------------|----------|
| Pilot | $25,000 | Full platform access, manual contract analysis |
| Standard | $75,000 | Platform + quarterly reviews + benchmarking |
| Premium | $125,000 | Platform + monthly reviews + dedicated support + custom reports |
| Success Fees | 15% of realized savings, 30% of secured donations | Performance-based add-on |

---

## 3. Technical Architecture

### 3.1 Recommended Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | WeWeb (Vue.js) | White-label district-facing dashboards |
| **Backend/Database** | Supabase (PostgreSQL) | Multi-tenant data, auth, real-time, RLS |
| **AI Processing** | Claude API (Anthropic) | Contract parsing and analysis |
| **Automation** | Make.com | Workflow orchestration, notifications, integrations |
| **PDF Extraction** | PDF.co or Adobe API | Raw text extraction from contract documents |
| **Internal Admin** | Retool (optional) | Fortify team operational workflows |

**Why WeWeb over Retool for district-facing UI:**
- True white-label: custom domains per district (e.g., `login.orangeusd.fortifyplatform.com`)
- 84% lower monthly cost at scale ($199/mo vs $1,200/mo)
- Builds real Vue.js apps, not iframe widgets
- Code export capability - no vendor lock-in

### 3.2 System Architecture

```
CLIENT LAYER
  District Portal 1..N (WeWeb, white-labeled per district)
       |
AUTHENTICATION LAYER
  Supabase Auth + Row-Level Security (RLS)
       |
DATABASE LAYER
  Supabase/PostgreSQL - Multi-Tenant Schema with District Isolation
  Tables: districts, users, vendors, contracts, line_items,
          negotiations, savings_realized, activity_log
       |
AUTOMATION LAYER
  Make.com Workflows | Claude API Processing | Supabase Functions
  (Contract parsing, renewal notifications, email alerts, report generation)
```

---

## 4. Data Model

### 4.1 Core Tables

#### `districts` (Multi-tenant root)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, auto-generated |
| name | TEXT | NOT NULL |
| domain | TEXT | UNIQUE |
| subscription_tier | TEXT | CHECK: pilot, standard, premium, enterprise |
| enrollment_current | INTEGER | |
| enrollment_previous | INTEGER | |
| onboarded_date | DATE | DEFAULT CURRENT_DATE |
| primary_contact | TEXT | |
| settings_json | JSONB | DEFAULT '{}' |

#### `users` (District-scoped with roles)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email | TEXT | UNIQUE, NOT NULL |
| district_id | UUID | FK -> districts, CASCADE |
| role | TEXT | CHECK: super_admin, district_admin, district_editor, district_viewer |
| permissions_json | JSONB | DEFAULT '{}' |
| last_login | TIMESTAMPTZ | |

#### `vendors` (District-scoped)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| district_id | UUID | FK -> districts, CASCADE |
| vendor_name | TEXT | NOT NULL |
| category | TEXT | CHECK: software, services, supplies, transportation, food_service, other |
| primary_contact | TEXT | |
| email, phone, website | TEXT | |

#### `contracts` (Core entity)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| district_id | UUID | FK -> districts, CASCADE |
| vendor_id | UUID | FK -> vendors, SET NULL |
| contract_name | TEXT | NOT NULL |
| contract_number | TEXT | |
| start_date, end_date | DATE | |
| annual_value | DECIMAL(12,2) | |
| renewal_date | DATE | |
| auto_renew | BOOLEAN | DEFAULT false |
| status | TEXT | CHECK: active, expired, pending_renewal, under_negotiation, cancelled |
| document_url | TEXT | |
| ai_confidence_score | INTEGER | CHECK: 0-100 |
| reviewed_by | UUID | FK -> users |
| reviewed_at | TIMESTAMPTZ | |

#### `contract_line_items` (AI-parsed details)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| contract_id | UUID | FK -> contracts, CASCADE |
| description | TEXT | |
| unit_cost | DECIMAL(12,2) | |
| quantity | INTEGER | |
| annual_cost | DECIMAL(12,2) | |
| category | TEXT | |
| parsed_confidence_score | INTEGER | CHECK: 0-100 |

#### `negotiations` (Pipeline tracking)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| contract_id | UUID | FK -> contracts, CASCADE |
| district_id | UUID | FK -> districts, CASCADE |
| current_annual_spend | DECIMAL(12,2) | |
| proposed_annual_spend | DECIMAL(12,2) | |
| potential_savings | DECIMAL(12,2) | GENERATED (current - proposed) |
| savings_percentage | DECIMAL(5,2) | GENERATED |
| status | TEXT | CHECK: identified, in_progress, vendor_contacted, proposal_received, approved, completed |
| priority | TEXT | CHECK: low, medium, high, urgent |
| assigned_to | UUID | FK -> users |

#### `savings_realized` (Success metrics)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| negotiation_id | UUID | FK -> negotiations |
| contract_id | UUID | FK -> contracts, CASCADE |
| district_id | UUID | FK -> districts, CASCADE |
| baseline_cost | DECIMAL(12,2) | NOT NULL |
| new_cost | DECIMAL(12,2) | NOT NULL |
| savings_amount | DECIMAL(12,2) | GENERATED (baseline - new) |
| savings_percentage | DECIMAL(5,2) | GENERATED |
| validation_status | TEXT | CHECK: pending, verified, disputed |
| success_fee_owed | DECIMAL(12,2) | |
| success_fee_type | TEXT | CHECK: savings, donation |

#### `activity_log` (Immutable audit trail)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| district_id | UUID | FK -> districts, CASCADE |
| user_id | UUID | FK -> users, SET NULL |
| action_type | TEXT | NOT NULL |
| entity_type | TEXT | |
| entity_id | UUID | |
| details_json | JSONB | DEFAULT '{}' |
| timestamp | TIMESTAMPTZ | DEFAULT NOW() |

### 4.2 Required Indexes
- `contracts(district_id)`, `contracts(vendor_id)`, `contracts(status)`, `contracts(renewal_date)`
- `negotiations(district_id)`, `negotiations(status)`
- `savings_realized(district_id)`
- `activity_log(district_id)`, `activity_log(timestamp DESC)`

### 4.3 Database Functions
- `calculate_annual_spend(district_id)` - Sum of active contract values
- `calculate_ytd_savings(district_id)` - Sum of realized savings YTD
- `upcoming_renewals(district_id, days)` - Contracts renewing within N days

---

## 5. Security Requirements

### 5.1 Multi-Tenant Isolation
- **Row-Level Security (RLS)** enabled on all tables
- District users can only see their own district's data
- Super admins bypass district isolation
- All queries automatically filtered by `district_id`

### 5.2 Role-Based Access Control (RBAC)

| Role | Permissions |
|------|------------|
| **Super Admin** (Fortify team) | See all districts, manage platform settings, override permissions |
| **District Admin** | Full access to their district, manage users, upload contracts, configure settings |
| **District Editor** | Upload contracts, edit data, create negotiations, view reports |
| **District Viewer** | Read-only access, view dashboards, export reports |

### 5.3 Authentication
- Supabase Auth with invite-based signup
- Email/password login with district-level isolation
- Custom redirect URLs per district subdomain

### 5.4 Security Best Practices
- All secrets in environment variables (never hardcoded)
- API keys: anon key client-side (RLS protects data), service key server-side only
- HTTPS enforced on all connections with HSTS headers
- Immutable audit logging (no deletion/editing of logs)
- Database encryption at rest (Supabase default)
- Document storage encryption (Supabase Storage)
- Rate limiting via Supabase built-in + Edge Functions

---

## 6. Frontend Requirements (WeWeb)

### 6.1 Dashboard Structure

#### Executive Overview (District View)
- **Key Metrics Cards:** Total Annual Vendor Spend (with trend), Active Negotiations Pipeline (count + value), YTD Savings Realized vs Target (progress bar), Upcoming Renewals (next 90 days count)
- **Visualizations:** Spend by Category (pie/donut chart), Spending Trends Over Time (line chart), Top 10 Vendors by Spend (bar chart), Savings Funnel (pipeline visualization)
- **Alert Cards:** Contracts expiring in 30 days, high-value negotiations in progress, benchmark alerts (spending above peer average)
- **District Baseline Efficiency Score:** Composite score based on spend-to-service ratio. Formula: (Service Coverage x 30%) + (Cost Optimization x 25%) + (Contract Utilization x 20%) + (Risk Management x 15%)

#### Contract Management
- Searchable/filterable contract table with column sorting (date, value, status, vendor)
- Bulk upload interface with drag-drop
- Individual contract detail panels
- Document viewer with AI-parsed highlights (side-by-side PDF + extracted data)
- Edit/approval workflow interface
- Status management (active/expired/under negotiation)
- **Table Columns:** Contract Name, Vendor, Start/End Date, Annual Value, Renewal Date, Status, Risk Level, Savings Opportunity, Actions (View/Edit/Download)

#### Savings Tracker
- Negotiation pipeline (drag-drop Kanban stages: Identified -> In Progress -> Vendor Contacted -> Proposal Received -> Approved -> Completed)
- Savings funnel visualization
- Success fee calculator (15% savings, 30% donations)
- Benchmark comparison charts
- ROI dashboard (savings vs Fortify fees)

#### Analytics & Insights
- Spend trends over time (monthly/quarterly/annual)
- Vendor consolidation opportunities
- Contract renewal calendar view
- Peer benchmark comparisons (anonymized)
- **Value Delta Analysis:** Enrollment vs Contract Spend overlay charts showing the gap between declining enrollment and rising contract costs
- Drill-down by category, department, LCAP alignment, vendor, and usage data
- **Benchmark Intelligence:** "Your Ed Services spend is 23% above peer districts", "Similar-sized districts spend $X less on this vendor", "Opportunity: $125k potential savings identified"

#### Settings & Admin
- Add/remove district users with role assignment (admin/editor/viewer)
- Notification preferences (email alerts for renewals, savings milestones, weekly digest)
- Data management (export to CSV/Excel, audit log viewer, document storage)

### 6.2 Component Architecture

```
fortify-platform/
  pages/
    login.vue                    # Authentication
    dashboard.vue                # Executive overview
    contracts/
      index.vue                  # Contract list/table
      [id].vue                   # Contract detail view
      upload.vue                 # Bulk upload interface
      review.vue                 # AI parsing review
    negotiations/
      index.vue                  # Pipeline Kanban
      [id].vue                   # Negotiation detail
    savings/
      index.vue                  # Savings tracker
      reports.vue                # ROI reports
    analytics/
      index.vue                  # Analytics dashboard
    settings/
      users.vue                  # User management
      preferences.vue            # Settings
  components/
    MetricCard.vue               # Reusable metric display
    ContractTable.vue            # Data table component
    NegotiationKanban.vue        # Drag-drop pipeline
    SavingsChart.vue             # Chart components
    UpcomingRenewals.vue         # Alert widget
    SpendByCategory.vue          # Pie chart
    BenchmarkComparison.vue      # Peer comparison
    DocumentViewer.vue           # PDF viewer with highlights
  composables/
    useAuth.js                   # Authentication logic
    useContracts.js              # Contract CRUD
    useNegotiations.js           # Negotiation management
    useSavings.js                # Savings calculations
    useAnalytics.js              # Analytics queries
  supabase/
    client.js                    # Supabase configuration
```

### 6.3 Non-Functional UI Requirements
- Mobile-responsive (superintendent iPad use)
- Custom color schemes matching district branding
- Sub-2-second page loads
- PWA capabilities for offline access

---

## 7. AI Contract Processing Pipeline

### 7.1 Processing Flow

```
Contract Upload (WeWeb) -> Webhook Trigger (Make.com)
  -> PDF Text Extraction (PDF.co or Adobe API)
    -> Claude API Processing (Structured JSON Output)
      -> JSON Parsing & Validation
        -> Staging Table in Supabase (status: pending_review)
          -> Human Review Interface (side-by-side comparison)
            -> Approval -> Main Contracts Table
              -> Activity Log & Notifications
```

### 7.2 AI Extraction Schema

The Claude API extracts the following structured data per contract:

- `vendor_name`, `contract_type` (software|services|supplies|transportation|food_service|other)
- `start_date`, `end_date`, `annual_value`
- `payment_terms`, `renewal_terms`, `auto_renew`, `renewal_notice_days`
- `cancellation_terms`
- `line_items[]` (description, unit_cost, quantity, annual_cost, category)
- `key_terms[]`
- `negotiation_opportunities[]` (opportunity, reasoning, potential_savings_estimate)
- `red_flags[]` (concerning terms or clauses)
- `cost_per_student`, `previous_cost_per_student`
- `confidence_scores` (vendor_name: 0-100, dates: 0-100, annual_value: 0-100, line_items: 0-100, overall: 0-100)

### 7.3 Confidence Score Thresholds
- **Green (>90%):** High confidence, quick approve
- **Yellow (70-90%):** Review recommended
- **Red (<70%):** Manual review required

### 7.4 Bulk Actions
- Approve all high-confidence (>90%) extractions
- Send batch to manual review
- Reject and reprocess

### 7.5 Learning Loop
- Track correction patterns from human review
- Update Claude prompts based on common errors
- Improve extraction accuracy over time

---

## 8. Automation Features

### 8.1 Built-in Automations (Supabase Functions + Make.com)

| Automation | Trigger | Action |
|------------|---------|--------|
| Renewal Alert System | Daily cron (12:00 AM UTC) | Find contracts expiring in 90/60/30 days; email district admin; update status to pending_renewal |
| Negotiation Reminders | Weekly (Monday 9:00 AM) | Find in_progress negotiations with next_action_date < TODAY+7; send weekly digest to assigned users |
| Savings Milestone Notifications | Real-time (on savings record created) | Celebrate milestones ($50k, $100k, $250k, 4x ROI); email district leadership |
| Stale Contract Flagging | Monthly (1st of month) | Find active contracts >5 years old never reviewed or not reviewed in 1 year; flag as needs_review |
| Monthly Executive Report | Monthly (last day, 8:00 PM) | Generate PDF report with spend, savings, pipeline, renewals, benchmarks; email to superintendent + district admin |
| Vendor Performance Tracking | Quarterly | Analyze renewals vs. cancellations; generate vendor scorecards; identify consolidation opportunities |

### 8.2 Make.com Automation Recipes

1. **Contract Upload -> AI Processing:** Webhook -> Get District Context -> Extract PDF Text -> Process with Claude API -> Insert to Staging -> Notify Team
2. **Savings Approved -> Success Fee Invoice:** Webhook -> Calculate Fee (15% or 30%) -> Update Google Sheet -> Create Invoice (QuickBooks API) -> Send Email -> Log Activity
3. **New District Onboarded -> Setup Workflow:** Webhook -> Create Database Tenant -> Generate Welcome Email -> Create Admin User -> Send Onboarding Guide -> Schedule Kickoff Call (Calendly API)
4. **Benchmark Data Update:** Weekly Schedule -> Query All Districts -> Calculate Peer Benchmarks -> Update Benchmark Table -> Flag Outliers (>20% above average) -> Send Opportunity Alerts

---

## 9. MVP Scope & Success Criteria

### 9.1 MVP Deliverables (Weeks 1-5)

| Week | Focus | Deliverables |
|------|-------|-------------|
| **Week 1** | Foundation | Supabase schema + RLS, Supabase Auth with district isolation, WeWeb project setup, basic executive dashboard, contract table with CRUD |
| **Week 2** | Core Features | Contract upload UI (drag-drop), AI parsing workflow (Make.com + Claude), staging/review interface (side-by-side), real-time metrics calculations |
| **Week 3** | Advanced Features | Negotiations pipeline (Kanban), savings tracker with ROI charts, analytics dashboard with benchmarking, renewal alerts, settings & admin pages |
| **Week 4** | Pilot Preparation | Orange USD onboarding, white-label branding (custom domain, logo, colors), data migration + AI parsing of historical contracts, training & documentation |
| **Week 5** | Launch & Iteration | Live with Orange USD, daily monitoring, rapid bug fixes, feature refinements |

### 9.2 MVP Success Criteria (90 Days)

**Technical:**
- Platform uptime: >99.5%
- Page load time: <2 seconds
- AI parsing accuracy: >90%
- Zero critical security issues

**Business:**
- Districts onboarded: 5-10
- Contracts processed: 100+
- Total savings identified: $500k+
- User satisfaction (NPS): >50

**Financial:**
- MRR: $10-20k
- Customer acquisition cost: <$5k
- Lifetime value: >$100k
- Burn rate: <$5k/month

---

## 10. Infrastructure & Cost

### 10.1 Monthly Operating Costs by Phase

| Component | MVP (1-5 districts) | Scale (10-20) | Enterprise (50+) |
|-----------|-------------------|---------------|-------------------|
| Supabase | $25/mo (Pro) | $99/mo (Team) | $599/mo (Enterprise) |
| WeWeb | $199/mo | $199/mo | $199/mo |
| Make.com | $29/mo | $99/mo | $299/mo |
| Claude API | $50-100/mo | $300-500/mo | $1,000-2,000/mo |
| PDF.co | $29/mo | $99/mo | $199/mo |
| Domain & Hosting | $20/mo | $50/mo | $200/mo |
| Email (SendGrid) | $15/mo | $49/mo | $99/mo |
| Monitoring (Sentry) | $26/mo | $50/mo | $99/mo |
| Analytics | $0/mo (PostHog free) | $29/mo | $99/mo |
| **Total** | **~$393-443/mo** | **~$1,048-1,248/mo** | **~$2,943-3,943/mo** |

### 10.2 Required Accounts & Services
- **Core:** Supabase, WeWeb, Make.com, Anthropic (Claude API), PDF.co
- **Services:** SendGrid, Sentry, PostHog
- **Dev Tools:** Claude Code, VS Code, Postman, Figma (optional)
- **Optional:** Loom (video tutorials), Calendly (scheduling), QuickBooks (invoicing)

---

## 11. Implementation Roadmap

| Phase | Timeline | Objectives |
|-------|----------|-----------|
| **Phase 1: MVP** | Weeks 1-5 | Build and launch with Orange USD pilot |
| **Phase 2: Pilot Expansion** | Months 2-3 | Onboard 3-5 additional pilot districts; iterate on UX; build case studies |
| **Phase 3: Commercial Launch** | Months 4-6 | Marketing website, sales materials, onboarding automation, conference presentations (ASBO, CASBO) |
| **Phase 4: Scale & Advanced Features** | Months 7-12 | AI-powered benchmarking, predictive analytics, vendor marketplace, RFP/bidding module, SSO/SAML, multi-district consortium management |
| **Phase 5: Market Domination** | Year 2+ | Adjacent markets (charters, universities), geographic expansion, mobile apps (iOS/Android), potential acquisition/exit |

---

## 12. Key Decisions Required

1. **Branding** - Platform name (ProClear, SchoolSpend, ProIntel, or Procision?), logo, color scheme, custom domain setup
2. **Pilot Pricing** - Orange USD contract terms, success fee structure (15% vs 30%), payment schedule
3. **Feature Prioritization** - Which features for MVP vs Phase 2, mobile app priority, integration priorities
