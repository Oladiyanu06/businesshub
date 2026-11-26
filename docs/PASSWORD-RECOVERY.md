# Password recovery

Three routes exist, in order of reliability for the pilot phase.

## 1. Staff password reset (inside a business)

Who: any employee with `employee.manage` (Business Administrator by default).

1. Open **Employees** and select the employee.
2. Choose **Reset password**.
3. The app generates a 16-character temporary password and shows it **once**.
4. Send it through a secure channel.
5. The employee signs in with it and is forced to `/change-password` before
   they can use the workspace.

The reset also sets `employees.must_change_password = true`. The temporary
password is not stored in plain text anywhere.

## 2. Self-service reset (email link)

Who: any user who can receive email at the address on their account, including
a Business Administrator.

1. On `/login`, choose **Forgot your password?**
2. Enter the account email. The response is always the same, whether or not the
   address exists, so the form cannot be used to discover accounts.
3. The email link returns to `/auth/confirm`, which establishes a short-lived
   session and sets a signed, HTTP-only `bh_recovery` cookie (15 minutes).
4. `/change-password` then asks only for the new password. The current password
   is not required because control of the email address has already been
   proved.
5. After the change the cookie is cleared. Every other change-password flow
   still requires the current password.

A recovery session works for tenant employees and platform administrators.
Suspended or terminated employees can reset their password but still cannot
sign in, because the login check reads their employment status.

### Required Supabase configuration

**Allowed redirect URLs** — Authentication → URL Configuration:

```
http://localhost:3000/**
https://businesshub-pi.vercel.app/**
https://your-custom-domain.com/**
```

Set the **Site URL** to the production origin. Without this, Supabase may send
the link to the wrong host.

**Email template (recommended, works on any device)** — Authentication →
Emails → Reset password. Replace the body with a link that uses the token hash:

```html
<h2>Reset your BUSINESSHUB password</h2>
<p>Follow this link to choose a new password:</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/change-password">
    Set a new password
  </a>
</p>
<p>This link expires in one hour. If you did not request it, ignore this email.</p>
```

The default template also works, but only in the same browser that requested
the reset: it uses PKCE, and the verifier is a cookie. `/auth/confirm` accepts
both `?token_hash=` and `?code=`.

**Custom SMTP (needed before promising self-service)** — Authentication →
Emails → SMTP Settings. Supabase's built-in sender is rate-limited to a few
messages per hour and is not suitable for production. Use a transactional
provider (Resend, Brevo, Postmark or Amazon SES), verify the sending domain
with SPF and DKIM, and send one test message before announcing the feature.

**Optional secret** — `PASSWORD_RECOVERY_SECRET` signs the recovery cookie. If
unset, the service-role key is used. Set a separate random value in production
when convenient; changing it only invalidates links already in progress.

## 3. Platform reset (locked-out Business Administrator)

Who: the platform administrator.

1. Open **Platform → Businesses → [business]**.
2. In **Administrators**, choose **Reset** on the right.
3. Send the temporary password shown once to the administrator.
4. They sign in and must choose a new password before continuing.

The action verifies that the employee is one of that business's administrators,
then uses the service role for the Auth update. It records
`platform.administrator_password_reset` in the platform audit trail (visible to
platform administrators only). It does **not** grant access to tenant records,
and it does not reactivate a suspended account.

## Test checklist

Run locally with `npm run dev` and a real Supabase project.

1. **Staff reset** — as an administrator, reset an employee. Sign in with the
   temporary password; confirm the forced change screen and that the old
   password no longer works.
2. **Self-service, same browser** — request a reset, open the link in the same
   browser. Confirm the new password works and the old one fails.
3. **Self-service, other device** — after installing the token-hash template,
   request on one device and open on another. It must still work.
4. **Expired or reused link** — open the link twice. The second attempt should
   land on `/login?error=expired_link`.
5. **Unknown email** — request a reset for an address with no account. The page
   must show the same confirmation message.
6. **Cookie scope** — a `bh_recovery` cookie issued for one user must not be
   accepted for another. Covered by `tests/recovery-token.test.ts`.
7. **Current-password flows** — a normal change and a forced first-sign-in
   change must still require the current password.

## Support script (WhatsApp)

> Hello [Name]. I have reset your administrator password. Temporary password:
> [password]. You will be asked to choose a new one when you sign in. Please do
> that immediately and do not forward this message. Tell me once you are in.

## Limits to state honestly

- Email delivery depends on the SMTP provider. Until custom SMTP is configured,
  use the platform reset.
- The recovery cookie lasts 15 minutes. If the user abandons the form, request a
  new link.
- A password reset does not change roles, branch assignments or account status.
