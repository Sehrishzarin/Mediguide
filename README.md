# 🏥 MediGuide — AI Clinical Triage & Dual-Source Healthcare System

MediGuide is an intelligent, user-centric healthcare navigation platform designed for busy individuals (working professionals, shift workers, 24/7 parents). The application minimizes user hesitation and confusion about seeking medical care by evaluating physical symptoms against the patient's full medical profile, providing authoritative guidance on **whether a hospital visit is necessary or if home care is safe**, and connecting them to nearby healthcare facilities.

---

## 🌟 Key Features & Capabilities

### 1. 🤖 Empathetic AI Clinical Triage & Counseling Engine
- **Non-Diagnostic Safety Guardrails**: Directs patients to appropriate doctor specialties without issuing unverified medical diagnoses or drug prescriptions.
- **Pragmatic Hospital Minimization**: Reassures busy users when home self-care is safe for routine/mild symptoms (e.g., mild tension headache, routine tiredness), preventing unnecessary hospital trips.
- **Explicit Risk Counseling**: Urgently counsels emergency cases (e.g., acute chest pain, severe breathlessness, high fever in pregnancy) and explains the medical risks of delaying care.
- **Inquisitive Clinical Probing**: Actively asks targeted clinical questions (onset, severity 1-10, pain quality, associated symptoms, triggers) to understand the full picture.
- **Off-Topic / Context Filter**: Politely redirects non-medical or off-topic prompts (e.g., math questions, general trivia) without issuing scary medical alerts or doctor tags.

### 2. 📋 Deep Patient Medical Profile Context Integration
- **Complete Health Background Sync**: Evaluates reported symptoms against:
  - **Pregnancy / Nursing Status** (*1st, 2nd, 3rd Trimester, Breastfeeding, N/A*)
  - **Pre-existing Chronic Diseases** (*Asthma, Hypertension, Diabetes, etc.*)
  - **Active Prescription Medications** (*Lisinopril, Metformin, Albuterol, etc.*)
  - **Long-Term Treatments / Therapies** (*Chemotherapy, Dialysis, etc.*)
  - **Known Allergies & Drug Sensitivities** (*Penicillin, NSAIDs, etc.*)
  - **Age, Gender, Height, Weight, Blood Group, Home Address & Emergency Contact**.
- **100% Editable Profile**: All fields are fully updatable by the patient while keeping account identity email locked.

### 3. 🏥 Dual-Source Healthcare Facilities & Map (Leaflet / OpenStreetMap)
- **🟢 Type A: Registered MediGuide Partner Organizations**:
  - Registered healthcare centers with direct in-app doctor session booking.
  - **Verified In-App Patient Reviews**: Patients can view verified ratings/reviews and submit new 1-5 star reviews.
- **🔵 Type B: Nearby Google Maps Public Facilities**:
  - Dynamically fetched based on the patient's live GPS coordinates.
  - Displays Google star ratings, public review counts, place snippets, direct phone calls, and directions.
- **Filter Tabs**: Toggle between *All Facilities*, *🟢 MediGuide Partners*, and *🔵 Google Maps Facilities*.

### 4. 💬 Multi-Session Chat & History Management
- **Persistent Chat Sessions**: Create multiple consultation chats (*"+ New Consultation"*) and switch between them in the slide-out history drawer.
- **Front-Screen Access**: Resume recent consultations directly from the main Patient Home dashboard.

### 5. 🎤 Native Voice Input (Speech-to-Text)
- **Web Speech API Integration**: Tap the microphone icon to speak symptoms live.
- **100% Android APK / Capacitor Compatibility**: Works natively inside Android WebViews with microphone permission.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Routing**: React Router v6
- **Maps**: Leaflet & React-Leaflet (OpenStreetMap Tiles)
- **Voice Recognition**: Native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- **Styling**: CSS Modules with modern responsive layout

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
│   │   ├── controllers/     # AI, Auth, and Organization business logic
│   │   ├── middlewares/     # JWT authentication & role authorization
│   │   ├── models/          # Mongoose schemas (User, Organization)
│   │   ├── routes/          # Express route definitions
│   │   └── seeders/         # Bulk data seeder script (seedBulkData.js)
│   ├── .env.example         # Environment variable template
│   ├── package.json
│   └── server.js            # Node/Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # HospitalMap, MedicalProfileEditor, Spinner, etc.
│   │   ├── context/         # AuthContext & PatientContext
│   │   ├── pages/           # Patient Home, Triage, Profile, Slots, Admin, Org
│   │   ├── services/        # API service layer (fetch wrappers)
│   │   ├── App.jsx          # Route definitions & providers
│   │   └── main.jsx         # React DOM entry point
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB** *(Optional)*: Local MongoDB instance or MongoDB Atlas URI (Server includes an automatic standby fallback mode if MongoDB is offline).

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

Create a `.env` file inside the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/mediguide
JWT_SECRET=mediguide_super_secret_jwt_key_2026
JWT_EXPIRE=30d
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Seed Bulk Healthcare Data
Populate registered partner organizations and verified patient reviews:
```bash
cd backend
node src/seeders/seedBulkData.js
```

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

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Patient User** | `user@mediguide.com` | `userpassword123` | Full patient triage, profile & map |
| **Healthcare Org** | `hospital@mediguide.com` | `orgpassword123` | Hospital dashboard & doctor management |
| **System Admin** | `admin@mediguide.com` | `adminpassword123` | Admin system controls |

---

## 📡 Core API Endpoints

### 🤖 AI Triage & Counseling
- `POST /api/ai/triage`: Evaluates symptom text against patient profile and chat history.

### 👤 Authentication & Patient Profile
- `POST /api/auth/login`: User & organization sign in.
- `POST /api/auth/signup`: Patient registration.
- `GET /api/auth/me`: Get current authenticated user profile.
- `PUT /api/auth/profile`: Update medical profile, address, phone, DOB, and blood group.

### 🏥 Healthcare Organizations & Reviews
- `GET /api/organizations`: List registered partner organizations.
- `GET /api/organizations/nearby?lat=...&lng=...`: Fetch dual-source nearby facilities (Partners + Google Maps).
- `POST /api/organizations/:id/reviews`: Submit in-app patient review and 1-5 star rating.

---

## 📱 Android APK Build (Capacitor)

MediGuide is built mobile-first and can be compiled into a native Android APK using Capacitor:

1. Add Capacitor to frontend:
   ```bash
   cd frontend
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init MediGuide com.mediguide.app --web-dir dist
   ```
2. Build frontend assets:
   ```bash
   npm run build
   npx cap add android
   npx cap copy
   ```
3. Grant Microphone Permission in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   ```
4. Open in Android Studio to build APK:
   ```bash
   npx cap open android
   ```

---

## 📄 License
This project is licensed under the MIT License.
