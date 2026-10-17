/*
  Barangay Incident Reporting and Management System

  ERD-aligned frontend data model for a localStorage prototype.
  This keeps the same features but stores data in normalized tables:
  - users
  - user_sessions
  - categories
  - status
  - incidents
  - incident_photos
*/

const API_BASE = window.location.port === "5500"
  ? "http://localhost/SIA_PROJECT_BRGY/api"
  : "api";
const priorities = ["Low", "Medium", "High", "Critical"];
const TURNSTILE_SITE_KEY = "0x4AAAAAAFFZVTZAudIVH7jB";
const turnstileWidgets = {};

function displayName(user = {}) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.full_name || user.name || "User";
}

function roleLabel(user = {}) {
  const role = String(user.role || "resident").toLowerCase();
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Resident";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(`${API_BASE}/${url.replace(/^\/+/, "")}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : { message: await response.text() };

  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Request failed");
  }

  return payload;
}

function currentToken() {
  const user = JSON.parse(localStorage.getItem("birms_user") || "null");
  return user && user.token ? user.token : "";
}

const STORAGE_KEYS = {
  currentUser: "birms_user",
  users: "birms_users",
  userSessions: "birms_user_sessions",
  categories: "birms_categories",
  incidents: "birms_incidents",
  status: "birms_status",
  incidentPhotos: "birms_incident_photos"
};

const app = document.getElementById("app");

const SITE_INFORMATION_CONTENT = [
  "Disclaimer: This website is for demonstration and academic purposes only as part of an SIA subject project. It does not represent a real company, official service, or legal business entity. No real commercial operations or claims are made.",
  "This website allows users to submit messages that may be displayed publicly. We respect your privacy and are committed to handling personal information responsibly.",
  "1. Information we collect",
  "We may collect the following information when you use the website:",
  "- Messages submitted by users",
  "- Date and time of each message",
  "- IP address, browser information, and device information for security and moderation",
  "- Server logs and error records",
  "- Any information you provide when contacting us",
  "2. How we use the information",
  "We use the information to operate and improve the website, detect spam or harmful content, maintain security, and comply with legal requirements.",
  "3. Public messages",
  "This website is a public message wall. Messages may appear publicly and may be stored on our server. Please do not submit names, contact details, addresses, phone numbers, or other sensitive personal information.",
  "4. Data retention",
  "We may keep messages, logs, and related records for as long as necessary to operate the website, protect users, and comply with legal obligations. We may remove content that is harmful, unlawful, or inappropriate.",
  "5. Security",
  "We take reasonable steps to protect information from unauthorized access, misuse, or loss. However, no internet service is completely secure, and we cannot guarantee absolute security.",
  "6. Third-party services",
  "We may use hosting, analytics, or other third-party services to support the website. These services may process personal information according to their own privacy policies.",
  "7. Cookies",
  "We may use cookies or similar technologies to improve website performance, support functionality, and understand traffic patterns. You may disable cookies in your browser settings, but some features may not work properly.",
  "8. Your rights",
  "Depending on your location, you may have the right to request access to, correction of, or deletion of your personal data. If you want a message removed or have a privacy question, contact us using the details below.",
  "9. Changes to this policy",
  "We may update this policy from time to time. Any changes will be posted on this page with a new date.",
  "10. Contact",
  "If you have questions about this Privacy Policy, contact:",
  "Message Wall Project",
  "Email: arguellesjc.384.stud@cdd.edu.ph",
  "Website: [your website URL]"
];

const SITE_INFORMATION = {
  "privacy-policy": {
    title: "Privacy Policy",
    paragraphs: SITE_INFORMATION_CONTENT
  },
  terms: {
    title: "Terms",
    paragraphs: SITE_INFORMATION_CONTENT
  },
  moderation: {
    title: "Moderation",
    paragraphs: SITE_INFORMATION_CONTENT
  },
  copyright: {
    title: "Copyright",
    paragraphs: SITE_INFORMATION_CONTENT
  }
};

const DEFAULT_CATEGORIES = [
  { category_id: 1, category_name: "Fire", description: "Emergency fire incidents", created_at: "" },
  { category_id: 2, category_name: "Accident", description: "Vehicle or personal accident", created_at: "" },
  { category_id: 3, category_name: "Flooding", description: "Flooded roads or crossings", created_at: "" },
  { category_id: 4, category_name: "Garbage", description: "Illegal dumping or trash accumulation", created_at: "" },
  { category_id: 5, category_name: "Traffic", description: "Traffic obstruction or road issue", created_at: "" },
  { category_id: 6, category_name: "Road Obstruction", description: "Blockages on roads or pathways", created_at: "" },
  { category_id: 7, category_name: "Other", description: "Other barangay concerns", created_at: "" }
];

const DEFAULT_STATUS = [
  { status_id: 1, status_name: "Submitted", description: "New report submitted", created_at: "" },
  { status_id: 2, status_name: "Under Review", description: "Assigned for review", created_at: "" },
  { status_id: 3, status_name: "Verified", description: "Official priority reviewed", created_at: "" },
  { status_id: 4, status_name: "In Progress", description: "Barangay action started", created_at: "" },
  { status_id: 5, status_name: "Resolved", description: "Incident addressed", created_at: "" },
  { status_id: 6, status_name: "Problem Solved", description: "Incident problem has been solved", created_at: "" }
];

let state = {
  user: JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || "null"),
  page: "dashboard",
  selectedId: null,
  mobileNav: false,
  users: readCollection(STORAGE_KEYS.users, []),
  userSessions: readCollection(STORAGE_KEYS.userSessions, []),
  categories: readCollection(STORAGE_KEYS.categories, []),
  incidents: readCollection(STORAGE_KEYS.incidents, []),
  status: readCollection(STORAGE_KEYS.status, []),
  incidentPhotos: readCollection(STORAGE_KEYS.incidentPhotos, [])
};

function readCollection(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    return Array.isArray(value) ? value : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeCollection(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function save() {
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(state.user));
  writeCollection(STORAGE_KEYS.users, state.users);
  writeCollection(STORAGE_KEYS.userSessions, state.userSessions);
  writeCollection(STORAGE_KEYS.categories, state.categories);
  writeCollection(STORAGE_KEYS.incidents, state.incidents);
  writeCollection(STORAGE_KEYS.status, state.status);
  writeCollection(STORAGE_KEYS.incidentPhotos, state.incidentPhotos);
}

async function loadMeta() {
  try {
    const data = await fetchJson("meta.php");
    if (Array.isArray(data.categories)) state.categories = data.categories;
    if (Array.isArray(data.status)) state.status = data.status;
    save();
  } catch (error) {
    seedData();
  }
}

async function loadIncidents() {
  try {
    const token = currentToken();
    const data = await fetchJson(`incidents.php?token=${encodeURIComponent(token)}`);
    state.incidents = Array.isArray(data.incidents) ? data.incidents : [];
    state.incidentPhotos = state.incidents.flatMap(item => Array.isArray(item.photos) ? item.photos : []);
    save();
  } catch (error) {
    state.incidents = [];
    state.incidentPhotos = [];
  }
}

async function loadUsers() {
  const data = await fetchJson(`users.php?token=${encodeURIComponent(currentToken())}`);
  state.users = Array.isArray(data.users) ? data.users : [];
}

function generateId(prefix, collection, idField) {
  const numbers = collection.map(item => Number(item[idField]) || 0);
  const next = Math.max(0, ...numbers) + 1;
  return `${prefix}-${next}`;
}

function createTimestamp() {
  return new Date().toISOString();
}

function getCategoryRow(categoryId) {
  return state.categories.find(item => Number(item.category_id) === Number(categoryId));
}

function getStatusRow(statusId) {
  return state.status.find(item => Number(item.status_id) === Number(statusId));
}

function getUserById(userId) {
  return state.users.find(item => Number(item.user_id) === Number(userId));
}

function getUserSessionsForUser(userId) {
  return state.userSessions.filter(item => Number(item.user_id) === Number(userId));
}

function normalizeIncident(incident) {
  const reporter = getUserById(incident.user_id);
  const category = getCategoryRow(incident.category_id);
  const statusRow = getStatusRow(incident.status_id);
  const photos = state.incidentPhotos.filter(item => Number(item.incident_id) === Number(incident.incident_id));
  const firstPhoto = photos[0];
  const history = Array.isArray(incident.history) && incident.history.length
    ? incident.history
    : [{ action: "Report submitted", by: reporter ? displayName(reporter) : (incident.reporter_name || "Resident"), at: incident.created_at }];

  return {
    id: String(incident.incident_id || incident.id || ""),
    incident_id: incident.incident_id || incident.id,
    user_id: incident.user_id,
    reporter: reporter ? displayName(reporter) : (incident.reporter_name || "Unknown Resident"),
    reporterEmail: reporter ? reporter.email : "",
    category: category ? category.category_name : "Unknown",
    category_id: incident.category_id,
    description: incident.description,
    location: incident.location,
    lat: incident.latitude,
    lng: incident.longitude,
    photo: firstPhoto
      ? (firstPhoto.photo_id
        ? `${API_BASE}/photo.php?photo_id=${encodeURIComponent(firstPhoto.photo_id)}&token=${encodeURIComponent(currentToken())}`
        : firstPhoto.photo_path || "")
      : incident.photo_path || "",
    aiPriority: incident.ai_priority || "Medium",
    verifiedPriority: incident.verified_priority || null,
    verification: incident.verification_status || "Pending",
    status: statusRow ? statusRow.status_name : "Submitted",
    status_id: incident.status_id,
    createdAt: incident.created_at,
    history,
    created_at: incident.created_at
  };
}

function getIncidentListForUser(userId) {
  return state.incidents
    .filter(item => Number(item.user_id) === Number(userId))
    .map(normalizeIncident);
}

function getAllIncidents() {
  return state.incidents.map(normalizeIncident);
}

function getIncidentById(id) {
  const incident = state.incidents.find(item => String(item.incident_id) === String(id) || String(item.id) === String(id));
  return incident ? normalizeIncident(incident) : null;
}

function seedData() {
  if (state.categories.length && state.status.length && state.users.length) return;

  const now = createTimestamp();

  state.categories = DEFAULT_CATEGORIES.map(item => ({ ...item, created_at: item.created_at || now }));
  state.status = DEFAULT_STATUS.map(item => ({ ...item, created_at: item.created_at || now }));

  state.users = [
    {
      user_id: 1,
      first_name: "Barangay",
      last_name: "Admin",
      email: "admin@barangay.gov",
      password: "admin123",
      role: "admin",
      created_at: now
    },
    {
      user_id: 2,
      first_name: "Juan",
      last_name: "Dela Cruz",
      email: "resident@example.com",
      password: "123456",
      role: "resident",
      created_at: now
    }
  ];

  state.userSessions = [
    {
      session_id: "SES-1",
      user_id: 1,
      token: "admin-demo-session",
      login_time: now,
      logout_time: null
    }
  ];

  state.incidents = [
    {
      incident_id: 1,
      user_id: 2,
      category_id: 3,
      description: "Water is rising near the barangay road after heavy rain.",
      location: "Purok 2, Barangay Main",
      latitude: "",
      longitude: "",
      photo_path: "",
      ai_priority: "High",
      verified_priority: null,
      verification_status: "Pending",
      status_id: 2,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      history: [{ action: "Report submitted", by: "Juan Dela Cruz", at: new Date(Date.now() - 3600000).toISOString() }]
    },
    {
      incident_id: 2,
      user_id: 2,
      category_id: 4,
      description: "Garbage has accumulated beside the covered court.",
      location: "Purok 4, Barangay Main",
      latitude: "",
      longitude: "",
      photo_path: "",
      ai_priority: "Medium",
      verified_priority: "Medium",
      verification_status: "Verified",
      status_id: 4,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      history: [
        { action: "Report submitted", by: "Juan Dela Cruz", at: new Date(Date.now() - 86400000).toISOString() },
        { action: "Priority verified as Medium", by: "Barangay Admin", at: new Date(Date.now() - 80000000).toISOString() },
        { action: "Status changed to In Progress", by: "Barangay Admin", at: new Date(Date.now() - 60000000).toISOString() }
      ]
    },
    {
      incident_id: 3,
      user_id: 2,
      category_id: 6,
      description: "A fallen branch is blocking one side of the road.",
      location: "Purok 1, Barangay Main",
      latitude: "",
      longitude: "",
      photo_path: "",
      ai_priority: "Low",
      verified_priority: "Low",
      verification_status: "Verified",
      status_id: 5,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      history: [
        { action: "Report submitted", by: "Juan Dela Cruz", at: new Date(Date.now() - 3 * 86400000).toISOString() },
        { action: "Priority verified as Low", by: "Barangay Admin", at: new Date(Date.now() - 2.8 * 86400000).toISOString() },
        { action: "Status changed to Problem Solved", by: "Barangay Admin", at: new Date(Date.now() - 2 * 86400000).toISOString() }
      ]
    }
  ];

  state.incidentPhotos = [];
  save();
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function dateTime(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

function badge(text, type = text) {
  const cls = String(type).toLowerCase().replaceAll(" ", "-");
  return `<span class="badge badge-${esc(cls)}">${esc(text)}</span>`;
}

function priorityBadge(p) {
  return p ? badge(p, p) : `<span class="badge badge-submitted">Pending</span>`;
}

function isAdmin() {
  return state.user && String(state.user.role).toLowerCase() === "admin";
}

function isSuperAdmin() {
  return state.user && String(state.user.role).toLowerCase() === "super_admin";
}

async function render() {
  const infoSlug = window.location.hash.slice(1);
  if (Object.hasOwn(SITE_INFORMATION, infoSlug)) {
    renderInformationPage(infoSlug);
    return;
  }

  if (!state.user) {
    renderLogin();
    return;
  }

  await loadMeta();
  if (!isSuperAdmin()) await loadIncidents();
  renderShell();
  renderPage();
}

function renderTurnstileWidget(name, action) {
  const container = document.getElementById(`turnstile-${name}`);
  if (!container) return;
  if (!window.turnstile) {
    container.textContent = "Security check could not load. Refresh and try again.";
    return;
  }

  turnstileWidgets[name] = window.turnstile.render(container, {
    sitekey: TURNSTILE_SITE_KEY,
    action,
    callback: token => {
      const field = document.getElementById(`turnstile-${name}-token`);
      if (field) field.value = token;
    },
    "expired-callback": () => resetTurnstile(name),
    "error-callback": () => {
      const field = document.getElementById(`turnstile-${name}-token`);
      if (field) field.value = "";
    }
  });
}

function removeTurnstileWidgets() {
  if (window.turnstile) {
    Object.values(turnstileWidgets).forEach(widget => {
      try {
        window.turnstile.remove(widget);
      } catch (error) {
        // The widget may already have been removed by Turnstile.
      }
    });
  }
  Object.keys(turnstileWidgets).forEach(name => delete turnstileWidgets[name]);
}

function resetTurnstile(name) {
  const widget = turnstileWidgets[name];
  if (window.turnstile && widget !== undefined) window.turnstile.reset(widget);
  const field = document.getElementById(`turnstile-${name}-token`);
  if (field) field.value = "";
}

function renderAuthFooter() {
  return `
    <footer class="auth-footer">
      <div class="auth-disclaimer"><strong>Disclaimer:</strong> This website is created for demonstration and academic purposes only as part of an SIA subject project. It is not a real company, official service, registered business, or commercial website. No claims are made regarding actual business operations, legal standing, or real-world services.</div>
      <nav class="auth-footer-links" aria-label="Site information">
        <a href="#privacy-policy">Privacy Policy</a>
        <a href="#terms">Terms</a>
        <a href="#moderation">Moderation</a>
        <a href="#copyright">Copyright</a>
      </nav>
      <p class="auth-copyright">&copy; ${new Date().getFullYear()} Barangay Incident Reporting System</p>
    </footer>`;
}

function renderInformationPage(slug) {
  if (!Object.hasOwn(SITE_INFORMATION, slug)) return;
  const page = SITE_INFORMATION[slug];

  removeTurnstileWidgets();
  app.innerHTML = `
    <main class="information-page">
      <article class="information-document">
        <a class="information-back" href="#">&#8592; Back to Sign In</a>
        <p class="information-kicker">Site Information</p>
        <h1>${esc(page.title)}</h1>
        ${page.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join("")}
        <nav class="information-links" aria-label="Other site information">
          <a href="#privacy-policy">Privacy Policy</a>
          <a href="#terms">Terms</a>
          <a href="#moderation">Moderation</a>
          <a href="#copyright">Copyright</a>
        </nav>
      </article>
    </main>`;
}

function renderLogin() {
  removeTurnstileWidgets();
  app.innerHTML = `
    <div class="login-page auth-page">
      <div class="auth-layout">
        <section class="auth-aside">
          <div class="auth-brand"><span>🏛️</span><strong>Barangay Connect</strong></div>
          <div class="auth-aside-copy">
            <span class="eyebrow">SAFER · STRONGER · TOGETHER</span>
            <h2>Every voice<br>helps our community.</h2>
            <p>Report local concerns, follow their progress, and help your barangay respond where it matters.</p>
          </div>
          <div class="auth-aside-note"><span>✦</span> One community. A better response.</div>
        </section>
        <section class="auth-panel">
      <div class="login-box">
        <div class="login-header">
          <div class="login-logo">🏛️</div>
          <span class="eyebrow">WELCOME BACK</span>
          <h1>Sign in to your account</h1>
          <p>Incident Reporting and Management System</p>
        </div>
        <div class="card auth-card">
          <div id="loginAlert"></div>
          <form id="loginForm">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input id="email" type="email" required placeholder="resident@example.com">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input id="password" type="password" required placeholder="Enter password">
            </div>
            <div class="form-group">
              <div id="turnstile-login"></div>
              <input id="turnstile-login-token" type="hidden">
            </div>
            <button class="btn btn-primary auth-submit">Login to your account</button>
          </form>
          <div class="auth-switch"><span>New to the community?</span><button id="signupButton" class="btn btn-secondary">Create account</button></div>
          <div class="alert alert-info auth-demo">
            Demo Accounts: <strong>wayne@gmail.com</strong> / <strong>wayne123</strong><br>
            Admin: <strong>admin@barangay.gov</strong> / <strong>admin123</strong> <br>
            Super Admin: <strong>superadmin@barangay.gov</strong> / <strong>superadmin123</strong>
          </div>
          <p class="footer-note">AI priority is only a recommendation; an authorized barangay official makes the final decision.</p>
        </div>
      </div>
        </section>
      </div>
      ${renderAuthFooter()}
    </div>`;
  renderTurnstileWidget("login", "login");
  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("signupButton").addEventListener("click", renderSignup);
}

function renderSignup() {
  removeTurnstileWidgets();
  app.innerHTML = `
    <div class="login-page auth-page">
      <div class="auth-layout auth-layout-signup">
        <section class="auth-aside">
          <div class="auth-brand"><span>🏛️</span><strong>Barangay Connect</strong></div>
          <div class="auth-aside-copy">
            <span class="eyebrow">JOIN YOUR COMMUNITY</span>
            <h2>Let's make a<br>difference locally.</h2>
            <p>Create your resident account to report concerns and stay informed as your barangay takes action.</p>
          </div>
          <div class="auth-aside-note"><span>✦</span> Your neighborhood. Your voice.</div>
        </section>
        <section class="auth-panel auth-panel-signup">
      <div class="login-box signup-box">
        <div class="login-header">
          <span class="eyebrow">RESIDENT REGISTRATION</span>
          <h1>Create your account</h1>
          <p>It only takes a moment to get started.</p>
        </div>
        <div class="card auth-card">
          <form id="signupForm">
            <div class="grid grid-2 signup-fields">
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input id="signupFirstName" type="text" required placeholder="Enter first name">
              </div>
              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input id="signupLastName" type="text" required placeholder="Enter last name">
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input id="signupEmail" type="email" required placeholder="Enter your email">
              </div>
              <div class="form-group">
                <label class="form-label">Contact Number</label>
                <input id="signupPhone" type="tel" required placeholder="Enter contact number">
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <input id="signupPassword" type="password" minlength="6" required placeholder="Enter password">
              </div>
              <div class="form-group">
                <label class="form-label">Confirm Password</label>
                <input id="signupConfirm" type="password" minlength="6" required placeholder="Confirm password">
              </div>
              <div class="form-group signup-field-wide">
                <label class="form-label">House No. / Street / Sitio / Purok <span class="required">*</span></label>
                <input id="signupStreet" type="text" required placeholder="e.g. #123 Street St., Sitio Uno">
              </div>
              <div class="form-group">
                <label class="form-label">Barangay <span class="required">*</span></label>
                <input id="signupBarangay" type="text" required placeholder="e.g. Barangay Lucao">
              </div>
              <div class="form-group">
                <label class="form-label">City / Municipality <span class="required">*</span></label>
                <input id="signupCity" type="text" required placeholder="e.g. Dagupan City">
              </div>
              <div class="form-group">
                <label class="form-label">Province <span class="required">*</span></label>
                <input id="signupProvince" type="text" required placeholder="e.g. Pangasinan">
              </div>
              <div class="form-group">
                <label class="form-label">Birthday</label>
                <input id="signupBirthday" type="date" required>
              </div>
              <div class="form-group signup-field-wide">
                <label class="form-label">Nationality</label>
                <input id="signupNationality" type="text" required placeholder="e.g. Filipino">
              </div>
              <div class="form-group signup-field-wide">
                <div id="turnstile-signup"></div>
                <input id="turnstile-signup-token" type="hidden">
              </div>
              <button class="btn btn-primary signup-field-wide signup-submit">Create Account</button>
            </div>
          </form>
          <button id="backToLogin" class="btn btn-secondary auth-back">Already have an account? Sign in</button>
        </div>
      </div>
        </section>
      </div>
      ${renderAuthFooter()}
    </div>`;

  renderTurnstileWidget("signup", "signup");
  document.getElementById("signupForm").addEventListener("submit", signup);
  document.getElementById("backToLogin").addEventListener("click", renderLogin);
}

async function signup(e) {
  e.preventDefault();

  const firstName = document.getElementById("signupFirstName").value.trim();
  const lastName = document.getElementById("signupLastName").value.trim();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;
  const confirm = document.getElementById("signupConfirm").value;
  const phone = document.getElementById("signupPhone").value.trim();
  const street = document.getElementById("signupStreet").value.trim();
  const barangay = document.getElementById("signupBarangay").value.trim();
  const city = document.getElementById("signupCity").value.trim();
  const province = document.getElementById("signupProvince").value.trim();
  const birthdayStr = document.getElementById("signupBirthday").value;
  const nationality = document.getElementById("signupNationality").value.trim();

  if (password !== confirm) {
    alert("Passwords do not match.");
    return;
  }

  if (!street || !barangay || !city || !province) {
    alert("Please complete all address fields (Street, Barangay, City, and Province).");
    return;
  }

  const birthDate = new Date(birthdayStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) {
    alert(`Registration Restricted: You must be at least 18 years old to register. (Current age: ${age})`);
    return;
  }

  try {
    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      phone,
      address: `${street}, ${barangay}, ${city}, ${province}`,
      birthday: birthdayStr,
      nationality,
      age,
      "cf-turnstile-response": document.getElementById("turnstile-signup-token").value
    };

    await fetchJson("register.php", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    alert("Account created successfully! You are verified 18+. You can now log in.");
    renderLogin();
  } catch (error) {
    resetTurnstile("signup");
    alert(error.message || "Registration failed.");
  }
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  try {
    const data = await fetchJson("login.php", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        "cf-turnstile-response": document.getElementById("turnstile-login-token").value
      })
    });

    state.user = {
      user_id: data.user.user_id,
      first_name: data.user.first_name,
      last_name: data.user.last_name,
      email: data.user.email,
      role: data.user.role,
      token: data.token
    };

    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(state.user));
    state.page = isSuperAdmin() ? "users" : (isAdmin() ? "admin" : "dashboard");
    await render();
  } catch (error) {
    resetTurnstile("login");
    document.getElementById("loginAlert").innerHTML = `<div class="alert alert-warning">${esc(error.message || "Invalid login details.")}</div>`;
  }
}

function renderShell() {
  removeTurnstileWidgets();
  const nav = isSuperAdmin() ? `
    <div class="nav-label">Super Admin</div>
    ${navButton("users", "👥", "Manage Users")}
  ` : isAdmin() ? `
    <div class="nav-label">Management</div>
    ${navButton("admin", "📊", "Dashboard")}
    ${navButton("reports", "📋", "Incident Reports")}
    ${navButton("verification", "✓", "Human Verification")}
  ` : `
    <div class="nav-label">Resident</div>
    ${navButton("dashboard", "🏠", "My Dashboard")}
    ${navButton("report", "📷", "Report Incident")}
    ${navButton("tracking", "🔎", "Track Reports")}
  `;
  const roleClass = isSuperAdmin() ? "super-admin-layout" : isAdmin() ? "admin-layout" : "resident-layout";
  const sidebarClass = isSuperAdmin() ? "super-admin-sidebar" : isAdmin() ? "admin-sidebar" : "resident-nav";
  const hasSidebar = isAdmin() || isSuperAdmin();

  app.innerHTML = `
    <header class="topbar ${isSuperAdmin() ? "super-admin-topbar" : ""}">
      <div class="brand">
        <div class="brand-icon">🏛️</div>
        <div>Barangay Incident System<small>Incident Reporting & Management</small></div>
      </div>
      <div class="topbar-actions">
        <span class="user-pill">${esc(displayName(state.user))} · ${roleLabel(state.user)}</span>
        ${hasSidebar ? `<button class="btn btn-secondary btn-sm mobile-menu" id="menuBtn" aria-expanded="false" aria-controls="sidebar">☰ Menu</button>` : ""}
        <button class="btn btn-secondary btn-sm" id="logoutBtn">Logout</button>
      </div>
    </header>
    <div class="layout ${roleClass}">
      <aside class="sidebar ${sidebarClass}" id="sidebar" aria-label="${isAdmin() ? "Admin" : isSuperAdmin() ? "Super admin" : "Resident"} navigation">${nav}</aside>
      <main class="main" id="main"></main>
    </div>
    <div id="toast" class="toast"></div>`;

  document.getElementById("logoutBtn").onclick = () => {
    state.user = null;
    save();
    render();
  };

  const menu = document.getElementById("menuBtn");
  if (menu) {
    menu.onclick = () => {
      const isOpen = document.getElementById("sidebar").classList.toggle("open");
      menu.setAttribute("aria-expanded", String(isOpen));
    };
  }
}

function navButton(page, icon, label) {
  return `<button class="nav-btn ${state.page === page ? "active" : ""}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`;
}

function renderPage() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.onclick = () => {
      state.page = btn.dataset.page;
      renderShell();
      renderPage();
    };
  });

  if (isSuperAdmin()) {
    renderSuperAdminDashboard();
  } else if (isAdmin()) {
    if (state.page === "reports") renderAdminReports();
    else if (state.page === "verification") renderVerification();
    else renderAdminDashboard();
  } else {
    if (state.page === "report") renderReportForm();
    else if (state.page === "tracking") renderTracking();
    else if (state.page === "details") renderResidentDetails(state.selectedId);
    else renderResidentDashboard();
  }
}

function renderSuperAdminDashboard() {
  document.getElementById("main").innerHTML = `
    <div class="dashboard-heading super-heading">
      <div><span class="eyebrow">SYSTEM CONTROL</span><h1 class="page-title">Super Admin Dashboard</h1>
      <p class="page-subtitle">Manage administrator accounts and system users.</p></div>
      <span class="heading-mark" aria-hidden="true">✦</span>
    </div>
    <section class="card super-admin-actions">
      <h2>Actions</h2>
      <div class="actions">
        <button class="rbac-action" id="showAdminForm">Create Admin</button>
        <button class="rbac-action" id="showRegisterForm">Register User</button>
      </div>
      <form id="adminForm" class="grid grid-2 super-admin-form" hidden>
        <h3>Create Admin Account</h3>
        <span></span>
        <input id="adminFirstName" required placeholder="First name">
        <input id="adminLastName" required placeholder="Last name">
        <input id="adminEmail" type="email" required placeholder="Email">
        <input id="adminPassword" type="password" minlength="6" required placeholder="Password">
        <input id="adminPhone" placeholder="Phone">
        <input id="adminAddress" placeholder="Address">
        <button class="btn btn-primary" type="submit">Save Admin</button>
        <button class="btn btn-secondary" id="cancelAdminForm" type="button">Cancel</button>
      </form>
      <div id="adminFormAlert"></div>
    </section>
    <section class="card mt super-admin-users">
      <h2>All Users</h2>
      <div id="userTable">Loading users...</div>
    </section>`;

  const adminForm = document.getElementById("adminForm");
  document.getElementById("showAdminForm").onclick = () => { adminForm.hidden = false; };
  document.getElementById("cancelAdminForm").onclick = () => { adminForm.hidden = true; };
  document.getElementById("showRegisterForm").onclick = () => renderSignup();

  adminForm.onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await fetchJson("users.php", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken()}` },
        body: JSON.stringify({
          first_name: document.getElementById("adminFirstName").value.trim(),
          last_name: document.getElementById("adminLastName").value.trim(),
          email: document.getElementById("adminEmail").value.trim().toLowerCase(),
          password: document.getElementById("adminPassword").value,
          phone: document.getElementById("adminPhone").value.trim(),
          address: document.getElementById("adminAddress").value.trim()
        })
      });
      form.reset();
      adminForm.hidden = true;
      showToast("Admin account created.");
      await renderUserTable();
    } catch (error) {
      document.getElementById("adminFormAlert").innerHTML = `<div class="alert alert-warning">${esc(error.message)}</div>`;
    }
  };

  renderUserTable();
}

async function renderUserTable() {
  const table = document.getElementById("userTable");
  if (!table) return;
  try {
    await loadUsers();
    table.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created By</th><th>Created At</th><th>Actions</th></tr></thead><tbody>${state.users.map(user => `
      <tr><td>${esc(user.user_id)}</td><td>${esc(displayName(user))}</td><td>${esc(user.email)}</td><td>${badge(user.role, user.role)}</td><td>Active</td><td>${user.role === "super_admin" ? "-" : "Super Admin"}</td><td>${dateTime(user.created_at)}</td><td>${user.role === "super_admin" ? "" : `<button class="btn btn-danger btn-sm deleteUserBtn" data-id="${user.user_id}">Delete</button>`}</td></tr>`).join("")}</tbody></table></div>`;
    table.querySelectorAll(".deleteUserBtn").forEach(button => {
      button.onclick = async () => {
        if (!confirm("Delete this user account? Related incidents may also be deleted.")) return;
        try {
          await fetchJson(`users.php?id=${encodeURIComponent(button.dataset.id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${currentToken()}` }
          });
          await renderUserTable();
        } catch (error) {
          showToast(error.message || "User deletion failed.");
        }
      };
    });
  } catch (error) {
    table.innerHTML = `<div class="alert alert-warning">${esc(error.message || "Unable to load users.")}</div>`;
  }
}

function renderResidentDashboard() {
  const mine = getIncidentListForUser(state.user.user_id);
  const open = mine.filter(i => !["Resolved", "Problem Solved"].includes(i.status)).length;
  const verified = mine.filter(i => i.verification === "Verified").length;

  document.getElementById("main").innerHTML = `
    <div class="dashboard-heading resident-heading">
      <div><span class="eyebrow">YOUR COMMUNITY AT A GLANCE</span><h1 class="page-title">Welcome, ${esc(displayName(state.user))}</h1>
      <p class="page-subtitle">Submit community concerns and monitor your incident reports.</p></div>
      <span class="heading-mark" aria-hidden="true">🏡</span>
    </div>
    <div class="grid grid-3">
      <div class="card stat"><div class="label">My Reports</div><div class="value">${mine.length}</div><div class="hint">All submitted reports</div></div>
      <div class="card stat"><div class="label">Open Reports</div><div class="value">${open}</div><div class="hint">Still being processed</div></div>
      <div class="card stat"><div class="label">Verified</div><div class="value">${verified}</div><div class="hint">Human-verified priority</div></div>
    </div>
    <div class="card mt">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div><h2 style="margin:0 0 4px">Quick Report</h2><p class="page-subtitle" style="margin:0">Take a photo and provide the incident details.</p></div>
        <button class="btn btn-primary" id="newReportBtn">📷 Report an Incident</button>
      </div>
    </div>
    <div class="card mt">
      <h2 style="margin-top:0">Recent Reports</h2>
      ${incidentTable(mine.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5), true)}
    </div>`;

  document.getElementById("newReportBtn").onclick = () => {
    state.page = "report";
    renderShell();
    renderPage();
  };
}

function incidentTable(list, resident = false) {
  const items = (list || []).map(item => (item && item.id ? item : normalizeIncident(item)));
  if (!items.length) return `<div class="empty">No incident reports yet.</div>`;

  return `<div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Category</th><th>Location</th><th>Priority</th><th>Status</th><th>Date</th><th></th></tr></thead>
    <tbody>${items.map(i => `<tr>
      <td><strong>${esc(i.id)}</strong></td>
      <td>${esc(i.category)}</td>
      <td>${esc(i.location)}</td>
      <td>${priorityBadge(i.verifiedPriority || i.aiPriority)}</td>
      <td>${badge(i.status, i.status)}</td>
      <td>${dateTime(i.createdAt)}</td>
      <td><button class="btn btn-secondary btn-sm viewBtn" data-id="${esc(i.id)}">View</button></td>
    </tr>`).join("")}</tbody></table></div>`;
}

function bindViewButtons() {
  document.querySelectorAll(".viewBtn").forEach(btn => {
    btn.onclick = () => {
      state.selectedId = btn.dataset.id;
      if (isAdmin()) {
        state.page = "reports";
        renderAdminReports(state.selectedId);
      } else {
        state.page = "details";
        renderShell();
        renderPage();
      }
    };
  });
}

function renderReportForm() {
  document.getElementById("main").innerHTML = `
    <h1 class="page-title">Report an Incident</h1>
    <p class="page-subtitle">Provide accurate information so barangay personnel can review your report.</p>
    <div class="alert alert-info"><strong>Important:</strong> AI priority is only a recommendation. An authorized barangay official must verify the priority before it becomes official.</div>
    <form class="card" id="incidentForm">
      <div class="grid grid-2">
        <div>
          <div class="form-group">
            <label class="form-label">Incident Category <span class="required">*</span></label>
            <select id="category" required>${state.categories.map(c => `<option value="${c.category_id}">${esc(c.category_name)}</option>`).join("")}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Incident Description <span class="required">*</span></label>
            <textarea id="description" required placeholder="Describe what happened, when it happened, and any useful details."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Location <span class="required">*</span></label>
            <div class="location-row">
              <input id="location" required placeholder="Example: Purok 2, Barangay Main">
              <button type="button" class="btn btn-secondary" id="locationBtn">📍 Use Location</button>
            </div>
            <div class="help" id="locationHelp">You can enter the location manually or use the browser's location permission.</div>
          </div>
          <input type="hidden" id="lat"><input type="hidden" id="lng">
        </div>
        <div>
          <label class="form-label">Incident Photo <span class="required">*</span></label>
          <div class="camera-box">
            <div style="font-size:32px">📷</div>
            <p style="margin:8px 0;color:var(--muted)">Take a photo using your phone camera or upload an image.</p>
            <div class="upload-row">
              <input id="photo" type="file" accept="image/*" capture="environment" required>
              <button type="button" class="btn btn-secondary" id="cameraBtn">📷 Camera</button>
            </div>
            <img id="preview" class="preview" alt="Incident photo preview">
          </div>
          <div class="help">Photo is stored with the report for barangay personnel to review.</div>
        </div>
      </div>
      <div class="form-group">
        <div id="turnstile-incident"></div>
        <input id="turnstile-incident-token" type="hidden">
      </div>
      <div class="actions" style="margin-top:10px">
        <button type="submit" class="btn btn-primary">Submit Incident Report</button>
        <button type="button" class="btn btn-secondary" id="cancelReport">Cancel</button>
      </div>
    </form>`;

  renderTurnstileWidget("incident", "incident_submit");

  const photo = document.getElementById("photo");
  photo.onchange = () => {
    const file = photo.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById("preview").src = e.target.result;
      document.getElementById("preview").style.display = "block";
    };
    reader.readAsDataURL(file);
  };

  document.getElementById("cameraBtn").onclick = () => photo.click();

  document.getElementById("locationBtn").onclick = () => {
    if (!navigator.geolocation) {
      document.getElementById("locationHelp").textContent = "Geolocation is not supported. Please enter the location manually.";
      return;
    }
    document.getElementById("locationHelp").textContent = "Getting your location...";
    navigator.geolocation.getCurrentPosition(pos => {
      document.getElementById("lat").value = pos.coords.latitude.toFixed(6);
      document.getElementById("lng").value = pos.coords.longitude.toFixed(6);
      document.getElementById("location").value = `GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      document.getElementById("locationHelp").textContent = "Location captured. You may replace it with a barangay/purok description.";
    }, () => {
      document.getElementById("locationHelp").textContent = "Location permission was not granted. Enter the location manually.";
    });
  };

  document.getElementById("cancelReport").onclick = () => {
    state.page = "dashboard";
    renderShell();
    renderPage();
  };

  document.getElementById("incidentForm").onsubmit = submitIncident;
}

async function submitIncident(e) {
  e.preventDefault();
  const file = document.getElementById("photo").files[0];
  const categoryId = Number(document.getElementById("category").value);
  const description = document.getElementById("description").value.trim();
  const location = document.getElementById("location").value.trim();
  const turnstileToken = document.getElementById("turnstile-incident-token").value;

  try {
    const photoData = file ? await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the incident photo."));
      reader.readAsDataURL(file);
    }) : "";
    const result = await fetchJson(`incidents.php?token=${encodeURIComponent(currentToken())}`, {
      method: "POST",
      body: JSON.stringify({
        category_id: categoryId,
        description,
        location,
        latitude: document.getElementById("lat").value || null,
        longitude: document.getElementById("lng").value || null,
        photo_data: photoData,
        "cf-turnstile-response": turnstileToken
      })
    });

    await loadIncidents();
    const incidentId = result.incident.incident_id;
    state.selectedId = String(incidentId);
    state.page = "details";
    renderShell();
    renderPage();
    showToast(`Report ${incidentId} submitted successfully.`);
  } catch (error) {
    resetTurnstile("incident");
    alert(error.message || "Incident report submission failed.");
  }
}

function renderTracking() {
  const mine = getIncidentListForUser(state.user.user_id)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  document.getElementById("main").innerHTML = `
    <h1 class="page-title">Track My Reports</h1>
    <p class="page-subtitle">Monitor your submitted incidents and their current status.</p>
    <div class="card">${incidentTable(mine, true)}</div>`;
  bindViewButtons();
}

function renderResidentDetails(id) {
  const i = getIncidentById(id);
  if (!i) {
    state.page = "tracking";
    renderShell();
    renderPage();
    return;
  }

  const official = i.verifiedPriority || "Not yet verified";
  document.getElementById("main").innerHTML = `
    <div class="actions mb"><button class="btn btn-secondary" id="backBtn">← Back to Reports</button></div>
    <h1 class="page-title">${esc(i.id)}</h1>
    <p class="page-subtitle">${esc(i.category)} · Submitted ${dateTime(i.createdAt)}</p>
    <div class="grid grid-2">
      <div class="card">
        <div class="detail-grid">
          ${i.photo ? `<img class="incident-photo" src="${i.photo}" alt="Incident photo">` : `<div class="incident-photo" style="display:grid;place-items:center">No photo</div>`}
          <div class="kv">
            <strong>Category</strong><span>${esc(i.category)}</span>
            <strong>Location</strong><span>${esc(i.location)}</span>
            <strong>Status</strong><span>${badge(i.status, i.status)}</span>
            <strong>Official Priority</strong><span>${priorityBadge(official)}</span>
            <strong>AI Suggestion</strong><span>${priorityBadge(i.aiPriority)}</span>
            <strong>Verification</strong><span>${esc(i.verification)}</span>
          </div>
        </div>
        <hr style="border:0;border-top:1px solid var(--border);margin:20px 0">
        <strong>Description</strong>
        <p>${esc(i.description)}</p>
        ${i.verification !== "Verified" ? `<div class="alert alert-warning">The AI priority shown above is not final. Authorized barangay personnel must review and verify it.</div>` : ""}
      </div>
      <div class="card">
        <h2 style="margin-top:0">Status History</h2>
        <div class="timeline">${(i.history || []).map(h => `<div class="timeline-item">
          <strong>${esc(h.action)}</strong><div class="time">${dateTime(h.at)} · ${esc(h.by)}</div>
        </div>`).join("")}</div>
      </div>
    </div>`;

  document.getElementById("backBtn").onclick = () => {
    state.page = "tracking";
    renderShell();
    renderPage();
  };
}

function renderAdminDashboard() {
  const all = getAllIncidents();
  const pending = all.filter(i => i.verification !== "Verified").length;
  const critical = all.filter(i => (i.verifiedPriority || i.aiPriority) === "Critical").length;
  const progress = all.filter(i => i.status === "In Progress").length;
  const resolved = all.filter(i => ["Resolved", "Problem Solved"].includes(i.status)).length;

  document.getElementById("main").innerHTML = `
    <div class="dashboard-heading admin-heading">
      <div><span class="eyebrow">BARANGAY OPERATIONS</span><h1 class="page-title">Admin Dashboard</h1>
      <p class="page-subtitle">Monitor, prioritize, verify, and manage barangay incident reports.</p></div>
      <span class="heading-mark" aria-hidden="true">◈</span>
    </div>
    <div class="grid grid-4">
      <div class="card stat"><div class="label">Total Reports</div><div class="value">${all.length}</div><div class="hint">All incidents</div></div>
      <div class="card stat"><div class="label">For Verification</div><div class="value">${pending}</div><div class="hint">AI recommendation awaiting human review</div></div>
      <div class="card stat"><div class="label">Critical</div><div class="value">${critical}</div><div class="hint">Highest priority</div></div>
      <div class="card stat"><div class="label">Problem Solved</div><div class="value">${resolved}</div><div class="hint">${progress} currently in progress</div></div>
    </div>
    <div class="grid grid-2 mt">
      <div class="card">
        <h2 style="margin-top:0">Priority Overview</h2>
        ${priorities.map(p => {
          const n = all.filter(i => (i.verifiedPriority || i.aiPriority) === p).length;
          return `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">${priorityBadge(p)} <strong>${n}</strong></div>`;
        }).join("")}
      </div>
      <div class="card">
        <h2 style="margin-top:0">AI + Human Workflow</h2>
        <div class="alert alert-info">AI generates a suggested priority from available incident information. It does not make the final decision.</div>
        <ol style="line-height:1.8;font-size:13px">
          <li>Resident submits category, description, location, and photo.</li>
          <li>System generates an AI-assisted recommendation.</li>
          <li>Authorized official reviews the report.</li>
          <li>Official confirms, lowers, raises, or overrides priority.</li>
          <li>The verified priority becomes the official priority.</li>
        </ol>
      </div>
    </div>
    <div class="card mt">
      <h2 style="margin-top:0">Latest Reports</h2>
      ${incidentTable(all.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8))}
    </div>`;

  bindViewButtons();
}

function renderAdminReports(selectedId = null) {
  document.getElementById("main").innerHTML = `
    <h1 class="page-title">Incident Reports</h1>
    <p class="page-subtitle">Search, filter, review, and update submitted reports.</p>
    <div class="card">
      <div class="filters">
        <input id="search" placeholder="Search ID, reporter, description...">
        <select id="catFilter"><option value="">All Categories</option>${state.categories.map(c => `<option value="${c.category_id}">${esc(c.category_name)}</option>`).join("")}</select>
        <select id="priorityFilter"><option value="">All Priorities</option>${priorities.map(p => `<option>${p}</option>`).join("")}</select>
        <select id="statusFilter"><option value="">All Statuses</option>${state.status.map(s => `<option value="${s.status_id}">${esc(s.status_name)}</option>`).join("")}</select>
      </div>
      <div id="adminTable"></div>
    </div>
    <div id="adminDetail" class="mt"></div>`;

  const update = () => {
    const q = document.getElementById("search").value.toLowerCase();
    const cat = document.getElementById("catFilter").value;
    const pr = document.getElementById("priorityFilter").value;
    const st = document.getElementById("statusFilter").value;

    const filtered = getAllIncidents().filter(i => {
      const matchesQuery = !q || `${i.id} ${i.reporter} ${i.description} ${i.location}`.toLowerCase().includes(q);
      const matchesCategory = !cat || Number(i.category_id) === Number(cat);
      const matchesPriority = !pr || (i.verifiedPriority || i.aiPriority) === pr;
      const matchesStatus = !st || Number(i.status_id) === Number(st);
      return matchesQuery && matchesCategory && matchesPriority && matchesStatus;
    });

    document.getElementById("adminTable").innerHTML = incidentTable(filtered);
    bindViewButtons();
  };

  ["search", "catFilter", "priorityFilter", "statusFilter"].forEach(id => {
    document.getElementById(id).oninput = update;
  });

  update();
  if (selectedId) showAdminDetail(selectedId);
}

function renderVerification() {
  const unverified = getAllIncidents().filter(i => i.verification !== "Verified");
  document.getElementById("main").innerHTML = `
    <h1 class="page-title">Human Verification Required</h1>
    <p class="page-subtitle">Review AI recommendations before officializing incident priorities.</p>
    <div class="card">${incidentTable(unverified)}</div>
    <div id="adminDetail" class="mt"></div>`;
  bindViewButtons();
}

function showAdminDetail(id) {
  const i = getIncidentById(id);
  if (!i) return;
  const detail = document.getElementById("adminDetail");
  if (!detail) return;

  detail.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
        <div><h2 style="margin:0 0 4px">Review ${esc(i.id)}</h2><p class="page-subtitle" style="margin:0">${esc(i.reporter)} · ${dateTime(i.createdAt)}</p></div>
        <div>${priorityBadge(i.aiPriority)} <span style="margin-left:5px">${priorityBadge(i.verifiedPriority)}</span></div>
      </div>
      <div class="grid grid-2 mt">
        <div>
          ${i.photo ? `<img src="${i.photo}" alt="Incident" style="width:100%;max-height:300px;object-fit:cover;border-radius:8px">` : `<div class="map-placeholder">No uploaded photo</div>`}
        </div>
        <div>
          <div class="kv">
            <strong>Reporter</strong><span>${esc(i.reporter)}</span>
            <strong>Category</strong><span>${esc(i.category)}</span>
            <strong>Location</strong><span>${esc(i.location)}</span>
            <strong>Description</strong><span>${esc(i.description)}</span>
            <strong>AI Priority</strong><span>${priorityBadge(i.aiPriority)}</span>
            <strong>Verification</strong><span>${esc(i.verification)}</span>
          </div>
          <hr style="border:0;border-top:1px solid var(--border);margin:18px 0">
          <div class="alert alert-warning"><strong>Human verification required.</strong> Review the AI suggestion and change it if needed.</div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Official Priority</label>
              <select id="officialPriority">${priorities.map(p => `<option ${i.verifiedPriority === p ? "selected" : ""}>${p}</option>`).join("")}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Incident Status</label>
              <select id="officialStatus">${state.status.map(s => `<option value="${s.status_id}" ${Number(i.status_id) === Number(s.status_id) ? "selected" : ""}>${esc(s.status_name)}</option>`).join("")}</select>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-success" id="verifyBtn">✓ Save Verification</button>
            <button class="btn btn-secondary" id="closeDetail">Close</button>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById("verifyBtn").onclick = async () => {
    const newPriority = document.getElementById("officialPriority").value;
    const newStatusId = Number(document.getElementById("officialStatus").value);
    const newStatusName = getStatusRow(newStatusId)?.status_name || "Submitted";

    try {
      await fetchJson(`incidents.php?id=${encodeURIComponent(id)}&token=${encodeURIComponent(currentToken())}`, {
        method: "PUT",
        body: JSON.stringify({
          verified_priority: newPriority,
          verification_status: "Verified",
          status_id: newStatusId,
          status_name: newStatusName
        })
      });

      showToast(`${i.id} verified. Official priority: ${newPriority}.`);
      await loadIncidents();
      renderAdminReports(i.id);
    } catch (error) {
      showToast(error.message || "Verification failed.");
    }
  };

  document.getElementById("closeDetail").onclick = () => {
    detail.innerHTML = "";
  };
}

window.addEventListener("hashchange", render);
render();
