# GoAppChurch — Setup Guide

## 1. Supabase Project Setup

1. Create a Supabase project at supabase.com
2. Go to **SQL Editor** and run the full contents of `GoApp-Backend/supabase_schema.sql`
3. Go to **Authentication → Users** and create 2 users manually:
   - Boss user: email + password of your choice
   - Assistant user: email + password of your choice
4. After creating users, run this SQL to set their roles (replace the emails):

```sql
UPDATE users SET role = 'boss', full_name = 'Your Boss Name' WHERE email = 'boss@example.com';
UPDATE users SET role = 'assistant', full_name = 'Your Assistant Name' WHERE email = 'assistant@example.com';
```

5. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key

## 2. Frontend Environment

Create a `.env` file in `GoApp-Frontend/`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run the App

```bash
cd GoApp-Frontend
npm install
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android
- Press `w` for Web (PWA)

## 4. Backend (Optional — Frontend talks directly to Supabase)

The Express backend is optional for supplemental operations.

```bash
cd GoApp-Backend
cp .env.example .env
# Fill in your SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

## 5. Android APK Build (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

## 6. PWA Deployment (Cloudflare Pages)

```bash
npx expo export --platform web
# Deploy the `dist/` folder to Cloudflare Pages
# Set environment variables EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Cloudflare dashboard
```
