"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface District {
    id: string;
    name: string;
    domain?: string;
    subscription_tier?: string;
    enrollment_current?: number;
    enrollment_previous?: number;
    settings_json?: any;
}

interface DistrictContextValue {
    activeDistrict: District | null;
    setActiveDistrict: (district: District) => void;
    allDistricts: District[];
    isSuperAdmin: boolean;
    userRole: string | null;
    userId: string | null;
    isLoading: boolean;
}

const DistrictContext = createContext<DistrictContextValue>({
    activeDistrict: null,
    setActiveDistrict: () => {},
    allDistricts: [],
    isSuperAdmin: false,
    userRole: null,
    userId: null,
    isLoading: true,
});

export function useDistrictContext() {
    return useContext(DistrictContext);
}

const STORAGE_KEY = "fortify_active_district_id";

export function DistrictProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const [activeDistrict, setActiveDistrictState] = useState<District | null>(null);
    const [allDistricts, setAllDistricts] = useState<District[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const setActiveDistrict = useCallback((district: District) => {
        setActiveDistrictState(district);
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, district.id);
        }
    }, []);

    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsLoading(false);
                    return;
                }

                setUserId(user.id);

                // Get user profile
                const { data: profile } = await supabase
                    .from("users")
                    .select("district_id, role")
                    .eq("id", user.id)
                    .single();

                if (!profile) {
                    setIsLoading(false);
                    return;
                }

                setUserRole(profile.role);
                const isSuper = profile.role === "super_admin";
                setIsSuperAdmin(isSuper);

                if (isSuper) {
                    // Super admin: fetch all districts for the switcher
                    const { data: districts } = await supabase
                        .from("districts")
                        .select("*")
                        .order("name");

                    if (districts && districts.length > 0) {
                        setAllDistricts(districts);

                        // Restore last selected district from localStorage
                        const savedId = typeof window !== "undefined"
                            ? localStorage.getItem(STORAGE_KEY)
                            : null;

                        const savedDistrict = savedId
                            ? districts.find((d) => d.id === savedId)
                            : null;

                        // Use saved district, or user's own district, or first in list
                        const defaultDistrict =
                            savedDistrict ||
                            districts.find((d) => d.id === profile.district_id) ||
                            districts[0];

                        setActiveDistrictState(defaultDistrict);
                    }
                } else {
                    // Regular user: fetch only their own district
                    if (profile.district_id) {
                        const { data: district } = await supabase
                            .from("districts")
                            .select("*")
                            .eq("id", profile.district_id)
                            .single();

                        if (district) {
                            setActiveDistrictState(district);
                            setAllDistricts([district]);
                        }
                    }
                }
            } catch (err) {
                console.error("DistrictContext init error:", err);
            } finally {
                setIsLoading(false);
            }
        }

        init();
    }, [supabase]);

    return (
        <DistrictContext.Provider
            value={{
                activeDistrict,
                setActiveDistrict,
                allDistricts,
                isSuperAdmin,
                userRole,
                userId,
                isLoading,
            }}
        >
            {children}
        </DistrictContext.Provider>
    );
}
