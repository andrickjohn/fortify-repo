---
description: automated greeting and status check
---

---
description: Start of day / session setup
---

1. Pull latest changes
   // turbo
   `git pull`

2. Install dependencies (ensure fresh state)
   // turbo
   `npm install`

3. Start Development Server
   // turbo
   `npm run dev`

### 🛡️ Message in a Bottle: Security & Resilience Plan
Welcome back! Duplicate contract upload logic is successfully deployed. Our next focus is hardening Fortify for enterprise subscribers.

**Comparison: MVP vs Enterprise Security**
| Feature | MVP | Enterprise | Improvement |
| :--- | :--- | :--- | :--- |
| Auth | Email/Pass | SSO (SAML/Google) | High |
| Audit | None | Immutable Logs | High |
| Threat | Basic | WAF + DDoS | Medium |
| Compliance| None | SOC 2 / FERPA | High |

**Next Steps Recommendation:**
1. **Implement `activity_log`**: Add the audit log table and triggers (critical for compliance).
2. **Security Headers**: Update `vercel.json` with HSTS and CSP.
3. **SSO Integration**: Research Supabase SAML options for school districts.

*Refer to `docs/SECURITY_PLAN.md` for the full roadmap.*
