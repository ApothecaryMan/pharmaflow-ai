# Employee Portal — Structured Code Review

---

## BUGS & ISSUES

### BUG-01

- **[SEVERITY]** CRITICAL
- **[FILE]** `EmployeeDashboard.tsx`
- **[LINE]** L146 → `onRefresh={() => loadData(true)}`
- **[ISSUE]** After a user accepts or rejects an employment request, `onRefresh` calls `loadData(true)` which triggers `window.location.reload()` — a full hard reload that destroys all React state, flashes the screen, and loses the user's current view. The intent is to re-fetch data after an accept/reject, but the `true` flag causes a session refresh + page reload instead of a data refresh.
- **[FIX]** Pass `onRefresh={() => loadData()}` (no argument). The `loadData(false)` / `loadData()` path correctly re-fetches profile + requests without reloading the page:

```diff
-  onRefresh={() => loadData(true)}
+  onRefresh={() => loadData()}
```

---

### BUG-02

- **[SEVERITY]** HIGH
- **[FILE]** `EmployeePortalProfile.tsx`
- **[LINE]** L153 → `useCallback` deps for `handleSave`
- **[ISSUE]** `handleSave` reads `removeImage` state but does not include it in its `useCallback` dependency array. If a user removes their avatar (`setRemoveImage(true)`) and then clicks Save, the stale closure may still see `removeImage === false` and fail to clear the image.
- **[FIX]** Add `removeImage` to the dependency array:

```diff
-  }, [onUpdateProfile, editFields, preview]);
+  }, [onUpdateProfile, editFields, preview, removeImage]);
```

---

### BUG-03

- **[SEVERITY]** HIGH
- **[FILE]** `EmployeePortalProfile.tsx`
- **[LINE]** L288–L294
- **[ISSUE]** Uses the deprecated `document.execCommand('copy')` clipboard API. This is removed in modern browsers (Chrome 133+, Firefox 130+). The copy silently fails, but the UI shows "Copied ✓" regardless, misleading the user.
- **[FIX]** Replace with `navigator.clipboard.writeText()`:

```tsx
onClick={async () => {
  try {
    await navigator.clipboard.writeText(`@${displayUsername}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  } catch {
    // Fallback or show error
  }
}}
```

---

### BUG-04

- **[SEVERITY]** HIGH
- **[FILE]** `EmployeeDashboard.tsx`
- **[LINE]** L131
- **[ISSUE]** Hardcoded English string `"Pending Employment Requests"` directly in JSX. Violates the project's **NO HARDCODED TRANSLATIONS** golden rule. The heading will render in English regardless of the user's language setting.
- **[FIX]** Add the key to `i18n/translations.ts` and use `t.employeePortal.pendingRequests` (or equivalent), with the Arabic translation provided.

---

### BUG-05

- **[SEVERITY]** MEDIUM
- **[FILE]** `EmploymentRequestsList.tsx`
- **[LINE]** L31–L32, L47–L48
- **[ISSUE]** Both `handleAccept` and `handleReject` catch errors but only `console.error` them. The user receives no visible feedback on failure — the spinner stops, the card remains unchanged, and the user has no idea if the action succeeded or failed.
- **[FIX]** Show an inline error state or toast notification using the `t` prop. Add an `error` state and render a dismissible error message on the card:

```tsx
const [error, setError] = useState<string | null>(null);
// In catch:
setError(language === 'AR' ? 'فشل في تنفيذ العملية' : 'Operation failed');
```

---

### BUG-06

- **[SEVERITY]** MEDIUM
- **[FILE]** `EmployeeSideDrawer.tsx`
- **[LINE]** L37
- **[ISSUE]** Double `requestAnimationFrame` nesting to trigger CSS enter transitions is fragile. Browsers may batch both frames, skipping the transition entirely (observed on low-power Android devices and aggressive throttling).
- **[FIX]** Force a layout reflow between mount and animation trigger:

```tsx
if (isOpen) {
  setMounted(true);
  requestAnimationFrame(() => {
    overlayRef.current?.getBoundingClientRect(); // force reflow
    setVisible(true);
  });
}
```

---

### BUG-07

- **[SEVERITY]** MEDIUM
- **[FILE]** `EmployeeSideDrawer.tsx`
- **[LINE]** L62
- **[ISSUE]** `useSettings()` is called at the top level of `EmployeeSideDrawer` (L62) to destructure `darkMode`, `setDarkMode`, `language`, `setLanguage`, but these are never used directly — they are consumed only by the child `SettingsToggle` and `LanguageToggle` components which call `useSettings()` again independently. This is a redundant hook call that forces the drawer to re-render on every settings change.
- **[FIX]** Remove the unused `useSettings()` call at L62:

```diff
-  const { darkMode, setDarkMode, language: currentLang, setLanguage } = useSettings();
```

---

### BUG-08

- **[SEVERITY]** MEDIUM
- **[FILE]** `EmployeePortalProfile.tsx`
- **[LINE]** L696
- **[ISSUE]** Hardcoded English string `'No file'` in JSX. Violates the **NO HARDCODED TRANSLATIONS** rule.
- **[FIX]** Use a translation key, e.g. `isRTL ? 'لا يوجد ملف' : 'No file'` at minimum, or better, pass `t` and use `t.documents.noFile`.

---

### BUG-09

- **[SEVERITY]** MEDIUM
- **[FILE]** `EmployeeDashboard.tsx`
- **[LINE]** L134
- **[ISSUE]** Hardcoded English string `"Loading..."` in JSX.
- **[FIX]** Use `t.common.loading` or equivalent translation key.

---

### BUG-10

- **[SEVERITY]** MEDIUM
- **[FILE]** `EmployeeDashboard.tsx`
- **[LINE]** L31–L33
- **[ISSUE]** `loadData` is defined after `useEffect` but referenced inside it. While this works due to hoisting of `const` assignments in the closure, `loadData` is not in the dependency array. If `loadData` were ever memoized or changed, the effect would not re-run. React lint rules flag this as `react-hooks/exhaustive-deps` violation.
- **[FIX]** Either wrap `loadData` in `useCallback` and include it in the dependency array, or move the function body inside the effect.

---

### BUG-11

- **[SEVERITY]** LOW
- **[FILE]** `EmployeeDashboard.tsx`
- **[LINE]** L16
- **[ISSUE]** `t: any` — the entire translation object is typed as `any`. All key accesses (`t.login.employeePortal`, `t.login.reject`, etc.) are completely unchecked at compile time. A typo or missing key silently renders `undefined`.
- **[FIX]** Define or import a `Translations` interface and type the prop as `t: Translations`.

---

### BUG-12

- **[SEVERITY]** LOW
- **[FILE]** `EmployeePortalProfile.tsx`
- **[LINE]** L46–L57
- **[ISSUE]** `readFileAsBase64` uses a hardcoded 500KB limit with no user-facing validation message on the upload buttons. The `alert()` in `handleImageUpload` (L163) works but uses a raw error message (`"File too large (max 500KB)"`) — this is also a hardcoded English string.
- **[FIX]** Extract the limit to a shared constant (`MAX_FILE_SIZE_KB = 500`), use it in both validation and the UI message, and translate the error message.

---

### BUG-13

- **[SEVERITY]** LOW
- **[FILE]** `EmployeePortalProfile.tsx`
- **[LINE]** L195
- **[ISSUE]** `as unknown as Partial<UserProfile>` — unsafe double cast to work around type mismatch when setting a field to `null`. This suppresses real type errors.
- **[FIX]** Ensure `UserProfile` type allows `null` for nullable document fields, then the single cast `as Partial<UserProfile>` works without `unknown`.

---

### BUG-14

- **[SEVERITY]** LOW
- **[FILE]** `EmployeePortalProfile.tsx`
- **[LINE]** L556
- **[ISSUE]** Uses physical `mr-1` (margin-right) instead of logical `me-1` (margin-end). In RTL mode, this places spacing on the wrong side of the clock icon in the work history timeline.
- **[FIX]** Replace `mr-1` with `me-1`.

---

## ARCHITECTURE

### ARCH-01 — Single Responsibility Violation

- **[PRINCIPLE]** Single Responsibility (SRP)
- **[LOCATION]** [EmployeePortalProfile.tsx](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/employee-portal/EmployeePortalProfile.tsx) (708 lines)
- **[PROBLEM]** This single component manages profile display, profile editing with 6 fields, avatar upload/removal, cover banner customization, document upload/delete for 4 document types, work history timeline, pending request listing, stats computation, and clipboard copy. It holds 13 independent `useState` calls.
- **[REFACTOR]** Split into `<ProfileTab>`, `<DocumentsTab>`, `<HistoryTab>` components. Each manages its own state. The parent only holds `activeTab` and passes `profile`/`onUpdateProfile` down.

---

### ARCH-02 — DRY Violation (DocCard repetition)

- **[PRINCIPLE]** DRY
- **[LOCATION]** [EmployeePortalProfile.tsx L469–L515](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/employee-portal/EmployeePortalProfile.tsx#L469-L515)
- **[PROBLEM]** Four `DocCard` instances have nearly identical prop wiring. The `onToggleExpand` inline lambda is duplicated verbatim 4 times, differing only in the field name string.
- **[REFACTOR]** Define a document field config array and `.map()` over it:

```tsx
const DOC_FIELDS = [
  { field: 'nationalIdCard', labelEN: 'National ID (Front)', labelAR: 'البطاقة الشخصية (الوجه الأمامي)' },
  { field: 'nationalIdCardBack', labelEN: 'National ID (Back)', labelAR: 'البطاقة الشخصية (الوجه الخلفي)' },
  // ...
] as const;

{DOC_FIELDS.map(({ field, labelEN, labelAR }) => (
  <DocCard
    key={field}
    title={isRTL ? labelAR : labelEN}
    image={profile?.[field]}
    onUpload={onUpdateProfile ? (f) => handleDocUpload(field, f) : undefined}
    onRemove={onUpdateProfile ? () => handleDocRemove(field) : undefined}
    isExpanded={expandedDocs.has(field)}
    onToggleExpand={() => toggleExpanded(field)}
    loading={uploadingDoc === field}
    deleting={deletingDoc === field}
  />
))}
```

---

### ARCH-03 — DRY Violation (Accept/Reject button logic)

- **[PRINCIPLE]** DRY
- **[LOCATION]** [EmploymentRequestsList.tsx L104–L127](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/employee-portal/EmploymentRequestsList.tsx#L104-L127)
- **[PROBLEM]** Accept and Reject buttons share identical disabled/spinner/label rendering logic with only `action`, `handler`, `icon`, `className`, and `label` differing. The conditional spinner check `processingId === request.id && processingAction === 'reject'` is duplicated.
- **[REFACTOR]** Extract an `<ActionButton>` component or compute shared props in a helper.

---

### ARCH-04 — Separation of Concerns Violation

- **[PRINCIPLE]** Separation of Concerns
- **[LOCATION]** [EmployeeDashboard.tsx L35–L68](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/employee-portal/EmployeeDashboard.tsx#L35-L68) — `loadData()`
- **[PROBLEM]** `loadData` mixes three distinct concerns in one function: (1) session refresh logic with `window.location.reload()`, (2) email backfill calling `supabase.auth.getUser()` directly, and (3) request fetching. A single catch-all wraps all three. The backfill logic bypasses the repository layer by calling `supabase` directly from the view.
- **[REFACTOR]** Extract into dedicated hooks: `useProfile(userId)` and `useRequests(username)`. Move the email backfill into `employeeProfileRepository.getById()` or a separate `ensureEmail()` repository method. Remove the direct `supabase` import from the view component.

---

### ARCH-05 — Separation of Concerns Violation (Hardcoded translations in view)

- **[PRINCIPLE]** Separation of Concerns
- **[LOCATION]** [EmployeeMobileDock.tsx L36/L42/L48](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/employee-portal/EmployeeMobileDock.tsx#L36-L48), [EmployeeSideDrawer.tsx L68/L72/L140/L152/L199](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/employee-portal/EmployeeSideDrawer.tsx#L64-L199)
- **[PROBLEM]** Multiple components contain inline `isRTL ? 'عربي' : 'English'` ternaries with raw Arabic/English strings instead of using the `t` translation object. This scatters i18n concern into view components and violates the project's Golden Rule #1.
- **[REFACTOR]** Pass the `t` translation object to all components and use keys exclusively. Centralize all strings in `i18n/translations.ts`.

---

### ARCH-06 — Dependency Direction Violation

- **[PRINCIPLE]** Dependency Direction / Dependency Inversion
- **[LOCATION]** All components
- **[PROBLEM]** `EmployeeDashboard` directly imports `authService`, `supabase`, `employmentRequestRepository`, and `employeeProfileRepository`. `EmploymentRequestsList` directly imports `employmentRequestRepository`. View components are tightly coupled to concrete service implementations, making unit testing impossible without mocking module imports.
- **[REFACTOR]** Inject repositories and services via React Context or props. Create an `EmployeePortalProvider` context that provides the repositories, or pass `onAccept`/`onReject` callbacks from the parent instead of having `EmploymentRequestsList` call the repository directly.

---

### ARCH-07 — Missing Error Boundaries

- **[PRINCIPLE]** Resilience / Error Handling
- **[LOCATION]** All components
- **[PROBLEM]** No React Error Boundary exists in the component tree. If `employeeProfileRepository.getById()` or `employmentRequestRepository.getByUsername()` throws (network failure, 500, RLS violation), the entire portal may crash to a white screen or show perpetual empty state. `isLoading` is set to `false` in `finally`, but the user sees empty data with no indication of failure or retry option.
- **[REFACTOR]** Wrap the portal in a React Error Boundary. Add an `error` state to `EmployeeDashboard` and render a retry UI when `loadData` fails.

---

## SUMMARY

**Bugs found:** 1 Critical, 3 High, 5 Medium, 4 Low — **13 total**
**Architecture violations:** **7**
