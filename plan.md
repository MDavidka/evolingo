# Evölingo --- Frontend Implementation Plan

## 1. Project goal

Build **Evölingo**, a mobile-optimized, frontend-only web app inspired
by Duolingo's lesson progression. The supplied screenshot is the visual
reference and should be reproduced as closely as practical, including
the white screen, header, heart/life count, staggered circular lesson
path, and rounded bottom navigation.

The app must allow lessons to be authored as JSON. A designated demo
admin, `dmarton336@gmail.com`, should see a lesson editor where they can
create lessons and paste or edit JSON.

**Scope:** frontend only. Do not build a backend, database, API, or real
authentication service in this phase. Clearly document that client-side
access checks and local persistence are prototype behavior, not secure
production controls.

## 2. Design reference

Read and follow [`design_styles.md`](design_styles.md) before
implementing components. It defines the palette, typography, layout,
responsive rules, component states, screen behavior, and
screenshot-fidelity checklist.

Assets: - Use the user-provided PNG `Orb  - 2(1).png` as the app logo.
Copy it into the project's public asset directory without altering it. -
Do not substitute a generated logo or a remote logo.

## 3. Recommended frontend structure

Use the existing project framework if one is already present. If
starting from an empty directory, use a small React + TypeScript app
with a modern build tool and CSS (or the project's established styling
system).

Suggested structure:

``` text
public/
  assets/
    evolingo-logo.png
src/
  app/
    App.tsx
    routes.ts
  components/
    AppHeader.tsx
    BottomNavigation.tsx
    LessonNode.tsx
    LifeCounter.tsx
  screens/
    StartScreen.tsx
    HomeScreen.tsx
    WordsScreen.tsx
    StatsScreen.tsx
    ProfileScreen.tsx
    AdminLessonsScreen.tsx
    LessonScreen.tsx
  data/
    lessonSchema.ts
    sampleLessons.json
    lessonRepository.ts
  lib/
    dailyLives.ts
    demoSession.ts
    lessonValidation.ts
  styles/
    tokens.css
    global.css
design_styles.md
plan.md
```

Adapt the structure to the existing repository rather than duplicating
files or replacing a working framework without reason.

## 4. Navigation and screens

Implement these screens with client-side navigation:

1.  **Start / login**
    -   White, minimal opening screen.
    -   Display the supplied logo and Evölingo name.
    -   Provide name and email fields and a clear continue action.
    -   This is a demo sign-in only; do not claim to authenticate
        securely.
2.  **Home**
    -   Match the provided screenshot closely.
    -   Header includes logo, `Evölingo`, `By MDávid`, heart, and
        current life count.
    -   Render a staggered vertical path of circular lesson nodes.
    -   Load lesson names and node status from the lesson catalogue.
    -   The first available lesson is orange; inactive/locked lessons
        are gray.
3.  **Words**
    -   Provide a simple vocabulary review interface using the same
        design system.
    -   Populate content from available lesson vocabulary data where
        possible.
4.  **Stats**
    -   Show available local demo progress, such as completed lessons
        and exercise accuracy.
    -   Do not fabricate progress; show a useful empty state when no
        activity exists.
5.  **Profile**
    -   Show the current demo user's name and email, plus a sign-out
        action.
    -   Indicate when the current demo session is the admin session.
6.  **Lesson**
    -   Render exercises from the selected lesson's JSON.
    -   Support the exercise types defined in the schema.
    -   Provide answer feedback, progress through exercises, and a
        completion state.
    -   Deduct lives according to one clearly documented rule. If the
        rule is not otherwise specified, deduct one life for an
        incorrect answer and never allow the count below zero.
7.  **Admin lesson editor**
    -   Show only when the current demo session email exactly matches
        `dmarton336@gmail.com`.
    -   Create a lesson, edit its metadata, paste JSON, validate it,
        preview it, and save it to local browser storage.
    -   Allow the admin to load and edit saved demo lessons.
    -   Show validation errors clearly and preserve the user's pasted
        JSON if validation fails.

## 5. Daily lives

Requirements: - Every logged-in user has **100 lives per day**. - A new
day resets the user's lives to 100. - During the same day, navigating
between screens or refreshing the page must not repeatedly refill lives.

Frontend implementation: - Store a daily record per demo user in local
storage, including a date key and remaining lives. - On session load or
app startup, compare the stored date key with the current local calendar
date. - If there is no record or the date has changed, initialize/reset
to 100 lives and store today's date key. - Otherwise, retain the stored
remaining lives. - Clamp values to the range 0--100 and handle malformed
local-storage values safely. - Keep the UI counter synchronized after
answers and navigation.

Limitations: - Browser storage is user-editable and local to that
browser/device. It cannot enforce a trustworthy daily reset across
devices or prevent tampering. Production enforcement would require a
backend.

## 6. JSON lesson format

Create a TypeScript type and runtime validator for a documented lesson
format. Keep the schema simple, versioned, and extensible.

Suggested example:

``` json
{
  "schemaVersion": 1,
  "id": "present-simple-1",
  "title": "Present Simple 1",
  "description": "Practice everyday habits and routines.",
  "level": "A1",
  "vocabulary": [
    {
      "word": "usually",
      "translation": "általában"
    }
  ],
  "exercises": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "prompt": "She ___ to school every day.",
      "options": ["go", "goes", "going"],
      "correctAnswer": "goes",
      "explanation": "With he, she, and it, add -s or -es in the present simple."
    },
    {
      "id": "q2",
      "type": "text",
      "prompt": "Complete the sentence: I ___ coffee every morning.",
      "correctAnswer": "drink",
      "acceptedAnswers": ["drink"]
    }
  ]
}
```

Initially support at least: - `multiple-choice` - `text`

Validation requirements: - Parse JSON safely and show syntax errors. -
Validate required fields and supported `schemaVersion`. - Require unique
lesson and exercise IDs. - Check that multiple-choice answers exist
among the supplied options. - Reject unsupported exercise types with a
clear message. - Never evaluate or execute lesson JSON as JavaScript. -
Include a sample JSON lesson that demonstrates the supported format.

## 7. Frontend data and persistence

Use a small repository layer to separate UI from storage: - Seed the app
with a sample lesson catalogue. - Store admin-created and edited demo
lessons in local storage. - Merge saved demo lessons with the sample
catalogue using stable IDs and a documented overwrite rule. - Store demo
session data, lives, and learning progress separately. - Handle
unavailable or malformed local storage without crashing; provide a safe
in-memory fallback if practical.

No backend calls or database integration are required in this phase.

## 8. Admin and authentication limitations

-   The exact admin email is `dmarton336@gmail.com`.
-   The frontend may use the entered demo email to display the admin
    editor.
-   Do not embed secrets or imply that checking an email in browser code
    is secure.
-   Users can alter client-side state and local storage. In a production
    phase, real authentication and server-side admin authorization must
    protect lesson creation and editing.
-   Do not add a fake password flow that suggests real account security.

## 9. Visual implementation priorities

Implement in this order: 1. Global tokens and mobile app shell. 2.
Header and life counter. 3. Staggered home lesson path. 4. Bottom
navigation. 5. Start/login screen. 6. Lesson exercise runner and
JSON-driven lesson catalogue. 7. Words, Stats, and Profile screens. 8.
Admin lesson editor and JSON validation. 9. Responsive and accessibility
refinements.

At each stage compare the result to the reference screenshot. Keep the
home screen especially faithful; avoid introducing cards, gradients,
unnecessary shadows, or extra controls not shown in the reference.

## 10. Acceptance criteria

### Screenshot and responsive behavior

-   [ ] Home screen closely matches the provided screenshot's
    composition and spacing.
-   [ ] The supplied PNG is used as the logo.
-   [ ] The UI uses the white, black, gray, orange, and red palette
    defined in `design_styles.md`.
-   [ ] Home path is staggered and circular, not a card grid.
-   [ ] Bottom navigation includes exactly Home, Words, Stats, Profile,
    in that order.
-   [ ] Works at 320, 375, 390, and 430 px widths without horizontal
    overflow.
-   [ ] Safe areas and bottom navigation do not obscure content.

### Behavior

-   [ ] Demo users can enter a name and email and start a local session.
-   [ ] Each demo user starts with 100 lives on a new local calendar
    day.
-   [ ] Lives persist through refreshes during the same day.
-   [ ] Lesson content is loaded from JSON rather than hardcoded into
    the lesson screen.
-   [ ] Multiple-choice and text exercises work.
-   [ ] Incorrect answers deduct lives according to the documented rule.
-   [ ] Admin editor appears for `dmarton336@gmail.com` in the demo
    session.
-   [ ] Admin can paste, validate, preview, and save JSON lessons
    locally.
-   [ ] Invalid JSON produces useful errors without losing the pasted
    source.
-   [ ] Empty progress and vocabulary states are handled gracefully.

### Quality

-   [ ] Components are reusable and typed.
-   [ ] Navigation controls and inputs have accessible labels.
-   [ ] Keyboard focus and reduced-motion preferences are respected.
-   [ ] No backend or real authentication is claimed or implemented.
-   [ ] README or in-app notes explain the frontend-only limitations.

## 11. Out of scope

-   Backend/API/database.
-   Real account creation, email verification, or secure login.
-   Server-side admin authorization.
-   Cloud synchronization across devices.
-   Payment, subscriptions, or social features.
-   Executing arbitrary code embedded in lessons.

## 12. Delivery order

1.  Read `design_styles.md`.
2.  Inspect the existing project and preserve its framework where
    possible.
3.  Copy the supplied PNG into the public asset directory.
4.  Build the screenshot-faithful app shell and Home screen.
5.  Implement JSON lesson types, sample data, validation, and lesson
    runner.
6.  Add local demo session, daily lives, progress, and admin editor.
7.  Implement Words, Stats, and Profile.
8.  Test the acceptance criteria at mobile widths and document the
    prototype limitations.
