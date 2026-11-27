# Project Architecture

## 1. High-level architecture
```
Student / Admin (browser)
        |
React (Vite)  - Login, Dashboard, Profile, Assessment, Recommendations, Path, Skill Gap, Progress, Admin
        |  REST / JSON over HTTP (Bearer token)
FastAPI backend  - authentication, validation, business logic, API routes
        |                         |
SQLAlchemy ORM             Recommendation engine (ml/recommender.py)
        |                  Pandas-free scoring + Scikit-learn TF-IDF + graph ordering
SQLite / MySQL database
```

## 2. Workflow
1. Student registers and logs in.
2. Student enters education, interests, skills and picks a career goal.
3. Optional assessment sets verified skill levels.
4. Engine compares the profile with every course and scores it.
5. Skill gap is computed against the skills the goal requires.
6. Path builder adds unmet prerequisites and orders courses.
7. Student enrolls and updates progress; finished courses raise skill levels and the cycle repeats.

## 3. Recommendation algorithm (content-based)
`Score = 0.4*S + 0.3*G + 0.2*I + 0.1*L`, each normalised to 0-100.

| Part | Meaning | How it is computed |
|---|---|---|
| S | Skill match | 100 x (1 - coverage), coverage = mean over course skills of min(student level / course level, 1) |
| G | Career goal match | 100 if goal is in the course goals, else 0 |
| I | Interest match | 50% tag overlap + 50% TF-IDF cosine similarity (scikit-learn) |
| L | Level suitability | 100 same level, 60 one apart, 20 two apart |

Courses the student has completed or fully knows (coverage = 1) are excluded.

**Learning path:** start with unfinished goal courses, add unmet prerequisites, then topologically sort. Ties are broken by level, then score. Status per course: completed, next, available, locked.

**Skill gap:** required level per skill = highest course level teaching it for that goal, capped at Intermediate (job-ready). Readiness = sum(min(current, required)) / sum(required).

## 4. Database design
| Table | Purpose |
|---|---|
| users | Login, role (admin flag) |
| tokens | Active session tokens |
| student_profiles | Education, goal, interests, level, weekly hours |
| skills | Skill master list |
| student_skills | Student skill level (1-3) |
| courses | Course data, goals, level, prerequisites |
| course_skills | Skills taught by each course |
| learning_progress | Status and percent per student and course |
| recommendations | Latest generated recommendations and scores |
| feedback | Ratings and comments |

```
users 1--1 student_profiles      users 1--* student_skills *--1 skills
users 1--* learning_progress *--1 courses 1--* course_skills *--1 skills
users 1--* recommendations *--1 courses      users 1--* feedback
```

## 5. API summary
| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/register, /login, /reset-password | Accounts |
| GET/PUT | /api/profile | Profile and skills |
| GET/POST | /api/assessment/questions, /api/assessment | Quiz |
| GET | /api/recommendations | Ranked courses |
| GET | /api/learning-path | Ordered roadmap |
| GET | /api/skill-gap | Gap analysis |
| GET/POST | /api/progress | Tracking |
| POST | /api/feedback | Feedback |
| GET | /api/dashboard | Summary |
| GET/POST/PUT/DELETE | /api/admin/courses, GET /api/admin/stats | Administration |

## 6. Deployment
Frontend: Vercel (`npm run build`, set `VITE_API_URL`). Backend: Render (`uvicorn main:app --host 0.0.0.0 --port $PORT`, set `DATABASE_URL`). Or run both from one FastAPI server after `npm run build`.
