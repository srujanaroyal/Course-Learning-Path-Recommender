# Course and Learning Path Recommender (Pathfinder)

A full-stack web app that recommends courses and builds an ordered learning path from a student's skills, interests and career goal.

**Stack:** React (Vite) · FastAPI · SQLAlchemy + SQLite (MySQL-ready) · Pandas / Scikit-learn · Chart.js

## Run it (Windows, macOS, Linux)

### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
API docs: http://127.0.0.1:8000/docs  (database and data are created automatically on first start)

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

### Single-server mode (for the demo)
```bash
cd frontend && npm run build
cd ../backend && uvicorn main:app
```
Open http://127.0.0.1:8000 - FastAPI serves the built React app.

## Accounts
- Student: click **Create an account**
- Admin: `admin@demo.com` / `admin123`

## Demo script (5 minutes)
1. Register, then open **My profile**: pick *Data Analyst*, interests *Data* and *Analytics*, add Python (Beginner) and Excel (Beginner). Save.
2. **Skill assessment**: choose SQL and Python, take the quiz, submit.
3. **Recommended courses**: show the ranked list and open *Why this score?* to show the four-part formula.
4. **Learning path**: show the ordered route with prerequisites and week estimate.
5. **Skill gap**: show the chart and readiness percentage.
6. **My progress**: start the next course, move the slider, mark it completed. Return to the path and gap screens: they update.
7. Log in as admin: add a course and show it appears in the catalogue.

## Recommendation algorithm
`Score = 0.4*S + 0.3*G + 0.2*I + 0.1*L` (each 0-100) - see `backend/ml/recommender.py`
- **S** skill match: share of the course's skills (level-aware) the student still lacks
- **G** career goal: 100 if the course targets the goal
- **I** interests: 50% tag overlap + 50% TF-IDF cosine similarity
- **L** level fit: distance between course level and preferred level

The learning path pulls in unmet prerequisites and orders courses with a topological sort (ties broken by level, then score).
Completing a course raises the matching skill levels, so every screen reflects progress.

## Switch to MySQL
```bash
pip install pymysql
set DATABASE_URL=mysql+pymysql://user:password@localhost/learning     (Windows)
```

## Structure
```
backend/   main.py (API) · models.py · database.py · ml/recommender.py
dataset/   courses.csv · skills.csv · questions.json
frontend/  src/pages (8 student screens + admin) · src/api.js · src/styles.css
documentation/  BRD.md · Project_Architecture.md · Demo_Screens.md
```
