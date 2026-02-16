# Fortify: Admin & Installation Guide

This guide covers the technical setup, deployment, and administration of the Fortify platform.

## 📦 Prerequisites
- **Node.js**: v20.16.0 or higher.
- **npm**: v10.x or higher.
- **Supabase Account**: For database, auth, and storage.
- **Vercel Account**: Recommended for hosting.

## 🚀 Installation & Local Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd Fortify
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Database Setup**:
   Log in to your Supabase SQL Editor and run the contents of `schema.sql`. This will:
   - Create tables for `districts`, `vendors`, `contracts`, and `line_items`.
   - Enable **Row Level Security (RLS)** for multi-tenant isolation.

5. **Run Locally**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to view the application.

## 🌐 Server Hosting & Deployment

### Vercel (Frontend)
1. Push your code to GitHub.
2. Link the repository to a new Vercel project.
3. Add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables.
4. Deploy!

### Supabase (Backend/Auth)
- **Authentication**: Enable "Email Auth" in the Supabase Auth settings.
- **Isolation**: RLS is on by default. Ensure all queries pass the `district_id` for data security.

## ⚙️ Extraction Engine Maintenance
The PDF parser is located in `src/lib/pdf/parser.ts`. It uses greedy pattern matching for high extraction confidence. 
To add new vendor patterns, update the `extractPattern` arrays with relevant regex strings.

---
*Developer Support: support@fortifyprocure.com*
