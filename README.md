# 📚 EduHub — Student Portal

<div align="center">

![EduHub Banner](https://img.shields.io/badge/EduHub-Student%20Portal-6366f1?style=for-the-badge&logo=bookstack&logoColor=white)

**A free, beautiful, full-featured student portal for college classrooms.**

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-eduhub--mirt.vercel.app-00D9C0?style=for-the-badge)](https://eduhub-mirt.vercel.app/)
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Storage-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 🌐 Live Website

> **[https://eduhub-mirt.vercel.app/](https://eduhub-mirt.vercel.app/)**

Sign in with any Google account to explore the portal.

---

## 📖 What is EduHub?

EduHub is a centralized academic portal built for college students and their class representatives. It eliminates the chaos of scattered WhatsApp groups and Google Drives by providing one fast, beautiful, free platform where:

- 📁 **Students** can browse and download notes, question papers, syllabuses, and practical books
- ✏️ **Class Representatives** can upload files, post announcements, manage the timetable, and organize courses
- 🛡️ **Admins** have full control over users, content, and roles

**Built in ~10 hours. Costs ₹0 to run. Handles 1000+ concurrent users.**

---

## ✨ Features

### 🔐 Authentication & Roles
- Google Sign-In (no passwords)
- Three roles: **Admin**, **Class Rep (CR)**, **Student**
- Role-based access — students can't upload, CRs can't manage users
- Admin can promote/demote any user from the Admin Panel
- Multiple CRs supported — each can only delete their own uploads

### 📁 File System (Course → Semester → Subject → Folder)
- CR creates courses (BSc CS, BCA, MCA, etc.) with custom colors
- Each course has semesters (Sem 1–8)
- Each semester has subjects — subjects can be shared across multiple semesters
- Each subject has 4 folders:
  - 📄 **Notes** — lecture notes & study material
  - 📝 **Question Papers** — previous year & mock papers
  - 📋 **Syllabus** — official syllabus & unit breakdowns
  - 🔬 **Practical Books** — lab manuals & practical guides
- Upload PDFs and images (max 25MB per file)
- Download with one click

### 📢 Announcements
- CR and Admin can post announcements
- Urgent flag — shows with red badge at the top
- Edit and delete own announcements
- Students see a live feed, sorted with urgent first

### 🗓 Timetable
- Weekly grid (Mon–Sat, 9AM–4PM)
- CR can click any cell to add Subject + Room + Professor
- Day view for mobile
- Today's classes highlighted on the dashboard
- Add day notes (e.g., "Holiday – Diwali")
- Download as PNG

### 🗂 Study Planner (Private)
- 100% personal — no one else can see your plans, not even admins
- Three plan types:
  - 📅 **Daily** — auto-deletes at midnight
  - 📆 **Weekly** — auto-deletes end of Sunday
  - 🗓 **Monthly** — auto-deletes end of month
- Set study time for each task
- Mark tasks as ✓ Done or ✕ Not Done
- Progress bar showing completion %

### 🏠 Dashboard
- Animated hero with live clock
- Daily motivational quote (changes every day)
- Quick stats — total files, announcements
- Recent files preview
- Today's timetable
- Today's study plan preview
- Quick links (College website, Exam portal, CGPA calculator, etc.)

### 🛡️ Admin Panel
- View all registered users
- Filter by role (Admin / CR / Student)
- Promote or demote any user to any role with one click
- Cannot change your own role (safety guard)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + inline CSS |
| Routing | React Router v6 |
| Backend | Firebase (Firestore + Storage + Auth) |
| Hosting | Vercel (CDN, auto-deploy) |
| Auth | Google OAuth via Firebase Auth |

**All free. Zero server costs.**

---

## 📁 Project Structure

```
eduhub/
├── public/
├── src/
│   ├── firebase.js          # Firebase config & exports
│   ├── useRole.js           # Role system & permissions
│   ├── App.jsx              # Root component with auth
│   ├── index.css            # Tailwind base styles
│   └── pages/
│       ├── Login.jsx        # Google Sign-In page
│       ├── Dashboard.jsx    # Sidebar layout & nav
│       ├── Home.jsx         # Dashboard home page
│       ├── FileSystem.jsx   # Course→Sem→Subject→Folder browser
│       ├── Announcements.jsx
│       ├── Timetable.jsx
│       ├── Planner.jsx      # Personal study planner
│       └── AdminPanel.jsx   # User management
├── .env                     # Firebase keys (not committed)
├── .gitignore
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started (Run Locally)

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ installed
- A [Firebase](https://console.firebase.google.com/) project
- A [GitHub](https://github.com/) account

### 1. Clone the repository

```bash
git clone https://github.com/aniketbiradar-official/eduhub.git
cd eduhub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. Create a new project named `eduhub`
3. Enable **Authentication** → Google Sign-In
4. Create a **Firestore Database** (nam5 / us-central, test mode)
5. Enable **Storage** (test mode)
6. Go to Project Settings → Your apps → Web app → copy the config

### 4. Create your `.env` file

Create a `.env` file in the root folder:

```env
VITE_API_KEY=your_api_key
VITE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_PROJECT_ID=your_project_id
VITE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_ID=your_app_id
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Make yourself Admin

After signing in for the first time:
1. Go to Firebase Console → Firestore → `users` collection
2. Find your document (your name)
3. Change `role` field from `student` to `admin`
4. Refresh the app — you'll see the 🛡️ Admin badge

---

## 🔥 Firebase Setup

### Firestore Security Rules

Go to Firebase Console → Firestore → Rules tab and paste:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules

Go to Firebase Console → Storage → Rules tab and paste:

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Required Firestore Indexes

Go to Firestore → Indexes → Add Index for each:

| Collection | Field 1 | Field 2 | Field 3 |
|---|---|---|---|
| `semesters` | `courseId` Asc | `number` Asc | — |
| `subjects` | `semesterIds` Arrays | `name` Asc | — |
| `fs_files` | `subjectId` Asc | `folder` Asc | `createdAt` Desc |

---

## ☁️ Deploy to Vercel (Free)

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Add New Project** → Import your `eduhub` repo
3. Before deploying, go to **Environment Variables** and add all 6 `VITE_*` variables
4. Click **Deploy**

### 3. Add your Vercel URL to Firebase

Go to Firebase Console → Authentication → Settings → Authorized domains → Add your Vercel URL (e.g., `eduhub-mirt.vercel.app`)

---

## 👥 Role System

| Feature | 📖 Student | ✏️ Class Rep | 🛡️ Admin |
|---|:---:|:---:|:---:|
| View & download files | ✅ | ✅ | ✅ |
| Upload files | ❌ | ✅ | ✅ |
| Post announcements | ❌ | ✅ | ✅ |
| Delete own content | ❌ | ✅ | ✅ |
| Delete any content | ❌ | ❌ | ✅ |
| Manage courses & subjects | ❌ | ✅ | ✅ |
| Edit timetable | ❌ | ✅ | ✅ |
| Admin Panel (manage users) | ❌ | ❌ | ✅ |
| Study Planner | ✅ (private) | ✅ (private) | ✅ (private) |

---

## 🌍 Firebase Free Tier — Can It Handle 1000 Users?

| Resource | Free Limit | Usage |
|---|---|---|
| Firestore reads | 50,000 / day | ✅ Plenty |
| Firestore writes | 20,000 / day | ✅ Plenty |
| Storage | 5 GB total | ✅ Plenty |
| Storage downloads | 1 GB / day | ✅ Plenty |
| Auth sign-ins | 10,000 / month | ✅ Plenty |
| Vercel bandwidth | 100 GB / month | ✅ Plenty |

**Yes — 1000+ concurrent users on the free tier. No credit card needed.**

---

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- Built with [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- Backend by [Firebase](https://firebase.google.com/)
- Deployed on [Vercel](https://vercel.com/)
- Designed & developed by **Aniket Biradar**

---

<div align="center">

**⭐ If this project helped you, give it a star on GitHub!**

[![GitHub stars](https://img.shields.io/github/stars/aniketbiradar-official/eduhub?style=social)](https://github.com/aniketbiradar-official/eduhub)

Made with ❤️ for students everywhere

</div>
