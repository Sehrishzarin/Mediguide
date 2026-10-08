# 🏥 MediGuide — AI Clinical Triage & Healthcare Navigation

MediGuide is an intelligent, mobile-first healthcare navigation platform designed for busy individuals (working professionals, shift workers, 24/7 parents). The application minimizes user hesitation and confusion about seeking medical care by evaluating physical symptoms against the patient's full medical profile, providing authoritative guidance on **whether a hospital visit is necessary or if home care is safe**, and connecting them to nearby healthcare facilities.

---

## 🌟 Key Features & Capabilities

### 1. 🤖 Empathetic AI Clinical Triage & Counseling Engine
- **Non-Diagnostic Safety Guardrails**: Directs patients to appropriate doctor specialties without issuing unverified medical diagnoses or drug prescriptions.
- **Pragmatic Hospital Minimization**: Reassures busy users when home self-care is safe for routine/mild symptoms (e.g., mild tension headache, routine tiredness), preventing unnecessary hospital trips.
- **Explicit Risk Counseling**: Urgently counsels emergency cases (e.g., acute chest pain, severe breathlessness, high fever in pregnancy) and explains the medical risks of delaying care.
- **Inquisitive Clinical Probing**: Actively asks targeted clinical questions (onset, severity 1-10, pain quality, associated symptoms, triggers) to understand the full picture.
- **Off-Topic / Context Filter**: Politely redirects non-medical or off-topic prompts (e.g., math questions, general trivia) without issuing scary medical alerts or doctor tags.

### 2. 🎨 Modern Design Language & Mobile UI (Figma-Inspired)
- **Deep Teal & Soft Palette**: `#0F9C8E` (Primary Teal), `#F6FBFA` (Soft Background Surface), `#FF8A65` (Warm Accent Coral), and elevated card hierarchy (`18px` radius).
- **Fixed Bottom Tab Bar & FAB**: Mobile navigation bar with a central Floating Action Button (`+`) for instant access to AI consultation.
- **Platform-Aware Back Navigation**:
  - **Web**: In-app `< Back` header button renders dynamically on web browser builds.
  - **Native Android / iOS**: In-app header back button automatically hides to avoid duplicate web controls inside native apps, wiring system hardware back button listeners via Capacitor (`App.addListener('backButton')`).
- **Interactive Doctor Cards & Avatars**: Initial avatar circles, stat pills (`👥 Patients`, `⭐ Rating`, `⏱️ Experience`), date horizontal pickers, and full-width CTA buttons.
- **Micro-Interactions**: Press scaling (`scale(0.97)`), skeleton loaders, and mic pulsing animations during voice triage.

### 3. 🚀 6-Step Onboarding Wizard
- **First-Time User Walkthrough**: Automatically launches for new signups (`OnboardingWizard.jsx`):
  1. Welcome & Capability Overview
  2. Basic Personal Bio Setup (Blood Group, Gender, DOB)
  3. Medical Background (Allergies, Pre-Existing Conditions, Meds)
  4. Emergency Contact Details & Address
  5. Location & Voice Microphone Permissions Setup
  6. Completion Celebration & Dashboard Launch
- **Saved on the account**: completion is stored server-side (`onboardingCompleted`), so it follows the user across devices and every step can be skipped.

### 4. 🏥 Healthcare Facilities & Map (Leaflet / OpenStreetMap)
- **🟢 MediGuide partners**: organizations that registered and were approved by an admin; they offer in-app doctor session booking and verified patient reviews (signed-in patients, one review each).
- **🔵 Public facilities**: nearby hospitals listed for navigation (call + directions), not bookable.
- **Interactive filter pills** (`All`, `MediGuide partners`, `Public facilities`) filter both the list and the map markers.

### 5. 📋 Deep Patient Medical Profile Context Integration
- **Complete Health Background Sync**: Evaluates reported symptoms against:
  - **Pregnancy / Nursing Status** (*1st, 2nd, 3rd Trimester, Breastfeeding, N/A*)
  - **Pre-existing Chronic Diseases** (*Asthma, Hypertension, Diabetes, etc.*)
  - **Active Prescription Medications** (*Lisinopril, Metformin, Albuterol, etc.*)
  - **Long-Term Treatments / Therapies** (*Chemotherapy, Dialysis, etc.*)
  - **Known Allergies & Drug Sensitivities** (*Penicillin, NSAIDs, etc.*)
  - **Age, Gender, Height, Weight, Blood Group, Home Address & Emergency Contact**.
- **100% Editable Profile**: Grouped section cards with locked account email visual indicator.

### 6. 💬 Multi-Session Chat & History Management
- **Persistent Chat Sessions**: Create multiple consultation chats (*"+ New Consultation"*) and switch between them in the slide-out history drawer.
- **Front-Screen Access**: Resume recent consultations directly from the main Patient Home dashboard.

### 7. 🎤 Native Voice Input (Speech-to-Text)
- **Web Speech API Integration**: Tap the microphone icon to speak symptoms live with `@keyframes pulseMic` recording feedback.
- **100% Android APK / Capacitor Compatibility**: Works natively inside Android WebViews with microphone permission.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Mobile Native Bridge**: Capacitor v8 (`@capacitor/core`, `@capacitor/app`, `@capacitor/android`)
- **Routing**: React Router v7
- **Maps**: Leaflet & React-Leaflet (OpenStreetMap Tiles)
- **Voice Recognition**: Native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- **Styling**: CSS Modules with modern responsive layout & Design Tokens (`index.css`)

### Backend
- **Runtime**: Node.js & Express.js
- **Database**: MongoDB with Mongoose (2DSphere Geospatial Spatial Indexing)
- **AI Integration**: Google Gemini 2.5 Flash SDK (`@google/genai`) with intelligent local fallback triage engine
- **Authentication**: JSON Web Tokens (JWT) with bcrypt password hashing

---

## 📁 Project Structure

```
Mediguide/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection setup
│   │   ├── controllers/     # AI, Auth, Organization, Slot (booking) and File logic
│   │   ├── middlewares/     # JWT authentication & role authorization
│   │   ├── models/          # Mongoose schemas (User, Organization, Slot, File)
│   │   ├── routes/          # Express route definitions
│   │   └── seeders/         # Demo data seeder (organizationSeeder.js)
│   ├── .env.example         # Environment variable template
│   ├── package.json
│   └── server.js            # Node/Express server entry point
├── frontend/
│   ├── android/             # Capacitor Android Native Project Scaffold
│   ├── src/
│   │   ├── components/      # HospitalMap, route guards, Spinner, etc.
│   │   ├── context/         # AuthContext (single source of user state)
│   │   ├── pages/           # auth, patient (home, onboarding, profile, slots...), org, admin
│   │   ├── services/        # API service layer (fetch wrappers)
│   │   ├── App.jsx          # Route definitions & providers
│   │   ├── index.css        # Design tokens & global CSS variables
│   │   └── main.jsx         # React DOM entry point
│   ├── capacitor.config.json # Capacitor mobile config (App ID: com.mediguide.app)
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: a local instance or a MongoDB Atlas URI (required; the API refuses to start without it).

### 1. Clone the Repository
```bash
git clone https://github.com/Sehrishzarin/Mediguide.git
cd Mediguide
```

### 2. Install Dependencies

#### Backend Setup
```bash
cd backend
npm install
```

#### Frontend Setup
```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

Copy the templates and fill them in:
```bash
cp backend/.env.example backend/.env       # MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN, optional GEMINI_API_KEY
cp frontend/.env.example frontend/.env.local   # VITE_API_BASE_URL=http://localhost:5000/api
```
`JWT_SECRET` must be a long random string. In production set `CLIENT_ORIGIN` to your deployed frontend origin
(comma separated for several). Without `GEMINI_API_KEY` the built-in local triage engine answers instead.

### 4. Seed Demo Data
Creates the demo accounts, partner organizations, public facilities and a week of bookable doctor sessions:
```bash
cd backend
npm run seed
```
Re-running it resets organizations and sessions (and the demo account passwords) but never deletes real sign-ups.

### 5. Run the Application

#### Start Backend Server
```bash
cd backend
npm run dev
```
*(Runs on `http://localhost:5000`)*

#### Start Frontend Application
```bash
cd frontend
npm run dev
```
*(Runs on `http://localhost:5173`)*

> **Hosting note:** free tiers such as Render put the API to sleep when idle, so the very first request can take
> ~30-50 s. The app pings `/api/health` as soon as it loads to wake the server early.

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Patient User** | `user@mediguide.com` | `userpassword123` | Full patient triage, profile & map |
| **Healthcare Org** | `org@mediguide.com` | `orgpassword123` | Facility, staff and document management |
| **System Admin** | `admin@mediguide.com` | `adminpassword123` | Approve / reject organizations |

---

## 📡 Core API Endpoints

All routes live under `/api`. 🔒 = needs `Authorization: Bearer <token>`.

### Auth & account
- `POST /auth/register` — sign up as a patient or organization (admin accounts can never be self-registered)
- `POST /auth/login` · 🔒 `GET /auth/me` · 🔒 `PUT /auth/profile` (partial update, also sets `onboardingCompleted`)
- 🔒 `PUT /auth/password` · 🔒 `DELETE /auth/me` (password confirmation; removes the account's data)

### AI triage
- 🔒 `POST /ai/triage` — rate limited; uses the signed-in patient's stored medical profile

### Facilities & reviews
- `GET /organizations` · `GET /organizations/nearby?lat=&lng=` (nearest approved partners + public facilities)
- 🔒 `POST /organizations/:id/reviews` (patients, one review per facility)
- 🔒 organizations: `GET /organizations/mine`, `POST /organizations`, `POST|DELETE /organizations/:id/staff`
- 🔒 admin: `GET /organizations/admin/pending`, `PUT /organizations/:id/status`

### Doctor sessions
- 🔒 `GET /slots` · `POST /slots/:id/book` (atomic) · `GET /slots/mine` · `DELETE /slots/:id/book`

### Files (test reports, verification documents, max 2 MB)
- 🔒 `GET /files` · `POST /files` · `GET /files/:id/download` · `DELETE /files/:id`

---

## 📱 Android Native App Build (Capacitor)

The repository includes a pre-configured native Android scaffold (`frontend/android`) with Capacitor plugins:

### 1. Build Web Production Assets
```bash
cd frontend
npm run build
```

### 2. Copy Web Assets to Native Android
```bash
npx cap copy
```

### 3. Open in Android Studio
```bash
npx cap open android
```
From Android Studio, click **Build > Build APK(s)** or run on an emulator/device.

---

## 📄 License
This project is licensed under the MIT License.
