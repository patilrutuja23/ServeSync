# 🌍 ServeSync – AI-Powered NGO & Volunteer Platform

🚀 A real-time platform connecting NGOs and volunteers with intelligent matching, trust verification, and live collaboration.

---

## 🔗 Live Demo

👉 https://servesync-e7dba.web.app/

---

## 📌 Problem Statement

Many NGOs struggle to find the right volunteers, and volunteers struggle to find meaningful opportunities.
There is also a lack of **trust, transparency, and real-time collaboration** in existing platforms.

---

## 💡 Solution

ServeSync is an **AI-powered, real-time platform** that:

* Matches volunteers with NGOs intelligently
* Verifies NGOs for trust
* Enables real-time communication
* Tracks impact with live analytics

---

## ✨ Features

### 🔍 Smart Matching

* AI-based volunteer ↔ NGO matching
* Match percentage + explanation

### 👤 Role-Based System

* Volunteer Dashboard
* NGO Dashboard
* Admin Panel (separate login)

### 🛡 NGO Verification System

* NGOs upload documents
* Admin approves/rejects
* Verified badge system

### 📸 Work & Post System

* NGOs & volunteers can create posts
* Image upload via Cloudinary
* Global community feed (like Instagram)

### 🤖 AI Features

* AI caption generator
* AI match explanation

### ⚡ Real-Time System

* Live updates using Firestore `onSnapshot`
* Instant UI updates (no refresh)

### 🔔 Notifications

* Real-time alerts for:

  * Matches
  * Messages
  * Posts
  * Verification

### 💬 Live Chat

* NGO ↔ Volunteer messaging
* Real-time conversation

### 📊 Impact Analytics

* Real-time stats:

  * Volunteers
  * Posts
  * Tasks completed

---

## 🛠 Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS

### Backend & Services

* Firebase Authentication
* Firestore (Database + Real-time)
* Firebase Hosting

### Media Storage

* Cloudinary (image uploads)

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```bash id="m1g8ok"
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

---

### 2️⃣ Install dependencies

```bash id="6hjh2l"
npm install
```

---

### 3️⃣ Setup Environment Variables

Create `.env` file:

```env id="r8hz9d"
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=xxxx

VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---

### 4️⃣ Run locally

```bash id="c1j92c"
npm run dev
```

---

## 🚀 Deployment (Firebase Hosting)

### Step 1: Install Firebase CLI

```bash id="b0c4bn"
npm install -g firebase-tools
```

---

### Step 2: Login to Firebase

```bash id="rmx1fg"
firebase login
```

---

### Step 3: Initialize Hosting

```bash id="gq6hcm"
firebase init
```

Select:

* Hosting
* Choose your project
* Public directory: `dist`
* Single-page app: **Yes**

---

### Step 4: Build project

```bash id="mq2i0h"
npm run build
```

---

### Step 5: Deploy

```bash id="p9i6l2"
firebase deploy
```

---

### 🌐 Your app will be live at:

```id="2f4g5j"
https://your-project-id.web.app
```

---

## 🔐 Admin Access

* Go to Firestore → users collection
* Add field:

  ```
  role: "admin"
  ```

### Admin Login:

```id="v9y3rc"
/admin-login
```

---

## 📂 Project Structure

```id="3lhp2t"
src/
 ├── components/
 ├── pages/
 ├── context/
 ├── firebase/
 ├── utils/
```

---

## 🎯 Future Enhancements

* 🧠 AI fake NGO detection
* 📊 Advanced analytics
* ❤️ Likes & comments
* 🔔 Push notifications

---

## 🤝 Contributors

* Your Name

---

## 📜 License

For educational and hackathon use.

---

## 💬 Final Note

> “ServeSync is a real-time, AI-powered ecosystem enabling trust, collaboration, and measurable social impact.”

✨ Built for Google Solution Challenge
