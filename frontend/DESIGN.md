# MediGuide design guide

Clean, clinical, calm. Think One Medical / Ada Health: lots of white space, one accent colour, no decoration for its own sake.

## Rules
1. **Tokens only.** Colours, spacing, radii, shadows and type sizes come from `src/index.css` (`--brand`, `--text-2`, `--sp-4`, `--r-lg`, `--fs-sm` ...). No raw hex values in screens.
2. **Use the UI kit** in `src/components/ui` (`Button`, `IconButton`, `Card`, `PageHeader`, `SectionHeader`, `List`/`ListItem`, `Badge`, `Alert`, `EmptyState`, `ErrorState`, `Skeleton`, `Chip`/`ChipRow`, `Segmented`, `Field`/`Input`/`Select`/`Textarea`, `Avatar`). Extend the kit instead of writing one-off button or card styles.
3. **Icons:** `lucide-react` only, 18–20px, `strokeWidth` default. **No emojis anywhere in the UI.**
4. **Type:** Inter. Page title `--fs-xl` (mobile) / `--fs-2xl` (desktop), section title `--fs-md` semibold, body `--fs-sm`/`--fs-md`, meta `--fs-xs` `--text-3`. Sentence case everywhere ("Book a doctor", not "Book A Doctor").
5. **Surfaces:** page background `--bg`; content on white `Card`s with a 1px `--border`, radius `--r-lg`, no heavy shadows. Gradients are reserved for Nura.
6. **Spacing:** 16px page gutter on mobile, 24–32px on desktop; 12–16px between cards; sections separated by 24px.
7. **Colour meaning:** brand teal = primary action / selected; danger red = emergency only; amber = caution; never colour without a text label.
8. **Touch:** 44px minimum targets, 16px inputs, safe-area insets on fixed bars.
9. **States:** every async view has a `Skeleton` loading state, an `ErrorState` with retry and an `EmptyState` with a next step.
10. **Copy:** short, warm, plain language. Nura is the assistant's name ("Ask Nura", "Nura is typing").

## Nura
`<Nura size mood />` from `src/components/nura/Nura.jsx`. Moods: `idle`, `listening` (mic on), `thinking` (waiting for a reply), `speaking` (reply just arrived), `happy` (greeting / thanks), `concerned` (urgent or emergency reply). Use `still` in long lists.
