# Savora password reset with email passcodes

Password recovery now uses a **six-digit emailed code**, not a clickable link. Users return to the Savora page already open on their computer and enter the code with a new password. They can read the email on another device; there is no localhost URL to open.

## Update an existing installation

1. If password recovery was not set up before, first run `docs/database/003_password_recovery.sql` in Supabase SQL Editor.
2. Run `docs/database/004_password_reset_codes.sql` once. It adds a persistent failed-attempt counter and retires old reset links. Apply this **before restarting the updated backend**. Existing user accounts are preserved.
3. Keep the existing Gmail/SMTP settings in `backend/.env`. No new email credentials are needed.
4. Stop the running Savora Java backend with Ctrl+C and start it again from backend/:

```powershell
& "C:\Program Files\NetBeans-22\netbeans\java\maven\bin\mvn.cmd" spring-boot:run
```

5. Refresh the website using Ctrl+Shift+R. Only one backend should use port 8080 at a time.

## User flow

1. Open **Log in → Forgot password?**
2. Enter the email registered with Savora and choose **Send reset code**.
3. Check the inbox/spam folder for a six-digit code.
4. Return to Savora. Enter the code, a new password of at least 12 characters, and its confirmation.
5. Choose **Reset password**, then sign in with the new password.

Codes expire after **10 minutes** and work once. Five incorrect guesses disable that code. Resend is available after 60 seconds; a new code replaces previous codes. Use **Change email** to correct the address, or **I already have a code** to continue after reopening the reset form. Enter the same email the code was sent to.

## First-time email setup

Add the sender's SMTP settings to `backend/.env`, keeping the existing database settings:

```properties
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-sender@gmail.com
MAIL_PASSWORD=your_google_app_password
MAIL_FROM=Savora <your-sender@gmail.com>
MAIL_AUTH=true
MAIL_STARTTLS=true
```

Use an account you control, with a Google app password rather than its normal login password. For other providers, use their SMTP host, credentials and authorized sender. Never commit `.env` or share passwords or reset codes. The application reports that recovery is unavailable if email is not configured.

## Security and operations

- Codes are generated with SecureRandom and stored only as salted BCrypt hashes in the existing `token_hash` field. Codes are never logged or returned through the API.
- Each code belongs to one account. Expiry, consumed state, credential version and the failed-attempt count are checked in a transaction while locking the account against concurrent resets.
- Failed guesses commit their counters even though the API returns a validation error, so restarting Java does not reset the five-attempt limit.
- Password changes invalidate the code, other outstanding codes and existing login sessions. Users sign in again afterward.
- Public responses do not reveal whether the email is registered. Sending and verification also have source-address limits of eight attempts per fifteen minutes, per Java instance. Public deployments with multiple servers need shared source-address rate limiting.
- SMTP failure rolls back code issuance, preserving the prior code. Existing RLS keeps reset records private from browser Supabase Data API roles.
- Existing reset links are no longer accepted. Clean up expired/used records according to your retention policy.

## Validation

Run `mvn test` in backend/ and `npm run build` in frontend/. Tests use H2 and a mocked sender and cover expiry, reuse, wrong email, attempt lockout, resending, SMTP failures, validation and session invalidation. No live emails or database migrations are performed by these checks. Complete the real inbox/code/reset flow after applying the migration and configuring SMTP.
