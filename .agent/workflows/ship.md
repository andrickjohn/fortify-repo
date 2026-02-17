---
description: build, test and ship changes
---

---
description: Build, Test, and Ship to Production
---

1. Run Linting
   // turbo
   `npm run lint`

2. Build Project
   // turbo
   `npm run build`

4. Sync to Git (uses sync workflow)
   // turbo
   `git add . && git commit -m "Shipping to production" && git push`

5. Verify Vercel Deployment (Manual)
   > Check Vercel dashboard for deployment status.
