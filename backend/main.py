import csv
import hashlib
import json
import os
import secrets
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from urllib.parse import quote_plus

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import Base, SessionLocal, engine, get_db
from ml import recommender as rec

ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "dataset"
DIST = ROOT / "frontend" / "dist"

CAREER_GOALS = ["Data Analyst", "Data Scientist", "Web Developer"]
INTERESTS = ["Coding", "Data", "Analytics", "Business", "Technology", "Research", "AI", "Design"]
EDUCATION = ["High School", "Diploma", "Bachelor's (in progress)", "Bachelor's", "Master's", "Working professional"]
LEVEL_NAMES = {1: "Beginner", 2: "Intermediate", 3: "Advanced"}

app = FastAPI(title="Course and Learning Path Recommender", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------------------------------------------------------------- helpers
def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(8)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    salt = stored.split("$")[0]
    return secrets.compare_digest(hash_password(password, salt), stored)


def split(value: str) -> List[str]:
    return [v.strip() for v in (value or "").split(";") if v.strip()]


def current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Please log in to continue")
    tok = db.query(models.Token).filter_by(token=authorization[7:]).first()
    user = db.get(models.User, tok.user_id) if tok else None
    if not user:
        raise HTTPException(401, "Your session has expired. Please log in again")
    return user


def admin_user(user: models.User = Depends(current_user)) -> models.User:
    if not user.is_admin:
        raise HTTPException(403, "Administrator access required")
    return user


def course_dict(db: Session, c: models.Course) -> dict:
    skill_names = [s.name for s in db.query(models.Skill).join(models.CourseSkill, models.CourseSkill.skill_id == models.Skill.id)
                   .filter(models.CourseSkill.course_id == c.id).all()]
    return {"id": c.id, "title": c.title, "goals": split(c.career_goals), "category": c.category, "level": c.level,
            "duration_hours": c.duration_hours, "interests": split(c.interests), "skills": skill_names,
            "prereqs": [int(p) for p in split(c.prerequisites)], "description": c.description, "url": c.url}


def all_courses(db: Session) -> List[dict]:
    return [course_dict(db, c) for c in db.query(models.Course).order_by(models.Course.id).all()]


def student_skills(db: Session, uid: int) -> dict:
    rows = (db.query(models.Skill.name, models.StudentSkill.level)
            .join(models.StudentSkill, models.StudentSkill.skill_id == models.Skill.id)
            .filter(models.StudentSkill.user_id == uid).all())
    return {name.lower(): level for name, level in rows}


def skill_list(db: Session, uid: int) -> list:
    rows = (db.query(models.Skill.name, models.StudentSkill.level)
            .join(models.StudentSkill, models.StudentSkill.skill_id == models.Skill.id)
            .filter(models.StudentSkill.user_id == uid).order_by(models.Skill.name).all())
    return [{"name": n, "level": l} for n, l in rows]


def get_profile(db: Session, uid: int) -> models.StudentProfile:
    p = db.query(models.StudentProfile).filter_by(user_id=uid).first()
    if not p:
        p = models.StudentProfile(user_id=uid)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def profile_dict(p: models.StudentProfile) -> dict:
    return {"education": p.education, "career_goal": p.career_goal, "interests": split(p.interests),
            "learning_level": p.learning_level, "hours_per_week": p.hours_per_week}


def completed_ids(db: Session, uid: int) -> set:
    return {r.course_id for r in db.query(models.LearningProgress).filter_by(user_id=uid, status="completed").all()}


def set_skill(db: Session, uid: int, name: str, level: int, only_raise: bool = False):
    skill = db.query(models.Skill).filter(models.Skill.name.ilike(name)).first()
    if not skill:
        skill = models.Skill(name=name.strip())
        db.add(skill)
        db.flush()
    row = db.query(models.StudentSkill).filter_by(user_id=uid, skill_id=skill.id).first()
    if row:
        row.level = max(row.level, level) if only_raise else level
    else:
        db.add(models.StudentSkill(user_id=uid, skill_id=skill.id, level=level))


def require_goal(profile: models.StudentProfile):
    if not profile.career_goal:
        raise HTTPException(400, "Choose a career goal in your profile first")


# ---------------------------------------------------------------- seed
def seed():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        if db.query(models.Skill).count() == 0:
            with open(DATASET / "skills.csv", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    db.add(models.Skill(name=r["skill"], category=r["category"]))
            db.commit()
        if db.query(models.Course).count() == 0:
            with open(DATASET / "courses.csv", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    c = models.Course(id=int(r["course_id"]), title=r["title"], career_goals=r["career_goal"],
                                      category=r["category"], level=r["level"], duration_hours=int(r["duration_hours"]),
                                      interests=r["interests"], prerequisites=r["prerequisites"], description=r["description"],
                                      url="https://www.google.com/search?q=" + quote_plus(r["title"] + " online course"))
                    db.add(c)
                    db.flush()
                    for s in split(r["skills"]):
                        sk = db.query(models.Skill).filter_by(name=s).first()
                        if not sk:
                            sk = models.Skill(name=s)
                            db.add(sk)
                            db.flush()
                        db.add(models.CourseSkill(course_id=c.id, skill_id=sk.id))
            db.commit()
        if not db.query(models.User).filter_by(email="admin@demo.com").first():
            db.add(models.User(name="Admin", email="admin@demo.com", password_hash=hash_password("admin123"), is_admin=True))
            db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    seed()


# ---------------------------------------------------------------- schemas
class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class ResetIn(BaseModel):
    email: str
    new_password: str


class SkillIn(BaseModel):
    name: str
    level: int


class ProfileIn(BaseModel):
    education: str = ""
    career_goal: str = ""
    interests: List[str] = []
    learning_level: str = "Beginner"
    hours_per_week: int = 5
    skills: List[SkillIn] = []


class AssessmentIn(BaseModel):
    self_levels: dict            # {"Python": 2}
    answers: dict = {}           # {"Python": [1, 2, 0]}


class ProgressIn(BaseModel):
    course_id: int
    percent: int = 0
    completed: bool = False


class FeedbackIn(BaseModel):
    course_id: Optional[int] = None
    rating: int = 5
    comment: str = ""


class CourseIn(BaseModel):
    title: str
    career_goals: List[str] = []
    category: str = ""
    level: str = "Beginner"
    duration_hours: int = 10
    interests: List[str] = []
    prerequisites: List[int] = []
    skills: List[str] = []
    description: str = ""
    url: str = ""


# ---------------------------------------------------------------- auth
def user_out(u: models.User, token: Optional[str] = None) -> dict:
    out = {"id": u.id, "name": u.name, "email": u.email, "is_admin": bool(u.is_admin)}
    if token:
        out["token"] = token
    return out


def issue_token(db: Session, user: models.User) -> str:
    t = secrets.token_hex(24)
    db.add(models.Token(token=t, user_id=user.id))
    db.commit()
    return t


@app.post("/api/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    if "@" not in email or len(data.password) < 6 or not data.name.strip():
        raise HTTPException(400, "Enter your name, a valid email and a password of at least 6 characters")
    if db.query(models.User).filter_by(email=email).first():
        raise HTTPException(400, "An account with this email already exists")
    u = models.User(name=data.name.strip(), email=email, password_hash=hash_password(data.password))
    db.add(u)
    db.commit()
    db.refresh(u)
    get_profile(db, u.id)
    return user_out(u, issue_token(db, u))


@app.post("/api/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    u = db.query(models.User).filter_by(email=data.email.strip().lower()).first()
    if not u or not verify_password(data.password, u.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    return user_out(u, issue_token(db, u))


@app.post("/api/auth/reset-password")
def reset_password(data: ResetIn, db: Session = Depends(get_db)):
    """Demo reset: a production system would email a one-time link instead."""
    u = db.query(models.User).filter_by(email=data.email.strip().lower()).first()
    if not u:
        raise HTTPException(404, "No account found with this email")
    if len(data.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    u.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@app.get("/api/me")
def me(user: models.User = Depends(current_user)):
    return user_out(user)


@app.get("/api/meta")
def meta(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    skills = [s.name for s in db.query(models.Skill).order_by(models.Skill.name).all()]
    questions = json.loads((DATASET / "questions.json").read_text(encoding="utf-8"))
    return {"career_goals": CAREER_GOALS, "interests": INTERESTS, "education": EDUCATION,
            "skills": skills, "quiz_skills": list(questions.keys()),
            "categories": sorted({c.category for c in db.query(models.Course).all()})}


# ---------------------------------------------------------------- profile
@app.get("/api/profile")
def read_profile(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    return {**profile_dict(get_profile(db, user.id)), "skills": skill_list(db, user.id)}


@app.put("/api/profile")
def update_profile(data: ProfileIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    if data.career_goal and data.career_goal not in CAREER_GOALS:
        raise HTTPException(400, "Unknown career goal")
    p = get_profile(db, user.id)
    p.education, p.career_goal = data.education, data.career_goal
    p.interests, p.learning_level = ";".join(data.interests), data.learning_level
    p.hours_per_week = max(1, min(data.hours_per_week, 80))
    db.query(models.StudentSkill).filter_by(user_id=user.id).delete()
    db.flush()
    for s in data.skills:
        set_skill(db, user.id, s.name, max(1, min(s.level, 3)))
    db.commit()
    return {**profile_dict(p), "skills": skill_list(db, user.id)}


# ---------------------------------------------------------------- assessment
@app.get("/api/assessment/questions")
def assessment_questions(skills: str, user: models.User = Depends(current_user)):
    bank = json.loads((DATASET / "questions.json").read_text(encoding="utf-8"))
    out = {}
    for s in split(skills.replace(",", ";")):
        if s in bank:
            out[s] = [{"q": q["q"], "options": q["options"]} for q in bank[s]]
    return out


@app.post("/api/assessment")
def submit_assessment(data: AssessmentIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    bank = json.loads((DATASET / "questions.json").read_text(encoding="utf-8"))
    results = []
    for name, self_level in data.self_levels.items():
        self_level = max(1, min(int(self_level), 3))
        level, correct, total = self_level, None, None
        if name in bank and name in data.answers:
            qs, given = bank[name], data.answers[name]
            total = len(qs)
            correct = sum(1 for i, q in enumerate(qs) if i < len(given) and given[i] == q["answer"])
            quiz_level = 1 if correct <= 1 else (2 if correct == 2 else 3)
            level = min(self_level, quiz_level) if correct < total else max(self_level, quiz_level)
        set_skill(db, user.id, name, level)
        results.append({"skill": name, "level": level, "level_name": LEVEL_NAMES[level], "correct": correct, "total": total})
    db.commit()
    return {"results": results}


# ---------------------------------------------------------------- recommendations
@app.get("/api/recommendations")
def recommendations(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    p = get_profile(db, user.id)
    require_goal(p)
    courses = all_courses(db)
    done = completed_ids(db, user.id)
    progress = {r.course_id for r in db.query(models.LearningProgress).filter_by(user_id=user.id).all()}
    results = rec.recommend(profile_dict(p), student_skills(db, user.id), courses, done)
    db.query(models.Recommendation).filter_by(user_id=user.id).delete()
    for r in results:
        db.add(models.Recommendation(user_id=user.id, course_id=r["id"], score=r["score"]))
    db.commit()
    return {"career_goal": p.career_goal, "weights": rec.WEIGHTS,
            "recommendations": [{**{k: r[k] for k in ("id", "title", "category", "level", "duration_hours", "description",
                                                       "new_skills", "breakdown", "url")},
                                 "score": r["score"], "enrolled": r["id"] in progress} for r in results]}


@app.get("/api/learning-path")
def learning_path(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    p = get_profile(db, user.id)
    require_goal(p)
    path = rec.learning_path(profile_dict(p), student_skills(db, user.id), all_courses(db), completed_ids(db, user.id))
    hours = sum(c["duration_hours"] for c in path if c["status"] != "completed")
    weeks = round(hours / max(p.hours_per_week, 1), 1)
    return {"career_goal": p.career_goal, "path": path, "remaining_hours": hours, "estimated_weeks": weeks,
            "hours_per_week": p.hours_per_week}


@app.get("/api/skill-gap")
def skill_gap(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    p = get_profile(db, user.id)
    require_goal(p)
    return rec.skill_gap(p.career_goal, student_skills(db, user.id), all_courses(db))


# ---------------------------------------------------------------- progress
def progress_rows(db: Session, uid: int) -> list:
    out = []
    for r in db.query(models.LearningProgress).filter_by(user_id=uid).order_by(models.LearningProgress.updated_at.desc()).all():
        c = db.get(models.Course, r.course_id)
        out.append({"course_id": c.id, "title": c.title, "level": c.level, "duration_hours": c.duration_hours,
                    "category": c.category, "status": r.status, "percent": r.percent})
    return out


@app.post("/api/progress")
def update_progress(data: ProgressIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    c = db.get(models.Course, data.course_id)
    if not c:
        raise HTTPException(404, "Course not found")
    row = db.query(models.LearningProgress).filter_by(user_id=user.id, course_id=c.id).first()
    if not row:
        row = models.LearningProgress(user_id=user.id, course_id=c.id)
        db.add(row)
    pct = max(0, min(data.percent, 100))
    if data.completed or pct >= 100:
        row.status, row.percent = "completed", 100
        cd = course_dict(db, c)
        for s in cd["skills"]:                      # finishing a course raises the student skill level
            set_skill(db, user.id, s, rec.lvl(c.level), only_raise=True)
    else:
        row.status, row.percent = "in_progress", pct
    row.updated_at = datetime.utcnow()
    db.commit()
    return {"progress": progress_rows(db, user.id)}


@app.get("/api/progress")
def read_progress(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    rows = progress_rows(db, user.id)
    nxt = None
    p = get_profile(db, user.id)
    if p.career_goal:
        path = rec.learning_path(profile_dict(p), student_skills(db, user.id), all_courses(db), completed_ids(db, user.id))
        nxt = next((c for c in path if c["status"] == "next"), None)
    return {"progress": rows, "next_course": nxt}


@app.post("/api/feedback")
def add_feedback(data: FeedbackIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    db.add(models.Feedback(user_id=user.id, course_id=data.course_id, rating=max(1, min(data.rating, 5)), comment=data.comment[:500]))
    db.commit()
    return {"ok": True}


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    p = get_profile(db, user.id)
    rows = progress_rows(db, user.id)
    done = [r for r in rows if r["status"] == "completed"]
    out = {"name": user.name, "career_goal": p.career_goal, "has_profile": bool(p.career_goal),
           "skills_count": len(skill_list(db, user.id)), "completed": len(done),
           "in_progress": len([r for r in rows if r["status"] == "in_progress"]),
           "recommended": 0, "path": [], "next_course": None, "progress_percent": 0, "readiness": 0}
    if p.career_goal:
        prof, sk, courses = profile_dict(p), student_skills(db, user.id), all_courses(db)
        out["recommended"] = len(rec.recommend(prof, sk, courses, completed_ids(db, user.id)))
        path = rec.learning_path(prof, sk, courses, completed_ids(db, user.id))
        out["path"] = path
        out["next_course"] = next((c for c in path if c["status"] == "next"), None)
        out["progress_percent"] = round(100 * len([c for c in path if c["status"] == "completed"]) / len(path)) if path else 0
        out["readiness"] = rec.skill_gap(p.career_goal, sk, courses)["readiness"]
    return out


# ---------------------------------------------------------------- admin
def apply_course(db: Session, c: models.Course, data: CourseIn):
    c.title, c.career_goals, c.category = data.title.strip(), ";".join(data.career_goals), data.category
    c.level, c.duration_hours, c.interests = data.level, data.duration_hours, ";".join(data.interests)
    c.prerequisites, c.description = ";".join(str(i) for i in data.prerequisites), data.description
    c.url = data.url or "https://www.google.com/search?q=" + quote_plus(data.title + " online course")
    db.flush()
    db.query(models.CourseSkill).filter_by(course_id=c.id).delete()
    for s in data.skills:
        sk = db.query(models.Skill).filter(models.Skill.name.ilike(s.strip())).first()
        if not sk:
            sk = models.Skill(name=s.strip())
            db.add(sk)
            db.flush()
        db.add(models.CourseSkill(course_id=c.id, skill_id=sk.id))


@app.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db), user: models.User = Depends(admin_user)):
    fb = db.query(models.Feedback).all()
    return {"students": db.query(models.User).filter_by(is_admin=False).count(),
            "courses": db.query(models.Course).count(), "skills": db.query(models.Skill).count(),
            "enrollments": db.query(models.LearningProgress).count(),
            "completions": db.query(models.LearningProgress).filter_by(status="completed").count(),
            "avg_rating": round(sum(f.rating for f in fb) / len(fb), 1) if fb else None, "feedback_count": len(fb)}


@app.get("/api/admin/courses")
def admin_courses(db: Session = Depends(get_db), user: models.User = Depends(admin_user)):
    return all_courses(db)


@app.post("/api/admin/courses")
def admin_add_course(data: CourseIn, db: Session = Depends(get_db), user: models.User = Depends(admin_user)):
    if not data.title.strip():
        raise HTTPException(400, "Course title is required")
    c = models.Course(title=data.title.strip())
    db.add(c)
    db.flush()
    apply_course(db, c, data)
    db.commit()
    return course_dict(db, c)


@app.put("/api/admin/courses/{course_id}")
def admin_edit_course(course_id: int, data: CourseIn, db: Session = Depends(get_db), user: models.User = Depends(admin_user)):
    c = db.get(models.Course, course_id)
    if not c:
        raise HTTPException(404, "Course not found")
    apply_course(db, c, data)
    db.commit()
    return course_dict(db, c)


@app.delete("/api/admin/courses/{course_id}")
def admin_delete_course(course_id: int, db: Session = Depends(get_db), user: models.User = Depends(admin_user)):
    c = db.get(models.Course, course_id)
    if not c:
        raise HTTPException(404, "Course not found")
    for model in (models.CourseSkill, models.LearningProgress, models.Recommendation):
        db.query(model).filter_by(course_id=course_id).delete()
    db.query(models.Feedback).filter_by(course_id=course_id).update({"course_id": None})
    db.delete(c)
    db.commit()
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


# ---------------------------------------------------------------- serve built frontend (optional)
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        target = DIST / path
        return FileResponse(target if path and target.is_file() else DIST / "index.html")
