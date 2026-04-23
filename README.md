
# 🌍 ServeSync – AI-Powered NGO & Volunteer Platform

🚀 A **real-time AI-powered ecosystem** connecting NGOs and volunteers with intelligent matching, trust verification, and live collaboration.

---

## 🔗 Live Demo

👉 https://servesync-e7dba.web.app/

---

## 💡 Introduction

### 🌍 Problem Statement

NGOs often face challenges such as:

* Finding **skilled and reliable volunteers**
* Ensuring **trust and authenticity**
* Lack of **real-time communication**
* Difficulty in tracking **actual impact**

---

### ✅ Our Solution

ServeSync is an **AI-powered real-time platform** designed to connect NGOs with volunteers efficiently while ensuring **trust, transparency, and measurable impact**.

We built a **fully real-time ecosystem** with:

* Intelligent AI matching
* Live communication
* Secure verification
* Transparent impact tracking

---

## 🎯 Mission

> **To build a scalable, intelligent, and trust-driven ecosystem that maximizes social impact through technology.**

---

## ✨ Key Features

* 🤖 **AI-Powered Matching** (with explainable results)
* ⚡ **Real-Time Updates** using Firestore listeners
* 💬 **Live Communication System**
* 🔔 **Push Notifications (FCM)**
* 🔐 **NGO Verification System**
* 🛡️ **Role-Based Access Control**
* 🤝 **Smart Volunteer Invitations**
* 📊 **Impact Tracking Dashboard**

---
## Demo


---
## 🧠 AI Matching System

### 👉 Why this volunteer is a good fit?

> “This volunteer matches your NGO because they have teaching experience, are available on weekends, and are located nearby.”

Our AI system:

* Analyzes volunteer profiles
* Matches skills with NGO needs
* Provides **explainable recommendations**

---

## ⚙️ Core Features Breakdown

### 🔄 Real-Time Architecture

* Built using **Firebase Firestore listeners**
* Instant updates across all users

> “All metrics and actions in our platform are driven by real-time Firestore data, ensuring transparency and accuracy.”

---

### 💬 Communication & Notifications

* Real-time interaction between NGOs and volunteers
* Push notifications using Firebase

> “We implemented real-time communication and notification system using Firestore listeners, enabling instant interaction.”

---

### 🔐 Trust & Verification

* NGOs submit documents
* Admin manually verifies authenticity

> “We implemented a verification system to ensure trust and authenticity.”

---

### 🛡️ Role-Based Access

* Admin, NGO, Volunteer roles
* Secure Firebase authentication

---

### 📊 Impact Tracking

* Track volunteer contributions
* Measure NGO outcomes
* Ensure transparency

---

## 🏗️ Tech Stack

* ⚛️ React + Vite
* 🔥 Firebase (Firestore, Auth, FCM, Hosting)
* ☁️ Cloudinary (media storage)
* 🤖 AI APIs (Gemini)

> “Our architecture uses Firebase for real-time synchronization, Cloudinary for storage, and AI APIs for intelligent matching.”

---

## 🔐 Demo Accounts (For Judges & Reviewers)

You can explore the platform using the following demo(login) accounts:

### 👤 Volunteer
- **Email:** demo.volunteer@servesync.com  
- **Password:** Demo@123  

### 🏢 NGO
- **Email:** demo.ngo@servesync.com  
- **Password:** Demo@123  

---

> ⚠️ **Note:**  
> These are public demo accounts created for evaluation purposes only.  
> Please do not use personal or sensitive data while testing.

---
## ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```bash
git clone https://github.com/patilrutuja23/ServeSync
cd ServeSync
```

---

### 2️⃣ Install dependencies

```bash
npm install
```

---

### 3️⃣ Setup Environment Variables

Create a `.env` file:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=xxxx

VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

VITE_GEMINI_API_KEY=your_ai_key
```

---

### 4️⃣ Run locally

```bash
npm run dev
```

---

## 🚀 Deployment (Firebase Hosting)

### Step 1

```bash
npm install -g firebase-tools
```

### Step 2

```bash
firebase login
```

### Step 3

```bash
firebase init
```

Select:

* Hosting
* Public directory: `dist`
* Single-page app: Yes

### Step 4

```bash
npm run build
```

### Step 5

```bash
firebase deploy
```

---

## 🔐 Admin Access

* Go to **Firestore → users collection**
* Add:

```
role: "admin"
```

### Admin Route:

```
/admin-login
```

---

## 📂 Project Structure

```
src/
 ├── components/
 ├── pages/
 ├── context/
 ├── firebase/
 ├── utils/
```

---

## 🔮 Future Enhancements

* 🔐 AI-based fraud detection
* 🧠 Advanced recommendation engine
* 📊 NGO analytics dashboard
* 🎁 Volunteer reward system
* 📱 Mobile application
* 🌐 Multilingual support

---

## 💡 Platform Strategy

* 🌐 Web-first platform (no installation needed)
* 📱 Mobile app planned for frequent users
* ⚡ Scalable and cloud-native architecture

---

## 💰 Estimated Cost

* MVP: ₹0 – ₹2,000/month
* Scaled: ₹5,000 – ₹20,000/month

👉 Designed to be **cost-effective for NGOs**

---

##  Screenshots  
**NGO Screen**

## 💻 NGO Dashboard

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%201.png" width="400"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%2010.png" width="400"/>
</p>

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%2011.png" width="400"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%202.png" width="400"/>
</p>

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%203.png" width="400"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%204.png" width="400"/>
</p>

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%205.png" width="400"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%206.png" width="400"/>
</p>

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%207.png" width="400"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%208.png" width="400"/>
</p>

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/NGO%20screen%209.png" width="400"/>
</p>


**Volunteer Screen**

## 📸 Screenshots

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%2011.jpeg" width="250"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%205.jpeg" width="250"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%207.jpeg" width="250"/>
</p>

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%2010.jpeg" width="250"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%201.jpeg" width="250"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%202.jpeg" width="250"/>
</p>

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%203.jpeg" width="250"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%204.jpeg" width="250"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%206.jpeg" width="250"/>
</p>

<p align="center">
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%208.jpeg" width="250"/>
  <img src="https://github.com/patilrutuja23/ServeSync/blob/main/assets/screens/volunteer%209.jpeg" width="250"/>
</p>
---

## 👥 Team

**Team Nova Sphere**

---

## 📜 License

For educational and hackathon use

---

## 💬 Final Note

> **“ServeSync is a real-time, AI-powered ecosystem enabling trust, collaboration, and measurable social impact.”**

---


