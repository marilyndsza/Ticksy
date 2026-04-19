# Ticksy

i made this neat little app for my mom. yup, you read that right.

my mom is a trainer, and she kept running into the same problem every day:
keeping track of which students showed up, who follows which schedule, and whether she actually covered everything she planned for class.

so I built **Ticksy**.

Ticksy is a trainer-first attendance and class-flow app that helps manage:
- student attendance
- custom student schedules
- batch-wise monthly tracking
- quick class notes
- OCR-based workout checklist creation from an image

## Chosen Vertical

I built this for the **trainer / coaching / fitness class management** vertical.

The main persona here is a trainer who handles multiple students and batches, and needs a simple way to:
- mark attendance fast
- track student-specific schedules
- remember medical history of each student
- keep class plans organized
- export a monthly batch summary showcasing metrics like total sessions, present percentage, etc. 

## Why I Built It

This was a very real problem before it was a project.

My mom already had her own system of mental notes, screenshots, gazillion whatsapp messages, physical attendance sheets & class plans, but it was scattered and hard to manage consistently. I wanted to build something that felt lightweight enough to actually use during a busy teaching day, while still being smart enough to reduce the mental load.

The strongest idea behind Ticksy is this:

**a trainer should not only be able to track who came to class, but also actually finish the class they planned.**

That’s why the OCR checklist flow became one of the core parts of the app.
<table>
  <tr>
    <td align="center">
      <img src="ss%20from%20my%20phone/workout.jpg" alt="Workout plan image" width="260" /><br />
      <sub>Workout plan image</sub>
    </td>
    <td align="center" width="90">
      <strong style="font-size: 34px;">→</strong>
    </td>
    <td align="center">
      <img src="ss%20from%20my%20phone/workout-checklist.png" alt="Workout checklist generated from image" width="260" /><br />
      <sub>Checklist created from the workout image</sub>
    </td>
  </tr>
</table>


## What Ticksy Does

### 1. Batch + student management
Trainers can:
- create batches
- add students to batches
- store medical history
- store payment mode and amount
- set date joined
- set birthday (since her studio has a tradition of celebrating all their students birthdays 🤭)
- manage daily/custom schedules per student

### 2. Attendance tracking
Ticksy supports:
- marking daily attendance batch-wise
- calendar-based monthly attendance overview
- student-wise monthly breakdown
- holiday marking
- rescheduled class marking
- report export for the month

### 3. OCR workout checklist
This is one of the main (and fan favourite) features of the app.

The trainer can upload a workout/class-plan image, and Ticksy extracts the workout lines into a usable checklist. This helps during class because instead of repeatedly looking back at an image, the trainer can just check items off one by one.

This is especially helpful for real-world use where trainers often prepare class plans visually before the session starts.


### 4. Monthly reporting
Ticksy generates monthly batch reports with:
- total students
- total present
- total absent
- total sessions
- student-wise summary
- payment mode and fee amount
- trainer name
- joined date

## Approach and Logic

I tried to keep the product logic practical and simple.

### Attendance logic
Each student can be in one of two schedule modes:
- `daily`
- `custom`

For custom mode, the trainer selects the exact days the student is expected to attend.

This means expected sessions are not guessed randomly. They are calculated based on:
- the student’s selected schedule
- the current month
- holidays marked by the trainer
- rescheduled classes added manually

### Monthly overview logic
The monthly overview for a batch shows:
- total students
- total present
- total absent
- total sessions

Here:
- **total present** = sum of all present marks for all students in that batch during the month
- **total absent** = sum of all absent marks for all students in that batch during the month
- **total sessions** = total expected sessions summed student-wise for that batch in that month

### OCR checklist logic
The OCR flow:
1. reads text from an uploaded class-plan image
2. tries to detect workout lines
3. treats bullet points as separate checklist items where possible
4. merges wrapped lines when a workout continues on the next line
5. lets the trainer manually edit the checklist before saving

This keeps the feature useful even when OCR is not perfect.

## How It Works

A typical flow looks like this:

1. Trainer logs in
2. Creates a batch
3. Adds students with schedule details
4. Marks attendance for the class
5. Uploads a workout image and converts it into a checklist
6. Uses the checklist live during class
7. Reviews attendance in the monthly calendar
8. Exports a monthly report

## Real-World Usefulness

Ticksy is not trying to be a giant management system.

It’s meant to be:
- fast enough to use during class
- simple enough to not get in the way
- structured enough to generate useful monthly summaries

The goal was to build something that actually feels usable by a real trainer, not just impressive in a demo.

## Why I Made the features the way they are:

I made the features the way they are because this is what I noticed about the actual trainer-to-student workflow:

- trainers not only work student-wise, but also batch-wise
- not all students attend on the same schedule even if theyre from the same batch
- medical notes matter and should be visible quickly
- class plans are often prepared as images/screenshots, not typed into an app (that same image is sent to their class groups to let the students know about the upcoming class flow)
- trainers need exportable summaries at the end of the month (for admin related work of the studio)

## Tech / Stack

- React
- Supabase
- Vercel
- Tesseract.js for OCR
- PDF export for monthly reports

## Google / PromptWars Context

This project was built during **PromptWars** in the **Google Antigravity environment**.

## Demo

If needed for evaluation, you can test the app using a demo account:

- **Email:** `promptwars@ticksy.app`
- **Password:** `prompt12`

I've currently disabled account creation on the client side so that the website doesn't overload with multiple users, and the trainers who are currently using this app in their day-to-day do not have a bad user experience because of it.

## Screenshots

<table>
  <tr>
    <td><img src="ss%20from%20my%20phone/landing.PNG" alt="Landing page" width="260" /></td>
    <td><img src="ss%20from%20my%20phone/signup.PNG" alt="Sign up page" width="260" /></td>
    <td><img src="ss%20from%20my%20phone/home.PNG" alt="Home dashboard" width="260" /></td>
  </tr>
  <tr>
    <td><img src="ss%20from%20my%20phone/ocr-checklist.PNG" alt="Workout checklist" width="260" /></td>
    <td><img src="ss%20from%20my%20phone/mark-attendance.PNG" alt="Mark attendance" width="260" /></td>
    <td><img src="ss%20from%20my%20phone/attendance-overview.PNG" alt="Attendance overview" width="260" /></td>
  </tr>
</table>

## Final Note

This started as me trying to solve my mom’s day-to-day chaos in a way that felt realistic, not overbuilt.

and honestly, that’s probably my favorite part of Ticksy.
