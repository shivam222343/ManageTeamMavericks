# Project Walkthrough: Team Mavericks Recruitment Management System (RMS)

We have successfully designed and built a professional, metadata-driven **Recruitment Management System (RMS)** for Team Mavericks (student-driven organization of KIT's College of Engineering, Kolhapur).

The application conforms to standard premium UX design styles (**Linear / Notion / Vercel**), with responsive layout frames, custom scrollbars, cohesive light/dark transitions, and proper visual hierarchy.

---

## 🛠️ System Architecture & Code Locations

### 1. Database Schema
- [database.sql](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/database.sql) — Contains full MySQL schema for Campaigns, Dynamic Sections, Customizable Fields, Options, Domains, Submissions, evaluation notes, history logs, and email templates.

### 2. Backend Rest APIs (PHP OOP PSR-4 Autoloaded)
- [api.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/api.php) — Gateway router, CORS header negotiator, preflight handler.
- [Router.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/src/Router.php) — Dynamic parameter route parser.
- [Database.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/src/Database.php) — PDO singleton connector.
- [AuthMiddleware.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/src/Middleware/AuthMiddleware.php) — JWT verification and role permissions checking.
- [AuthController.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/src/Controllers/AuthController.php) — Logs admins in, generates JWTs.
- [CampaignController.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/src/Controllers/CampaignController.php) — Campaign and domain CRUD.
- [FormBuilderController.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/src/Controllers/FormBuilderController.php) — Non-destructive dynamic form synchronization.
- [ApplicantController.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/src/Controllers/ApplicantController.php) — Stores application answers, handles file uploads, changes status, adds notes, exports CSVs, and initiates SMTP emails using PHPMailer.
- [AnalyticsController.php](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/backend/src/Controllers/AnalyticsController.php) — Computes registration statistics, daily trends, gender balance, and domain counts.

### 3. Frontend Layouts & Pages (React.js + Tailwind CSS v4)
- [vite.config.js](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/vite.config.js) — Integrates Tailwind v4 Vite plugin and proxies backend paths.
- [index.css](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/index.css) — Custom Google Fonts (Inter + Outfit) and color variables.
- [ThemeContext.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/context/ThemeContext.jsx) — Light/Dark theme configuration synced to localStorage.
- [AuthContext.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/context/AuthContext.jsx) — Login, logouts, session parsing, Axios auth headers.
- [App.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/App.jsx) — Core router tree, protected guards, role checks.
- [AdminLayout.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/components/layout/AdminLayout.jsx) — Responsive layout with Sidebar navigation utilizing the local Mavericks Logo image.
- [DashboardHome.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/dashboard/DashboardHome.jsx) — Metrics overview and Recharts data line/bar graphs.
- [ApplicantList.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/applicants/ApplicantList.jsx) — Filter tabs, search boxes, switch toggles, candidate tables.
- [ApplicantProfile.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/applicants/ApplicantProfile.jsx) — Candidate evaluation panel, timeline tracking, and scheduling tools.
- [CampaignList.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/campaign/CampaignList.jsx) — CRUD campaigns, deadlines, status badges.
- [FormBuilderPage.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/campaign/FormBuilderPage.jsx) — Drag-and-drop / shift control dynamic input form designer.
- [DomainConfigPage.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/campaign/DomainConfigPage.jsx) — Icons, color presets, intake limits editor.
- [EmailTemplatesPage.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/settings/EmailTemplatesPage.jsx) — Customizable trigger templates.
- [PublicLanding.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/public/PublicLanding.jsx) — Candidate portal, deadline countdown clock, vertical timeline, dynamic stepper forms, validation rules, local draft auto-saving.
- [SuccessPage.jsx](file:///c:/Users/Shiva/OneDrive/Desktop/TeamMavericks_main/frontend/src/pages/public/SuccessPage.jsx) — Displays registration confirmation and prints application receipt.

---

## 🔑 Default Test Accounts
All seeded accounts use password `mavericks123`.

1. **Club Coordinator (Full Access)**
   - Email: `coordinator@teammavericks.org`
   - Access: Create campaigns, edit forms, configure domains, rewrite email templates, inspect/transition candidates, read analytics, view profile timeline.
2. **Core Member (Management Access)**
   - Email: `core@teammavericks.org`
   - Access: Modify form layouts, adjust domains list, inspect candidates, change status, add private comments, check charts. (No email template changes, no campaign deletion).
3. **General Member (Read-Only Access)**
   - Email: `member@teammavericks.org`
   - Access: Read candidate lists, view profiles, read analytics, inspect timelines. (No status changes, no notes editing, no form builder access).

---

## 🚀 How to Run & Verify

The database and web servers are already fully configured and running locally:
1. **Isolated MySQL Database**: Started on port `3307` with username `root` (empty password).
2. **PHP REST API Developer Server**: Active on `http://127.0.0.1:8000` (document root `backend/`).
3. **Vite React Client Server**: Active on `http://localhost:5173`.

### Quick Test Procedures:
- **Global Theme Switcher**: A floating glassmorphic theme toggle button is now visible in the bottom-right corner of all routes (including the public landing and login screens). Click it to seamlessly transition the entire application state between light and dark modes.
- **Input Text Contrast**: Type into form fields (such as email or password input boxes) in dark mode. The values now correctly inherit white text color and adapt to the dark environment.
- **Public Portal**: Visit [http://localhost:5173/teammavericks/recruitment-2026](http://localhost:5173/teammavericks/recruitment-2026). Verify countdown timer works. Fill out a section, reload the page, and confirm progress is restored from the local browser storage. Submit to get your Application ID.
- **Admin Panel**: Visit [http://localhost:5173/login](http://localhost:5173/login). Log in as `coordinator@teammavericks.org` / `mavericks123`.
  - Go to **Applicants** to view the candidate grid. Change status to "Interview" and scheduling prompts will appear. Save to log a transition timeline entry and queue SMTP alerts.
  - Go to **Campaigns -> Form Fields** to edit inputs. Drag and shift inputs, toggle settings, and click **Save Configuration** to sync fields instantly without affecting existing submission references.
  - Go to **Home** to view live chart calculations (Daily Applications, Department proportions, Gender percentages, and Domain metrics).

