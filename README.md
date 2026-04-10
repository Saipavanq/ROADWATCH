# RoadWatch 🛣️
RoadWatch is a comprehensive web platform for citizens to report road infrastructure issues (potholes, cracks, waterlogging) and authorities to manage, assign, and track repairs. Built with a Node.js/Express backend, Vite/React frontend, and a FastAPI-based AI analysis microservice for automated severity assessment.

## Features
- **Citizen Flow:** Report road issues with location (GPS) and photo upload.
- **AI Analysis:** Automated estimation of issue severity and categorization using a FastAPI Python microservice.
- **Authority Flow:** Dedicated dashboards for authorities with role-based access to manage complaints, map visualizations, and queue systems (Phase 2).
- **Auto-Escalation:** Background cron jobs to escalate complaints that breach SLAs.
- **Map Intelligence:** Visualizing road segment health using Leaflet and GeoJSON.

## Tech Stack
- **Frontend:** React, Vite, Zustand, Vanilla CSS / CSS Modules, Lucide, Recharts, Leaflet
- **Backend:** Node.js, Express, PostgreSQL (with pg client), Socket.io for realtime updates
- **AI Service:** Python, FastAPI, Uvicorn, Pillow

## Quick Start
1. **Database Setup**
   Ensure PostgreSQL is installed locally. Run `backend/setupDb.js` or manually execute the SQL scripts in `database/` against a new database named `roadwatch`.
2. **Environment Variables**
   Ensure you have a `.env` in both the `backend` and `frontend` directories configured with your local environment settings.
3. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. **Start Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
5. **Start AI Service**
   ```bash
   cd ai-service
   pip install -r requirements.txt
   uvicorn main:app --port 8000
   ```
