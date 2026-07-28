# Sports Club Predictor

A Next.js web app for a 20-person football prediction league.

## Included features

- Public 20-player league table with top-four and bottom-five colour bands
- Player email/password registration and sign-in
- Optional private club registration code
- Personal **My Predictions** page
- Score predictions that automatically lock exactly **15 minutes before kickoff**
- Database-level protection against early/late manipulation or browser-clock changes
- Players can revise a prediction any time before its cutoff
- Fixture list with Trinidad and Tobago kickoff and cutoff times
- Rules and regulations page
- Protected administrator dashboard
- Admin forms to pre-add players, add fixtures, results, points and rule changes
- Automatic standings totals and tie-breaking by exact hits, correct outcomes, then name
- Supabase PostgreSQL database with Row Level Security
- Demo data when Supabase is not configured

## 1. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 2. Create or upgrade the Supabase database

### New Supabase project

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Paste and run `supabase/schema.sql`.

### Existing database from the earlier starter

Run this file once instead:

```text
supabase/migration-15-minute-player-predictions.sql
```

This adds player-account linking, predictions, the 15-minute database lock, and the required Row Level Security policies.

## 3. Configure environment variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CLUB_REGISTRATION_CODE=YOUR-PRIVATE-CLUB-CODE
```

For production, change `NEXT_PUBLIC_SITE_URL` to the deployed address.

`CLUB_REGISTRATION_CODE` is optional in the code but strongly recommended. Give it only to the invited participants so strangers cannot fill the 20 available spaces.

Restart `npm run dev` after changing `.env.local`.

## 4. Configure signup confirmation emails

In Supabase:

1. Open **Authentication → URL Configuration**.
2. Set the Site URL to your app address.
3. Add your local and production URLs to Redirect URLs.
4. Open **Authentication → Email Templates → Confirm signup**.
5. Use this confirmation link:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

The included `/auth/confirm` route exchanges that token for a signed-in session and sends the player to `/predictions`.

During local testing, you may instead disable email confirmation in Supabase Auth settings.

## 5. Create the first administrator

Create the administrator directly under **Supabase → Authentication → Users** rather than through the public player-registration page. Copy the user's UUID and run:

```sql
insert into public.profiles (id, full_name, role)
values ('YOUR-AUTH-USER-UUID', 'Club Administrator', 'admin')
on conflict (id)
do update set full_name = excluded.full_name, role = 'admin';
```

Go to `/login?next=/admin` and sign in.

## 6. Player registration workflow

There are two supported methods:

1. **Admin pre-adds a participant:** The admin enters the person's full name first. The player later registers using exactly the same full name, and the account is linked automatically.
2. **Player registers directly:** If fewer than 20 active participants exist, registration creates their table entry automatically.

The database rejects a 21st active participant.

## 7. Prediction cutoff behaviour

For every fixture:

```text
entry deadline = kickoff time - 15 minutes
```

The admin enters only the kickoff time. The application and a PostgreSQL trigger calculate the deadline. A player may insert or update their prediction only while:

- the fixture is `scheduled` or `open`; and
- the database time is earlier than the entry deadline.

The server action checks the rule for a friendly error message, and Supabase Row Level Security checks it again in the database. The database is the final authority.

## Current scoring setup

- Exact score: 3 points
- Correct home/draw/away result: 1 point
- Incorrect result: 0 points
- Knockout winner/penalty rule: configurable by the administrator

Points are still entered by an administrator. Automatic comparison of predictions against final scores can be added as the next upgrade.
