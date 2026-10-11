# React Project Preferences

## 1. Core Philosophy

Build the application in a clean, practical, feature-oriented way.

Priorities:

1. Keep the code simple.
2. Avoid unnecessary abstractions.
3. Keep components small and readable.
4. Separate UI, business logic, API logic, and utilities.
5. Reuse code only when reuse is actually useful.
6. Prefer maintainability and development speed over over-engineering.

Do not introduce libraries, patterns, or architectural complexity unless the project actually needs them.

---

## 2. Preferred Stack

Use:

* React
* JavaScript
* React Router
* Tailwind CSS
* Axios
* TanStack React Query
* Context API when global client state is required

Avoid Redux unless the application genuinely requires it.

---

## 3. Preferred Folder Structure

Start with a structure similar to:

```text
src/
├── app/
│   ├── routes/
│   └── providers/
│
├── layouts/
│
├── pages/
│
├── components/
│
├── features/
│
├── hooks/
│
├── services/
│
├── utils/
│
└── assets/
```

Adjust the structure according to project complexity.

Do not create folders just because they exist in the template.

---

## 4. Feature-Based Organization

Large features should be organized inside `features/`.

Example:

```text
src/
└── features/
    └── products/
        ├── components/
        ├── hooks/
        ├── services/
        └── utils/
```

Feature-specific code should stay inside its feature whenever possible.

For example:

```text
features/products/hooks/
```

is preferred over putting `useProducts.js` into the global hooks folder if the hook is only related to products.

---

## 5. Pages

Pages represent route-level screens.

Example:

```text
pages/
├── Home/
│   └── Home.jsx
├── Login/
│   └── Login.jsx
└── Dashboard/
    └── Dashboard.jsx
```

A page should mainly compose the UI.

Avoid putting large amounts of business logic directly inside page components.

---

# 6. Mother Component + Mother Hook Pattern

This is an important preferred pattern.

When a page contains multiple smaller components, use a main/mother hook to coordinate the feature.

Example:

```text
ProductsPage
│
└── useProductsPage()
      │
      ├── products
      ├── loading
      ├── filters
      ├── pagination
      ├── createProduct()
      ├── updateProduct()
      ├── deleteProduct()
      └── refetch()
      │
      ├── ProductsTable
      │     └── optional local hook
      │
      ├── ProductFilter
      │     └── optional local hook
      │
      └── ProductModal
            └── optional local hook
```

The mother hook should coordinate feature-level state, API data, mutations, and handlers.

Children should receive only what they need.

Do not make every child independently fetch the same data.

---

## 7. Hook Rules

Use three levels of hooks.

### Global hooks

Use `src/hooks/` only for genuinely reusable application-wide hooks.

```text
hooks/
├── useDebounce.js
├── useLocalStorage.js
└── useClickOutside.js
```

### Feature hooks

Keep feature-specific hooks inside the feature:

```text
features/
└── products/
    └── hooks/
        ├── useProductsPage.js
        ├── useProductForm.js
        └── useProductFilter.js
```

### Local hooks

If a hook is used only by one component and is tightly coupled to it, keep it close to that component when appropriate.

Do not create a custom hook for every small piece of state.

---

## 8. React Query

Use TanStack React Query for server state.

Server data should generally follow:

```text
Component
    ↓
Mother Hook
    ↓
React Query
    ↓
Service
    ↓
Axios
    ↓
Backend
```

Do not manually duplicate:

* loading state
* error state
* caching
* refetching
* server-state synchronization

when React Query already handles them.

---

## 9. API / Service Layer

Axios/API communication should not normally live directly inside UI components.

Example:

```text
features/
└── products/
    ├── hooks/
    │   └── useProductsPage.js
    │
    └── services/
        └── productService.js
```

Example responsibility:

```text
productService.js
→ API requests

useProductsPage.js
→ React Query + feature logic

ProductsPage.jsx
→ page composition

ProductsTable.jsx
→ UI
```

---

## 10. State Management

Use the simplest appropriate state solution.

### Local UI state

```text
useState
useReducer
```

### Server state

```text
TanStack React Query
```

### Global client state

```text
Context API
```

Only introduce Redux or another state library if there is a real requirement.

---

## 11. Components

Components should have clear responsibilities.

Prefer:

```text
ProductsPage
├── ProductHeader
├── ProductFilter
├── ProductTable
├── ProductPagination
└── ProductModal
```

instead of one huge component containing everything.

However, do not split components unnecessarily.

A component does not need to be extracted simply because it is 20–30 lines long.

Extract when it improves:

* readability
* reuse
* responsibility separation
* maintainability

---

## 12. UI / Design

Build responsive interfaces from the beginning.

Support:

```text
Mobile
Tablet
Desktop
```

Use Tailwind CSS.

Prefer:

* clean layouts
* consistent spacing
* clear typography
* reusable UI patterns
* simple responsive behavior
* accessible interactions

Do not over-design the interface.

The UI should look professional without unnecessary visual complexity.

---

## 13. Routing

Keep route definitions centralized:

```text
app/
└── routes/
```

Example:

```text
app/routes/
├── index.jsx
├── publicRoutes.jsx
└── protectedRoutes.jsx
```

Use layouts for shared route structures.

Example:

```text
ProtectedRoute
    ↓
DashboardLayout
    ↓
DashboardPage
```

---

## 14. Providers

Keep global providers inside:

```text
app/providers/
```

Typical providers:

```text
QueryProvider
AuthProvider
ThemeProvider
```

Only create a provider when state/context genuinely needs to be shared.

---

## 15. Naming

Use clear descriptive names.

Components:

```text
ProductTable.jsx
ProductModal.jsx
DashboardSidebar.jsx
```

Hooks:

```text
useProductsPage.js
useProductForm.js
useAuth.js
```

Services:

```text
productService.js
authService.js
orderService.js
```

Avoid vague names such as:

```text
helper.js
common.js
stuff.js
data.js
manager.js
```

unless the responsibility is genuinely clear.

---

## 16. Avoid Over-Engineering

Do NOT automatically create:

```text
repositories/
interfaces/
adapters/
factories/
managers/
constants/
types/
schemas/
providers/
contexts/
```

for every project.

Create them only when there is a real reason.

The architecture should grow with the application.

---

## 17. Before Writing Code

Before implementing a significant feature:

1. Understand the requirement.
2. Identify pages/routes.
3. Identify major features.
4. Decide component boundaries.
5. Decide what belongs in the mother hook.
6. Decide what needs local hooks.
7. Decide API/service responsibilities.
8. Then implement.

When asked to design a project, show the proposed folder structure first before generating large amounts of code.

---

## 18. Default Architecture

For a medium-sized React application, prefer this general pattern:

```text
src/
│
├── app/
│   ├── routes/
│   └── providers/
│
├── layouts/
│
├── pages/
│
├── components/
│
├── features/
│   ├── auth/
│   ├── products/
│   ├── orders/
│   └── users/
│
├── hooks/
│
├── services/
│
├── utils/
│
└── assets/
```

Feature flow:

```text
Page
 ↓
Mother Hook
 ↓
Feature Components
 ↓
Local Hooks (when needed)
 ↓
React Query
 ↓
Service
 ↓
Axios
 ↓
Backend
```

---

## 19. AI Agent Behavior

When working on this project:

* Follow this architecture unless there is a strong technical reason not to.
* Do not restructure the project unnecessarily.
* Do not introduce dependencies without explaining why they are needed.
* Reuse existing components/hooks/services before creating new ones.
* Keep business logic out of presentational components when practical.
* Keep feature-specific logic inside its feature.
* Prefer the simplest solution that satisfies the requirement.
* Preserve the existing architecture when adding new features.
* Before making major structural changes, explain the reason.
* Do not generate unnecessary boilerplate.
* Do not create abstractions merely to make the project look "enterprise".

The goal is:

**Clean → Simple → Reusable → Scalable**

without unnecessary complexity.
