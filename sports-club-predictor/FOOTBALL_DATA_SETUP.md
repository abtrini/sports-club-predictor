# Football-data.org weekly fixture import setup

This update adds an admin page at `/admin/import-fixtures`.

## A. Get the API token

1. Create a free account at football-data.org.
2. Verify the email address if requested.
3. Copy the API token from the account/client area.
4. Keep the token private.

## B. Update Supabase

1. Open the Supabase project.
2. Select **SQL Editor** and then **New query**.
3. Open `supabase/migration-football-data-import.sql` from this project.
4. Copy all SQL, paste it in Supabase, and click **Run**.

## C. Add the token locally

Add this to `.env.local` inside the Next.js project folder:

```env
FOOTBALL_DATA_API_KEY=paste_your_real_token_here
```

Do not add `NEXT_PUBLIC_` to the variable name.

## D. Add the token to Vercel

1. Open the Vercel project.
2. Go to **Settings → Environment Variables**.
3. Add `FOOTBALL_DATA_API_KEY` with the real token as its value.
4. Enable it for Production, Preview, and Development.
5. Save.
6. Open **Deployments**, select the newest deployment's menu, and click **Redeploy**.

## E. Commit and deploy the code

From the outer Git repository folder in VS Code:

```bash
git status
git add .
git commit -m "Add official weekly fixture importer"
git push
```

Vercel should automatically build the pushed commit.

## F. Import games each week

1. Sign into the live site as an administrator.
2. Open the Admin dashboard.
3. Click **Import official fixtures**.
4. Choose a competition.
5. Choose a start and end date for the coming week.
6. Click **Load fixtures**.
7. Tick the matches the club wants to use.
8. Click **Import selected games**.

Imported matches use the official UTC kickoff time from football-data.org. The app displays it in Trinidad and Tobago time and automatically sets the prediction cutoff to 15 minutes before kickoff.
