# Component Architecture and Feature Colocation

Organize UI components cleanly between **Feature-specific components** and **Shared UI primitives**.

## Guidelines

- **Shared UI Primitives (`src/components/ui/`)**: Generic, reusable UI building blocks (e.g., buttons, inputs, dialogs, headers, cards) that are agnostic to any specific domain or feature.
- **Feature Components (`src/components/features/`)**: Components specific to business domains, organized into subfolders per feature/domain (e.g., `auth/`, `user/`, `admin/`, `adviser/`, `student/`).
- **Global & Cross-Cutting**: Cross-cutting custom hooks, context providers, utility functions, and route definitions reside in their respective folders (`src/hooks/`, `src/context/`, `src/lib/`, and `src/routes/`).

## Incorrect

Dumping all components flatly into a single monolithic `components/` folder without separation between reusable UI and feature logic:

```
src/
  components/
    Button.tsx
    Header.tsx
    LoginForm.tsx
    UserProfile.tsx
    AdminUserTable.tsx
    AdviserQueue.tsx
```

## Correct

Separate generic UI components into `ui/` and business-domain components into `features/<domain>/`:

```
src/
  components/
    features/
      auth/
        LoginForm.tsx
      user/
        UserProfile.tsx
      admin/
        AdminUserTable.tsx
      adviser/
        AdviserQueue.tsx
      student/
        StudentChecklist.tsx
    ui/
      Button.tsx
      Header.tsx
      Input.tsx
      Modal.tsx
  hooks/
  routes/
  context/
  lib/
```
