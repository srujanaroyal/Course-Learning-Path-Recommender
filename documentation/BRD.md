# Business Requirements Document
**Project:** Course and Learning Path Recommender System (Pathfinder)

## 1. Introduction
Pathfinder is a web application that recommends courses and generates a personalised learning path based on a student's current skills, education, interests, career goal, preferred difficulty and available study time.

## 2. Problem Statement
Students face a very large number of online courses and often do not know which skills their career goal requires or in what order to learn them. Existing platforms list courses but do not diagnose skill gaps or sequence learning. This leads to wasted time, skipped prerequisites and abandoned courses. Pathfinder analyses the student profile, identifies skill gaps and recommends an ordered set of courses.

## 3. Business Objectives
1. Capture each student's skills, interests and career goal.
2. Recommend relevant courses ranked by a transparent score.
3. Generate a personalised, prerequisite-aware learning path.
4. Identify missing skills through skill gap analysis.
5. Track completion and suggest the next course.
6. Give administrators control of the course catalogue.

## 4. Scope
**In scope:** registration and login, student profile, skill assessment (self-rating and quiz), content-based recommendation, learning path, skill gap analysis, progress tracking, feedback, admin course management.
**Out of scope:** hosting course videos, payments, certificates, live classes, collaborative filtering (future work), email delivery.

## 5. Stakeholders
| Stakeholder | Interest |
|---|---|
| Students | Receive relevant courses and a clear roadmap |
| Administrators | Maintain courses and review feedback |
| Project guide / faculty | Evaluate design and implementation |

## 6. Functional Requirements
| ID | Requirement | Description | Status |
|---|---|---|---|
| FR01 | User registration | Students create accounts and log in; password reset | Done |
| FR02 | Student profile | Education, interests, goal, level, weekly hours, skills | Done |
| FR03 | Skill assessment | Self-rating plus quiz to set skill levels | Done |
| FR04 | Course recommendation | Ranked courses with score and explanation | Done |
| FR05 | Learning path | Ordered roadmap with prerequisites and time estimate | Done |
| FR06 | Skill gap analysis | Current vs required skills, chart and readiness | Done |
| FR07 | Progress tracking | Enroll, percent complete, completion, next course | Done |
| FR08 | Feedback | Rating and comment on recommendations | Done |
| FR09 | Admin dashboard | Statistics; add, edit, delete courses | Done |

## 7. Non-Functional Requirements
- **Security:** passwords stored as salted PBKDF2-SHA256 hashes; token-protected API; admin-only endpoints.
- **Performance:** recommendations returned in under one second for the catalogue size.
- **Usability:** responsive interface, plain language, keyboard-accessible controls.
- **Scalability:** database URL is configurable (SQLite or MySQL); courses are data, not code.
- **Reliability:** progress is stored in the database and survives restarts.

## 8. User Requirements
- Enter my skills and goal quickly.
- Understand why a course was recommended.
- See what to learn first and what I am missing.
- Track progress and know what is next.

## 9. Business Benefits
Less time spent choosing courses, fewer skipped prerequisites, higher completion through a clear sequence, and measurable skill readiness.

## 10. Expected Outcomes
A working application that produces personalised recommendations, learning paths and skill gap reports, with an admin tool to extend the catalogue.
