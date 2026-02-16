-- Database Schema for Fortify MVP

-- Districts (Multi-tenant root)
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    subscription_tier TEXT CHECK (subscription_tier IN ('pilot', 'standard', 'premium', 'enterprise')),
    enrollment_current INTEGER,
    enrollment_previous INTEGER,
    onboarded_date DATE DEFAULT CURRENT_DATE,
    primary_contact TEXT,
    settings_json JSONB DEFAULT '{}'
);

-- Users (District-scoped with roles)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('super_admin', 'district_admin', 'district_editor', 'district_viewer')),
    permissions_json JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors (District-scoped)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    category TEXT CHECK (category IN ('software', 'services', 'supplies', 'transportation', 'food_service', 'other')),
    primary_contact TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    contract_name TEXT NOT NULL,
    contract_number TEXT,
    start_date DATE,
    end_date DATE,
    annual_value DECIMAL(12,2),
    renewal_date DATE,
    auto_renew BOOLEAN DEFAULT false,
    status TEXT CHECK (status IN ('active', 'expired', 'pending_renewal', 'under_negotiation', 'cancelled')),
    document_url TEXT,
    page_number INTEGER,
    ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract Line Items
CREATE TABLE contract_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    description TEXT,
    unit_cost DECIMAL(12,2),
    quantity INTEGER,
    annual_cost DECIMAL(12,2),
    category TEXT,
    parsed_confidence_score INTEGER CHECK (parsed_confidence_score BETWEEN 0 AND 100)
);

-- Negotiations
CREATE TABLE negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    current_annual_spend DECIMAL(12,2),
    proposed_annual_spend DECIMAL(12,2),
    potential_savings DECIMAL(12,2) GENERATED ALWAYS AS (current_annual_spend - proposed_annual_spend) STORED,
    status TEXT CHECK (status IN ('identified', 'in_progress', 'vendor_contacted', 'proposal_received', 'approved', 'completed')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings Realized
CREATE TABLE savings_realized (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID REFERENCES negotiations(id),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    baseline_cost DECIMAL(12,2) NOT NULL,
    new_cost DECIMAL(12,2) NOT NULL,
    savings_amount DECIMAL(12,2) GENERATED ALWAYS AS (baseline_cost - new_cost) STORED,
    validation_status TEXT CHECK (validation_status IN ('pending', 'verified', 'disputed')),
    success_fee_owed DECIMAL(12,2),
    success_fee_type TEXT CHECK (success_fee_type IN ('savings', 'donation')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies placeholder (to be refined)
-- RLS Policies with Recursion Fix
-- Using a SECURITY DEFINER function to bypass RLS recursion on the users table
CREATE OR REPLACE FUNCTION get_my_district_id()
RETURNS uuid AS $$
BEGIN
    RETURN (SELECT district_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_realized ENABLE ROW LEVEL SECURITY;

-- Updated Policies using the safe lookup function
CREATE POLICY district_isolation_districts ON districts
    FOR ALL USING (id = get_my_district_id());

CREATE POLICY district_isolation_users ON users
    FOR ALL USING (district_id = get_my_district_id());

CREATE POLICY district_isolation_vendors ON vendors
    FOR ALL USING (district_id = get_my_district_id());

CREATE POLICY district_isolation_contracts ON contracts
    FOR ALL USING (district_id = get_my_district_id());

CREATE POLICY district_isolation_line_items ON contract_line_items
    FOR ALL USING (contract_id IN (SELECT id FROM contracts WHERE district_id = get_my_district_id()));

CREATE POLICY district_isolation_negotiations ON negotiations
    FOR ALL USING (district_id = get_my_district_id());

CREATE POLICY district_isolation_savings ON savings_realized
    FOR ALL USING (district_id = get_my_district_id());
