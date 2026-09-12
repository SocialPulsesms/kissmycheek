# Deployment & Hosting Guide — Kiss My Cheek

This document outlines the step-by-step configuration required to host the **Kiss My Cheek** premium dating and social club application on live server platforms like **Vercel**, **Render**, **AWS**, or a **VPS**.

---

## 1. Fast-Track: Hosting on Vercel (Recommended)

Next.js is built by Vercel, making it the most optimal, serverless hosting option.

### Step-by-Step Vercel Deployment:
1. Push your codebase to a private **GitHub**, **GitLab**, or **Bitbucket** repository.
2. Log in to [Vercel](https://vercel.com) and click **"Add New"** > **"Project"**.
3. Import your `kissmycheek` repository.
4. Vercel automatically detects Next.js:
   * **Framework Preset**: `Next.js`
   * **Build Command**: `npm run build`
   * **Output Directory**: `.next`
5. Configure the **Environment Variables** (see list below) in the Vercel dashboard.
6. Click **"Deploy"**. The site is live on your custom domain in under 2 minutes.

---

## 2. Environment Variables Configuration

Configure the following environment variables on your live hosting dashboard:

| Variable Name | Live Server Value | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:password@host:port/dbname?sslmode=require` | Live hosted DB connection string (Supabase, Neon, AWS RDS) |
| `NEXTAUTH_SECRET` | Generate via `openssl rand -base64 32` | Key used to sign JWT auth cookies |
| `NEXTAUTH_URL` | `https://yourdomain.com` | Base live URL of the application |
| `STRIPE_PUBLIC_KEY` | `pk_live_...` | Live Stripe publisher key for VIP memberships |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Live Stripe secret backend key |
| `NEXT_PUBLIC_STORAGE_URL` | `https://your-bucket-domain.com` | Cloud CDN/storage url for verified portrait photos |

---

## 3. Transitioning the Database from SQLite to PostgreSQL

SQLite (`file:./dev.db`) is fantastic for local development, but serverless environments like Vercel have ephemeral/read-only file systems. For production, you must use a hosted database.

### Update `prisma/schema.prisma`:
Change the `datasource` block to PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Push your schema to the live database:
Run the following command locally using your live database connection string to set up all tables:
```bash
DATABASE_URL="postgresql://..." npx prisma db push
```

---

## 4. Automatic Client Generation on Deployment

Your `package.json` includes a `postinstall` hook script:
```json
"postinstall": "prisma generate"
```
This guarantees Vercel will auto-generate your type-safe Prisma Client code before the compiler executes `next build`.
