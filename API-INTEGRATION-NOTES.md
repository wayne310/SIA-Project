# PHP + MySQL Integration Notes

The PHP/MySQL API handles login, registration, and incident submission. The browser keeps some UI and session state in localStorage, while incident records are submitted to the API.

Suggested endpoints:

- `POST /api/login.php`
- `POST /api/register.php`
- `GET /api/incidents.php`
- `POST /api/incidents.php`
- `GET /api/incidents/{id}.php`
- `PUT /api/incidents/{id}.php`
- `POST /api/incidents/{id}/verify.php`

Suggested MySQL incident fields:

- `id`
- `reporter_id`
- `category`
- `description`
- `location`
- `latitude`
- `longitude`
- `photo_path`
- `ai_priority`
- `verified_priority`
- `verification_status`
- `incident_status`
- `created_at`
- `updated_at`

Do not trust role information sent by the browser. The PHP backend must authenticate the session/token and check that only authorized officials can verify or change an incident's official priority.

## Turnstile local configuration

The registration, login, and incident-creation endpoints require Cloudflare Siteverify. Configure these values in the MAMP/Apache server environment, then restart MAMP:

- `TURNSTILE_SECRET` - the widget secret key; keep it out of frontend code and version control.
- `TURNSTILE_HOSTNAMES` - `localhost,127.0.0.1` for local testing.

The public site key is configured in `assets/app.js`. For production, configure the production hostname separately; do not include local hostnames in the production backend's allowlist. Incident photos are stored in `api/uploads/incidents` and are served through the authenticated `api/photo.php` endpoint.

## Gemini API configuration

Incident priority is classified in PHP through the Gemini API. Configure these values in the project `.env` file or the hosting environment:

- `GEMINI_API_KEY` - the Gemini API key; keep it server-side and out of version control.
- `GEMINI_MODEL` - optional model override; defaults to `gemini-3.1-flash-lite`.

Only the incident category and description are sent to Gemini. The browser-provided priority is ignored, and the result is stored as an AI recommendation for an authorized official to review. See the [Gemini API structured output guide](https://ai.google.dev/gemini-api/docs/structured-output).
