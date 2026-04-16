# Ticksy - Attendance Tracking App PRD

## Original Problem Statement
Build "Ticksy" — an attendance tracking app for teachers with Supabase (PostgreSQL) backend, Supabase Auth, and a playful pink-themed UI. Core features: Students, Slots (recurring time-based batches), Student-Slot assignment, Daily attendance marking, and Calendar view per student.

## Architecture
- **Frontend**: React (CRA) with Tailwind CSS, talking directly to Supabase
- **Backend**: Minimal FastAPI health check (Supabase handles all data)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth (email/password)

## Database Schema
- `students` — id, user_id, name, phone, is_active, created_at
- `slots` — id, user_id, title, day_of_week, start_time, end_time, created_at
- `student_slots` — id, user_id, student_id, slot_id (unique: student_id + slot_id)
- `attendance` — id, user_id, student_id, slot_id, attendance_date, status (unique: student_id + slot_id + attendance_date)

## User Persona
- **Teacher**: Manages students, creates recurring class slots, marks daily attendance

## Core Requirements
1. Auth: Login + Sign Up via Supabase Auth
2. Students: CRUD with active/inactive toggle
3. Slots: Create recurring time slots by day of week
4. Student-Slot mapping: Assign students to slots
5. Attendance: Mark present/absent per student per slot per date (upsert)
6. Calendar: View attendance per student with monthly calendar

## What's Been Implemented (April 15-16, 2026)
- [x] Landing page with Ticksy branding and CTA buttons
- [x] Login page with email/password (Supabase Auth)
- [x] Sign Up page with email/password (Supabase Auth)
- [x] Dashboard showing today's date and today's slots with student counts
- [x] Students page: add, edit, delete, toggle active/inactive
- [x] Slots page: create slots with title, day, time, grouped by day
- [x] Student-Slot assignment dialog (tap to assign/remove)
- [x] Attendance page: mark present/absent with instant save (upsert)
- [x] Calendar page: student selector, monthly calendar, attendance stats
- [x] **NEW: Bottom pill navbar** — 5 icons (messages/heart/+/calendar/profile), pop-out active states, deep blue rounded container, center "+" emphasis
- [x] Profile page with email display and logout
- [x] Protected routes with auth redirect
- [x] Playful pink design with Fredoka/Nunito fonts, pill-shaped inputs/buttons
- [x] Custom native fetch to fix Supabase body stream issue

## Backlog / Next Tasks
- P0: Calendar date color coding (present=green, absent=red) verification
- P1: Weekly attendance grid view
- P2: Monthly attendance summary/export
- P2: Bulk attendance marking (mark all present/absent)
- P3: Student import/export
