# Barangay Incident Reporting and Management System

A frontend prototype for the proposed Barangay Incident Reporting and Management System.

## Files

- `index.html` - main HTML entry point
- `assets/style.css` - complete CSS styling
- `assets/app.js` - complete JavaScript application logic
- `API-INTEGRATION-NOTES.md` - guide for connecting PHP + MySQL later

## Run immediately

### Option 1: Open directly
Double-click `index.html`.

### Option 2: Use a local server (recommended)
If PHP is installed:

```bash
php -S localhost:8000
```

Then open:

`http://localhost:8000`

If you have VS Code, you can also use a Live Server extension.

## Database setup

The PHP API reads database settings from the project-root `.env` file. For a default XAMPP MySQL installation, use `127.0.0.1`, port `3306`, user `root`, and an empty password. For MAMP, use the host, port, and credentials configured in MAMP. Create/import the `barangay_data` database using `database/schema.sql` before registering accounts.

Apache-provided environment variables take precedence over values in `.env`. Keep `.env` private; it contains database credentials and other server-side secrets.

## Demo accounts

    Demo Accounts: wayne@gmail.com 
    Password: wayne123

     Admin: admin@barangay.gov 
    Password: admin123

    Super Admin: superadmin@barangay.gov
    Password: superadmin123

## What already works

- Login/logout
- Resident dashboard
- Incident reporting
- Mobile camera/photo upload
- Photo preview
- Browser geolocation
- Incident categories
- Server-side AI incident priority recommendation (Gemini API)
- Resident report tracking
- Admin dashboard
- Search and filters
- Human verification of AI priority
- Official priority/status changes
- Incident history/audit trail
- Responsive mobile layout
- localStorage UI/session cache

## Important

Incident reports are submitted to the PHP/MySQL API. PHP sends only the incident category and description to the Gemini API for a suggested priority; report photos, location, and reporter details are not sent. The AI result remains a recommendation, and an authorized barangay official must verify the official priority.

Set `GEMINI_API_KEY`, `TURNSTILE_SECRET`, and `TURNSTILE_HOSTNAMES` in the project `.env` file or hosting environment. `GEMINI_MODEL` is optional and defaults to `gemini-3.1-flash-lite`. Never put secret keys in frontend code or commit them to the project.
