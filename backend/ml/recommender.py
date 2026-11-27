"""Content-based recommendation engine.

Score = 0.4*S + 0.3*G + 0.2*I + 0.1*L      (each component is 0-100)
  S  skill match      how much of the course teaches skills the student still lacks
  G  career goal      100 if the course targets the student career goal else 0
  I  interest match   50% interest-tag overlap + 50% TF-IDF cosine similarity
  L  level fit        how close the course level is to the student learning level
"""
import heapq
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

LEVELS = {"beginner": 1, "intermediate": 2, "advanced": 3}
LEVEL_NAMES = {1: "Beginner", 2: "Intermediate", 3: "Advanced"}
WEIGHTS = {"skill": 0.4, "goal": 0.3, "interest": 0.2, "level": 0.1}
JOB_READY_LEVEL = 2   # Intermediate is treated as the target level for each required skill


def lvl(name):
    return LEVELS.get(str(name).lower(), 1)


def coverage(course, skills):
    """0..1 : how much of the course the student already knows (level-aware)."""
    cl = lvl(course["level"])
    parts = [min(skills.get(s.lower(), 0) / cl, 1.0) for s in course["skills"]]
    return sum(parts) / len(parts) if parts else 0.0


def _interest_similarity(courses, interests, goal):
    query = " ".join(interests + [goal]).strip()
    if not query:
        return [0.0] * len(courses)
    docs = [" ".join([c["title"], c["description"], c["category"], " ".join(c["skills"]), " ".join(c["interests"])]) for c in courses]
    try:
        vec = TfidfVectorizer(stop_words="english").fit(docs + [query])
        return list(cosine_similarity(vec.transform([query]), vec.transform(docs))[0])
    except ValueError:
        return [0.0] * len(courses)


def score_courses(profile, skills, courses):
    """Return every course with its score and component breakdown."""
    goal = profile.get("career_goal", "")
    interests = [i.lower() for i in profile.get("interests", [])]
    student_level = lvl(profile.get("learning_level", "Beginner"))
    sims = _interest_similarity(courses, profile.get("interests", []), goal)
    out = []
    for c, sim in zip(courses, sims):
        cov = coverage(c, skills)
        S = (1 - cov) * 100
        G = 100.0 if goal and goal in c["goals"] else 0.0
        ci = [i.lower() for i in c["interests"]]
        overlap = (len(set(ci) & set(interests)) / len(ci) * 100) if ci else 0.0
        I = 0.5 * overlap + 0.5 * sim * 100
        L = {0: 100.0, 1: 60.0}.get(abs(lvl(c["level"]) - student_level), 20.0)
        total = WEIGHTS["skill"] * S + WEIGHTS["goal"] * G + WEIGHTS["interest"] * I + WEIGHTS["level"] * L
        new_skills = [s for s in c["skills"] if skills.get(s.lower(), 0) < lvl(c["level"])]
        out.append({**c, "score": round(total, 1), "coverage": cov,
                    "breakdown": {"skill": round(S), "goal": round(G), "interest": round(I), "level": round(L)},
                    "new_skills": new_skills})
    return out


def recommend(profile, skills, courses, completed_ids, top_n=10):
    scored = [c for c in score_courses(profile, skills, courses)
              if c["id"] not in completed_ids and c["coverage"] < 1.0]
    scored.sort(key=lambda c: -c["score"])
    return scored[:top_n]


def goal_requirements(goal, courses):
    """Skill -> required level for a career goal (capped at job-ready level)."""
    req = {}
    for c in courses:
        if goal in c["goals"]:
            for s in c["skills"]:
                req[s] = max(req.get(s, 0), min(lvl(c["level"]), JOB_READY_LEVEL))
    return req


def skill_gap(goal, skills, courses):
    req = goal_requirements(goal, courses)
    rows = []
    for name, need in sorted(req.items()):
        have = skills.get(name.lower(), 0)
        status = "Mastered" if have >= need else ("In progress" if have > 0 else "Missing")
        rows.append({"skill": name, "current": have, "required": need, "status": status})
    total = sum(r["required"] for r in rows) or 1
    ready = round(100 * sum(min(r["current"], r["required"]) for r in rows) / total)
    return {"goal": goal, "readiness": ready, "skills": rows}


def learning_path(profile, skills, courses, completed_ids):
    goal = profile.get("career_goal", "")
    by_id = {c["id"]: c for c in courses}
    scored = {c["id"]: c for c in score_courses(profile, skills, courses)}
    goal_courses = [c for c in courses if goal in c["goals"]]
    needed = {c["id"] for c in goal_courses if c["id"] not in completed_ids and scored[c["id"]]["coverage"] < 1.0}
    stack = list(needed)                       # pull in prerequisites the student still needs
    while stack:
        for p in by_id[stack.pop()]["prereqs"]:
            if p in by_id and p not in completed_ids and p not in needed and scored[p]["coverage"] < 1.0:
                needed.add(p)
                stack.append(p)
    nodes = needed | {c["id"] for c in goal_courses if c["id"] in completed_ids}
    indeg = {n: sum(1 for p in by_id[n]["prereqs"] if p in nodes) for n in nodes}
    key = lambda n: (lvl(by_id[n]["level"]), -scored[n]["score"], n)
    heap = [(key(n), n) for n in nodes if indeg[n] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        _, n = heapq.heappop(heap)
        order.append(n)
        for m in nodes:
            if n in by_id[m]["prereqs"]:
                indeg[m] -= 1
                if indeg[m] == 0:
                    heapq.heappush(heap, (key(m), m))
    path, found_next = [], False
    milestones = {1: "Foundation", 2: "Core skills", 3: "Mastery"}
    for step, n in enumerate(order, 1):
        c = scored[n]
        waiting = [p for p in c["prereqs"] if p in nodes and p not in completed_ids]
        if n in completed_ids:
            status = "completed"
        elif not waiting and not found_next:
            status, found_next = "next", True
        elif not waiting:
            status = "available"
        else:
            status = "locked"
        path.append({**{k: c[k] for k in ("id", "title", "category", "level", "duration_hours", "description", "skills", "prereqs", "url")},
                     "step": step, "status": status, "score": c["score"],
                     "milestone": milestones[lvl(c["level"])],
                     "prereq_titles": [by_id[p]["title"] for p in c["prereqs"] if p in by_id]})
    return path
