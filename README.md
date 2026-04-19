<div align="center">
<img width="1200" height="475" alt="ServeSync Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ServeSync

ServeSync is a React + Vite web app for volunteer and NGO collaboration. It includes authentication, community feeds, volunteer search, opportunity management, and Firebase integration.

## Features

- Firebase authentication with Google sign-in
- Firestore-backed community feed and volunteer opportunities
- NGO dashboards, blog posts, and verification workflows
- Volunteer profiles and public profile pages
- Notification support and file storage via Firebase Storage

## Prerequisites

- Node.js 18+ installed
- Firebase project with Authentication, Firestore, and Storage enabled

## Setup

1. Install dependencies:
   `npm install`

2. Create a `.env.local` file in the project root with the following variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> The app reads Firebase config from `import.meta.env`, so do not commit `.env.local`.

## Run Locally

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal (default is `http://localhost:3000`).

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## Project Structure

- `src/App.tsx` – main application shell and routing
- `src/main.tsx` – Vite application bootstrap
- `src/firebase.ts` – Firebase initialization and config
- `src/pages` – route-based page components for auth, community, NGO, volunteer flows
- `src/components` – reusable UI components and feature widgets
- `src/lib` – helper utilities for AI, chat, matching, notifications, storage, and trust logic

## Notes

- This repository uses Vite + React + TypeScript.
- Firebase settings are loaded from `VITE_FIREBASE_*` environment variables.
- Remove any local `.env.local` values before sharing this repository.
