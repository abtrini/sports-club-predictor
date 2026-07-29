# Player Management and Password Reset Update

This update adds:

- Administrator player editing
- Deactivate/reactivate controls
- Restricted permanent deletion
- Password-reset emails
- A signed-in password-change page
- Colour-coded information, warning, success, and danger areas

## 1. Copy the update files

Copy the contents of the included `sports-club-predictor` folder into your existing inner Next.js project folder—the folder that contains `package.json`.

Choose **Replace** only for:

```text
app/auth/confirm/route.ts
```

The other TypeScript files are new pages and actions.

## 2. Run the Supabase migration

Open:

```text
Supabase → SQL Editor → New query
```

Paste and run:

```text
supabase/migration-player-management.sql
```

This creates two admin-only database functions:

- `admin_update_participant`
- `admin_delete_participant`

The functions verify that the current user is an administrator before changing data.

## 3. Add the CSS

Open:

```text
player-management-password-css.css
```

Copy the full contents and paste them near the bottom of:

```text
app/globals.css
```

Place them before the final media queries when practical. The supplied block includes its own mobile rule.

## 4. Add Manage Players to the Admin Portal

Open:

```text
app/admin/page.tsx
```

Inside `.admin-heading-actions`, add this link before the Sign out form:

```tsx
<Link className="button button-secondary" href="/admin/players">
  Manage players
</Link>
```

The section should look similar to:

```tsx
<div className="admin-heading-actions">
  <Link className="button button-primary" href="/admin/import-fixtures">
    Import official fixtures
  </Link>

  <Link className="button button-secondary" href="/admin/players">
    Manage players
  </Link>

  <form action={signOutAction}>
    <button className="button button-secondary" type="submit">
      Sign out
    </button>
  </form>
</div>
```

Add an anchor ID to the existing Add participant card:

```tsx
<article id="add-participant" className="content-card">
```

This lets the **Add a participant** button on the management page jump directly to that form.

## 5. Add Account Security to the signed-in navigation

Open:

```text
components/Header.tsx
```

Inside the section rendered when `user` exists, add:

```tsx
<Link href="/update-password">Account security</Link>
```

Recommended order:

```tsx
{user ? (
  <>
    <Link href="/predictions">My predictions</Link>
    <Link href="/update-password">Account security</Link>

    {isAdmin && (
      <Link className="admin-nav-link" href="/admin">
        Admin Portal
      </Link>
    )}

    <form action={signOutAction} className="nav-signout-form">
      <button className="nav-signout-button" type="submit">
        Sign out
      </button>
    </form>
  </>
) : (
  <>
    <Link href="/register">Register</Link>
    <Link href="/login">Sign in</Link>
  </>
)}
```

## 6. Add Forgot Password to the sign-in page

Open:

```text
app/login/page.tsx
```

Below the sign-in form, add:

```tsx
<p className="form-footnote security-recovery-link">
  <Link href="/forgot-password">Forgot your password?</Link>
</p>
```

`Link` is already imported in the original login page. If it is not, add:

```tsx
import Link from "next/link";
```

## 7. Configure the Supabase reset-password email

Open:

```text
Supabase → Authentication → Email Templates → Reset password
```

Use this link in the email button:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery&next=/update-password">
  Reset password
</a>
```

A fuller simple template is:

```html
<h2>Reset your Sports Club Predictor password</h2>
<p>Click the button below to choose a new password.</p>
<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery&next=/update-password">
    Reset password
  </a>
</p>
<p>If you did not request this, you can ignore the email.</p>
```

## 8. Confirm the Supabase redirect URLs

In:

```text
Supabase → Authentication → URL Configuration
```

Keep the live Site URL, and make sure these are allowed:

```text
http://localhost:3000/auth/confirm
https://YOUR-VERCEL-SITE.vercel.app/auth/confirm
```

Your environment variables must include:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For Vercel Production, `NEXT_PUBLIC_SITE_URL` must use the live HTTPS address instead.

## 9. Test locally

Restart Next.js after copying the route files or changing environment variables:

```powershell
npm run dev
```

Test these pages:

```text
http://localhost:3000/admin/players
http://localhost:3000/forgot-password
http://localhost:3000/update-password
```

### Player management test

1. Edit a player's full name or initials.
2. Deactivate the player.
3. Confirm the player disappears from active standings and cannot submit predictions.
4. Reactivate the player.
5. Use permanent deletion only on a disposable test participant.

### Password-reset test

1. Sign out.
2. Open `/forgot-password`.
3. Enter a real registered email.
4. Open the reset email.
5. Set a new password.
6. Sign out and sign in with the new password.

## 10. Commit to your working branch

From the outer folder that contains `.git`:

```powershell
git add .
git commit -m "Add player management and password reset"
git push
```

Merge the working branch into `main` only after the local tests pass.

## Important behaviour

- **Deactivate** preserves predictions and points.
- **Reactivate** works only while fewer than 20 active places are filled.
- **Permanent delete** removes the participant, predictions, and score events.
- Permanent deletion does **not** delete the Supabase Authentication account.
- A password reset verifies the emailed recovery token before allowing a new password.
