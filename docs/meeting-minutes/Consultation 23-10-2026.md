# Meeting Minutes

**Date:** 2026-10-23

**Location / Platform:** DCST Faculty Room

**Project:** Student Academic Advising Information System

**Attendees:**
- Mr. Jomari Barera — Panel
- Mhac Alester Montera (@mteraaa) — Member (Presenter)
- John Earl Patrick G. Dumilon (@Htaruo) — Member
- Nietzchan Jake Lelis (@JakeNLelis) — Team Leader
- Ron Nicolas Tan (@NorCubess) — Member

---

## 1. Agenda

1. Consultation of the features and flow of the app, specifically the mock-up, which will serve as the reference for the development proper

---

## 2. Discussions & Updates

**Department Staff**
- Mr. Barera asked what the Curricula section is for. Montera clarified that it is for adding or editing new or existing curricula: a new version can be added, an existing one edited, and its status set to "active", "draft", or "retired".
- Mr. Barera suggested that when adding a version, the Department Staff should be able to choose between creating a new blank curriculum or duplicating an existing one and editing its details. Lelis noted this.
- Montera showed the Course Catalog, where Staff manually add, remove, or edit courses and view their prerequisites.
- Mr. Barera suggested a bulk-upload option for courses (e.g., CSV or other formats) for a better user experience.

**System Admin**
- Montera presented a new tab for Faculty and Departments, which Mr. Barera affirmed.
- Montera showed the Programs tab, which displays the Degree Programs under the Faculty of Computing.
- Mr. Barera asked whether there were conflicts between the team's development and what Mr. Nierras discussed in class before the meeting. Lelis clarified that there are no feature conflicts, and that Mr. Nierras was referring to the merge conflicts that occurred before the class started.

**Adviser**
- **Dashboard:** Montera updated the dashboard to include advisee reports, which differs from the previous mock-up. Mr. Barera pointed out that the "Download PDF" button for Advisee Reports is missing from the new layout. Montera replied that it was an oversight and will be fixed in the next revision.
- **Downloadable report:** Mr. Barera suggested revising and improving it to lay out the important visualizations, analyses, or datasets that are practical for the adviser, and that an AI may be consulted for this.
- **Advisee Checklist:** Shows the status of the advisee's taken subjects per semester.
- **Grades tab:** Mr. Barera asked whether this is where the adviser adds or edits grades, and whether a file can be uploaded instead of filling them in manually. Montera answered that there is a separate tab/section for encoding grades, similar to the mock-up Mr. Barera provided. Mr. Barera approved the UX design.
- **Course Recommendations:** Montera asked whether it is good, and Mr. Barera affirmed.
- **Archives and updates:** Mr. Barera suggested that students be able to see archives and updates. Montera showed the feature he built, which Mr. Barera affirmed.
- **History tab:** Shows all of the student's taken subjects. Mr. Barera suggested turning it into an audit log that tracks all changes and updates, and also suggested removing the current History feature since another tab already provides it.
- **AI Chat:** Montera showed the AI Chat area, which Mr. Barera complimented and asked for clarification of its features. Mr. Barera suggested a separate Feedback section within the AI Chat for ease of maintenance.
- **Encode Grades constraints:** Mr. Barera clarified that dropping a course in the midterms automatically drops it in the finals, and that INC grades do not exist in the midterms, only in the finals (the midterm grade will contain the completion grade).
- **Course selection when encoding grades:** Montera will update it to use a dropdown menu instead of manual typing, which Mr. Barera affirmed.
- **Settings tab:** Montera asked about its purpose. Mr. Barera answered that it is for "Flagging", which guides the adviser on who needs follow-up due to failing grades, INCs, etc.
- **Scholastic standing thresholds:** Flags students with multiple failing grades, who will then be advised to transfer schools or shift degrees.

**Multi-Role Users**
- Lelis asked about individuals with multiple roles (e.g., Adviser and Department Head).

**Summary of Changes**
- **Adviser:** History, Audit Log, Input Grades.
- **Dept Head:** Will have access to notes (not read-only).
- **Dept Staff:** Course Catalog, Add Curricula, Add JSON/CSV upload.

**Elective Subjects and Cross-Department Courses**
- Mr. Barera suggested consulting an AI regarding the elective and non-elective curriculum flow, which was discussed with Montera and Lelis.
- In Encode Grades, Montera suggested using a modal window to add an elective subject after adding a subject. Mr. Barera confirmed.
- For courses offered by a different department, Mr. Barera suggested that the department can edit them but would need approval from the offering department. He then said to disregard these restrictions for now and focus on a shared system.

**Development Practices**
- Mr. Barera suggested that all developers adopt a uniform way of development: use AI agents instead of AI chat with copy-pasted code.

---

## 3. Decisions Made

- **Decision 1:** Curricula versioning will let Department Staff choose between creating a blank curriculum or duplicating an existing one.
- **Decision 2:** Add a bulk-upload option (CSV/JSON) to the Course Catalog.
- **Decision 3:** Restore the "Download PDF" button for Advisee Reports in the next revision, and improve the report layout with practical visualizations, analyses, and data for advisers.
- **Decision 4:** Convert the Adviser History tab into an Audit Log that tracks all changes and updates, and remove the redundant History feature.
- **Decision 5:** Add a separate Feedback section to the AI Chat.
- **Decision 6:** Replace manual typing with a dropdown for course selection in