---
name: ios-input-and-forms
description: Design iOS forms and input flows people finish — pickers over keyboards, field tax, validation, and smart defaults. Use when building signup, checkout, settings fields, quizzes, TextField layouts, or multi-step forms.
paths: "**/*.swift"
---

# iOS input and forms

Apply **ios-senior-ui-polish**. Goal: **ask for less, make the choice obvious, give a little back.**

## Field tax

Each extra field costs completion. If it is not required for the outcome, not legally required, and does not build trust, cut it. Confirm-password is usually dead weight (show-password toggle instead).

## Anatomy

- **Visible labels above** the field. Placeholder is a hint, never the only label.
- Four text strengths, loudest to quietest: value, label, helper, placeholder.
- Height **44–48pt**. Focus ring must not shift layout.
- Field **width hints** the answer (OTP vs address).
- Related fields group; side-by-side only when they are one idea (city + state).
- `.textContentType`, `.keyboardType`, `.textInputAutocapitalization`, password autofill. Enable the password manager.

## Validation

- Validate **on blur** (or on submit for short forms), not on every keystroke
- Error sits with the field, names the fix (“Use 8 or more characters”), not “Invalid”
- Do not block typing with a layout jump

## Prefer not to type

| If the answer is… | Use |
|---|---|
| 2–8 named options | Tap cards |
| Ranked priorities | Ordered picks, not a single toggle |
| A number in a range | `Slider`, stepper, or drag — live preview of consequence |
| A date / time | `DatePicker`, calendar |
| A huge list | `.searchable` typeahead |
| Unsure what they want | Quiz / finder (see **ios-onboarding**) |
| Not needed yet | Progressive disclosure — ask later |

Do not make people choose in the dark: show a preview, a default, or a comparison.

## Multi-step

- One idea per step; easy questions first
- Progress fills; **do not start at 0%**
- Review before send when the cost of a mistake is high
- Success screen is required (**ios-empty-error-success**)

## Defaults

Smart default: matches intent, uses context, cheap to override.  
Dark default: serves the business, hides behind a pre-checked box.

Security/privacy defaults on; marketing opt-in off unless they asked.

## SwiftUI

```swift
TextField("Email", text: $email)
    .textContentType(.emailAddress)
    .keyboardType(.emailAddress)
    .textInputAutocapitalization(.never)
    .autocorrectionDisabled()
```

- `Form` / `List` for settings-style; custom cards for marketing quizzes
- `SecureField` + visibility toggle
- Submit with `.onSubmit` and a keyboard “Go” that matches the button

## Checklist

- [ ] Every field earned its tax
- [ ] Labels visible; 44pt; autofill wired
- [ ] Picker/slider before keyboard where possible
- [ ] Errors on blur with a fix
- [ ] Progress endowed; one primary submit
