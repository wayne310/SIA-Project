# PHP + MySQL Integration Notes

The PHP/MySQL API handles login, registration, and incident submission. The browser keeps some UI and session state in localStorage, while incident records are submitted to the API.

Available endpoints:

- `POST /api/login.php`
- `POST /api/logout.php`
- `POST /api/register.php`
- `GET /api/incidents.php`
- `POST /api/incidents.php`
- `DELETE /api/incidents.php?id={id}` (admin only)
- `POST /api/incidents/suggest.php?id={id}` (admin only; generates and stores an AI suggestion)
- `GET /api/incidents/{id}.php`
- `PUT /api/incidents/{id}.php`

Incident fields used by the API:

- `incident_id`
- `user_id`
- `category_id`
- `description`
- `location`
- `latitude`
- `longitude`
- `ai_priority`
- `verified_priority`
- `verification_status`
- `status_id`
- `created_at`
- `updated_at`

Do not trust role information sent by the browser. The PHP backend must authenticate the session/token and check that only authorized officials can verify or change an incident's official priority.

## Existing database migration

For an existing database, run `database/migration_registration_and_history.sql` once after backing up the database. It adds the registration fields and incident history table. New installations can use `database/schema.sql`.

## Turnstile local configuration

The registration, login, and incident-creation endpoints require Cloudflare Siteverify. Configure these values in the MAMP/Apache server environment, then restart MAMP:

- `TURNSTILE_SECRET` - the widget secret key; keep it out of frontend code and version control.
- `TURNSTILE_HOSTNAMES` - `localhost,127.0.0.1` for local testing.

The public site key is configured in `assets/app.js`. For production, configure the production hostname separately; do not include local hostnames in the production backend's allowlist. Incident photos are stored in `api/uploads/incidents` and are served through the authenticated `api/photo.php` endpoint.

The API revokes sessions on logout. Only admins can change incident status or verification; residents may edit descriptive fields only on their own reports. Status and verification updates are recorded in the incident history table. Resident report submission does not call Gemini; an admin explicitly requests an AI suggestion while reviewing a saved report.

## Gemini API configuration

Incident priority is classified in PHP through the Gemini API. Configure these values in the project `.env` file or the hosting environment:

- `GEMINI_API_KEY` - the Gemini API key; keep it server-side and out of version control.
- `GEMINI_MODEL` - optional model override; defaults to `gemini-3.1-flash-lite`.

When an admin requests a suggestion, only the saved incident category and description are sent to Gemini. The browser cannot provide or set the suggestion. The result remains a recommendation until an authorized official selects and saves the official priority. See the [Gemini API structured output guide](https://ai.google.dev/gemini-api/docs/structured-output).
