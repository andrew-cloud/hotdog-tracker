# Hotdog Slam — Feature Development Steering Doc

This doc is the canonical reference for how to design and ship new features in Hotdog Slam. Every feature — no matter how small — follows the same two-stage flow: **design in Figma first, implement in code second.** Nothing gets committed until the design has been reviewed and approved.

---

## The Figma File

**File:** Hot Dog DS  
**Key:** `YDg1p9T7MyTzu9130o9qjB`  
**Access:** [figma.com/design/YDg1p9T7MyTzu9130o9qjB](https://www.figma.com/design/YDg1p9T7MyTzu9130o9qjB)

The file is organized into pages. Each page owns one component or concept:

| Page | Contents |
|---|---|
| `App` | Full app mockup — the source of truth for layout and flow |
| `App-Specific` | One-off UI patterns that don't belong to the DS |
| `🔤 Type Ramp` | Typography scale and text styles |
| `🔘 Buttons` | Button component set |
| `📝 Form Elements` | Input, Textarea, Select, Radio, Checkbox, Toggle |
| `🗂 Tabs` | TabBar / tab rail |
| `🃏 Card` | Card shell component |
| `🍞 Toast` | Toast notification |
| `🔢 Stepper` | Numeric stepper |
| `📤 Upload Field` | UploadField component |
| `📐 Divider` | Horizontal/vertical divider |
| `👤 Avatar` | Avatar component — sm (24px), md (32px), lg (40px), xl (80px); image and initials variants |
| `🌭 Hotdog Tile` | GifTile — the media card shown in the gallery |

### GifTile rules

- **The gif-area must always expand to fit the full natural height of the GIF.** Never set a fixed height or use `objectFit: cover` on the GIF image — the tile grows with the content. A `minHeight` is only applied in the loading state so the spinner has room to breathe.

---

## Design Tokens

All components use CSS custom properties defined globally. Never hard-code a color — always reach for a token.

### Color tokens

| Token | Hex | Usage |
|---|---|---|
| `--text/primary` | `#f0ede6` | Dark-mode body text — shared with tabs/buttons; do **not** reuse for anything on the new light field/card system |
| `--text/secondary` | `#727272` | Secondary labels, subtitles — reads fine on both dark and the new light surfaces |
| `--text/tertiary` | `#727272` | Dates, captions, hints |
| `--brand/amber` | `#e8a44a` | Legacy accent — warning-tone subtitle text, no longer the primary button/focus accent |
| `--brand/orange` | `#F06705` | **New primary accent** — buttons, focus rings, active/selected states |
| `--brand/orange-hover` | `#D65C04` | Hover/pressed shade of the primary accent |
| `--surface/bg-app` | `#FFE548` | App/page background (flat accent, not aliased to the neutral scale) |
| `--surface/bg-primary` | `#101010` | Disabled-state fills, icon-on-color text (not the page background) |
| `--surface/bg-secondary` | `#181818` | Page/section background |
| `--surface/bg-tertiary` | `#212121` | Card media areas, inset areas |
| `--surface/border-default` | `#343434` | Borders, dividers, progress tracks |
| `--component/card-bg` | `rgba(253,243,237,0.9)` | Card background — cream fill at 90% opacity (default variant, 1px fill-border) |
| `--component/card-bg-elevated` | `rgba(253,243,237,0.85)` | Elevated card background — same cream, 85% opacity, 2px fill-border |
| `--component/card-fill-border` | `#FDF3ED` | Rim border on default (1px) / elevated (2px) — same hue as the fill, at full opacity |
| `--component/card-radius` | `24px` | Card corner radius, all sizes (flat, not aliased to the radius scale) |
| `--component/card-border` | `#343434` | Border used by the **outlined** variant only (no fill, so it keeps the neutral gray) |
| `--component/card-divider` | `#EEE4DF` | Row divider inside cards |
| `--component/card-header-bg` | `transparent` | Card header background — matches the card's own fill (card-bg / card-bg-elevated) showing through |
| `--component/card-header-border` | `#EEE4DF` | Header's bottom border — aliases `card-divider` so it matches the row dividers, not `border/default` |
| `--component/btn-primary-bg` | `#F06705` | Primary button fill — aliases `brand/orange` |
| `--component/btn-primary-bg-hover` | `#D65C04` | Primary button hover fill — aliases `brand/orange-hover` |
| `--component/btn-primary-text` | `#121212` | Primary button label — dark ink reads with higher contrast than white against the orange fill |
| `--component/input-bg` | `#FFFFFF` | Field fill for Input / Select / Textarea / `.ds-name-field` — clean white against the cream card |
| `--component/input-bg-focus` | `#FFFFFF` | Unchanged on focus — focus is communicated by the border only |
| `--component/input-border` | `#E4D6C7` | Field border — soft warm tan-gray; also used as Radio's unselected ring and the mood-picker's idle border |
| `--component/input-border-focus` | `#F06705` | Aliases `border/focus` → `brand/orange` |
| `--component/input-bg-error` | `#FDEAEA` | Light red tint (was aliasing a dark-mode-only red before this pass) |
| `--component/input-bg-success` | `#EAF6EC` | Light green tint (same reasoning as bg-error) |
| `--component/input-text` | `#121212` | Field value/selected text — dark ink; `text/primary` can't be reused here (shared with tabs/buttons) |
| `--component/upload-bg-default` / `-hover` / `-success` / `-error` | `#FFFFFF` / `#FDF6EF` / `#EAF6EC` / `#FDEAEA` | UploadField zone fills, mirrors the input bg system |
| `--component/upload-text` | `#121212` | UploadField label text (hover/selected/filled states) |

Card header title text (`.ds-card-title`, `.ds-streak-title`, `.ds-battle-title`, `.ds-champion-title`, and `Card.tsx`'s title) is `#121212` — same raw value as `.ds-standings-name` — rather than `--text/primary`, since that token is shared with tabs/buttons and would drag those along too. Header horizontal padding matches the body's horizontal padding (20px on `.ds-card-header`; `Card.tsx`'s `HEADER_PADDING` now derives its horizontal value from `PADDING[size]`).

The "Year of the Dog" app header (`.app-header`) has no background — it's transparent over the app background. Its title text is `#121212`.

**Log a Dog page / form-field system.** Select, Input, Textarea, Stepper's value display, UploadField, and Radio all moved from the old dark-theme field styling to the light system above (light card era, confirmed direction: "light, matching cards"). The same `--text/primary` collision that applies to card titles applies here too — none of these components read field value/label text from `--text/primary` anymore; they use the new `--component/input-text` (or `--component/upload-text`) token instead. `--border/focus` (and therefore `--component/input-border-focus` and `--component/upload-border-hover`) now resolves to `--brand/orange` instead of `--brand/amber` — this is the "new primary accent color for buttons/focus states/active states." Buttons keep using the same `--component/btn-primary-*` tokens as before; only their values changed. `.ds-mood-btn`'s hover/selected border previously read a `--accent` custom property that was never actually defined anywhere (a dead reference silently falling back to its hardcoded `#e8a44a` fallback) — fixed to reference `--brand/orange` directly.

### Radius tokens

| Token | Value | Usage |
|---|---|---|
| `--radius/sm` | `6px` | Small elements (inputs, badges) |
| `--radius/md` | `8px` | Buttons, chips |
| `--radius/lg` | `10px` | Cards, tiles |
| `--radius/xl` | `14px` | Bottom sheets, modals |

---

## Step 1 — Design in Figma

### Before you start

**Rule: all net new design work must use existing DS components, variables, and text styles wherever they exist. You must flag any missing components before creating custom elements.**

1. Search for existing DS components first. Use the `search_design_system` tool (or Figma's asset panel) to search by keyword before building anything custom.
2. If an existing component covers the need, place an **instance** of it — never recreate it from scratch using raw frames.
3. All fills must be bound to **color variables** (not raw hex). All text nodes must be linked to a **text style** from the type ramp.
4. If a required component does not exist, **flag it explicitly** (e.g. "⚠️ Needs: `header` App-Specific component") before proceeding. Create the missing component first, then use it.
5. If a new component is needed, identify which DS page it belongs to (or create a new one following the naming convention `emoji Name`).
6. If it's a one-off layout addition (not a reusable component), add it directly to the `App` page in the correct screen frame.

### Flagged components needed

The following patterns appear in screens but have not yet been promoted to reusable components:

| Pattern | Appears on | Priority |
|---|---|---|
| `header` — dark bar with "HOTDOG SLAM" wordmark | Every screen | High — create as App-Specific component |
| `chip` variant on `tab-item` — pill-shaped, left-aligned, hug-content tab (built in code in `Tabs.tsx`/`App.jsx`, not yet added to the Figma `tab-item` component set) | Top tab bar | Medium — add as a new variant on the existing `tab-item` component set |

### Creating a new DS component

1. **Navigate to the correct DS page** (or create a new page if this is a genuinely new component category).
2. **Create a Component Set** (`⌘ + Alt + K` to make a component, then add variants). Name the set in `kebab-case` (e.g. `gif-tile`, `upload-field`).
3. **Use Auto Layout** for all frames. Set `layoutMode = VERTICAL` or `HORIZONTAL`, add consistent padding (multiples of 4px), and use gap for spacing.
4. **Bind fills to variables** — every color fill should reference a design token variable, not a raw hex value.
5. **Add component properties** for variant dimensions that map directly to code props:
   - Use `VARIANT` for mutually exclusive states (e.g. `state = default | loading | error`)
   - Use `BOOLEAN` for show/hide toggles (e.g. `hasNotes`, `showHint`, `showLabel`)
   - Use `TEXT` for dynamic string content (e.g. `label`, `placeholder`)
6. **Typography** — always pick from the type ramp. Never set an ad-hoc font size. Text style names must be design-agnostic — they describe the visual role, not the context or component they appear in. Use terms like `display`, `header`, `body`, `label`, and `caption`. Never name a style after its usage (e.g. not `tile-date`, `card-subtitle`, or `hotdog-count-label`). The one exception to the 12px floor is `Type/Micro` (9px Semi Bold) — a documented exception reserved for non-critical, non-readable copy such as avatar initials, badge pips, and icon annotations where the text is decorative rather than informational.
7. **Screenshot and review** before moving to code. The Figma MCP `get_screenshot` tool can pull a live render into the chat for approval.

### Updating an existing component

1. Locate the component set node ID (via `search_design_system` or the layer panel).
2. Use `use_figma` to script the change programmatically, or edit manually in Figma.
3. Re-screenshot after the change to confirm the render looks right.
4. Check all instances on the `App` page to make sure the change propagates correctly.

---

## Step 2 — Implement in Code

### File locations

```
src/
  design-system/
    components/
      Button.tsx        ← one file per DS component
      GifTile.tsx
      Input.tsx
      Textarea.tsx
      UploadField.tsx
      ...
    index.ts            ← re-exports everything; update this when adding a component
  App.jsx               ← main app; imports from design-system
```

### Component conventions

Every DS component follows the same pattern:

```tsx
// 1. Types at the top
export type MyComponentState = "default" | "hover" | "disabled";

export interface MyComponentProps {
  state?:     MyComponentState;
  label?:     string;
  onChange?:  (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?:     React.CSSProperties;
}

// 2. Token maps — one object per visual attribute that changes by state
const BG: Record<MyComponentState, string> = {
  default:  "var(--surface/bg-secondary, #181818)",
  hover:    "var(--surface/bg-tertiary, #212121)",
  disabled: "var(--surface/bg-primary, #101010)",
};

// 3. Default export — inline styles only, no Tailwind, no CSS modules
export default function MyComponent({ state = "default", label, style }: MyComponentProps) {
  return (
    <div style={{ background: BG[state], borderRadius: "var(--radius/md, 8px)", ...style }}>
      {label}
    </div>
  );
}
```

Key rules:
- **Inline styles only.** No Tailwind, no CSS modules, no class names (except `className` passthrough for the outer wrapper).
- **Always fall back.** Every `var(--token)` call includes a hard-coded fallback: `var(--text/primary, #f0ede6)`.
- **State maps over conditionals.** Use a `Record<State, value>` lookup object instead of a chain of `if/else` or ternaries for visual state changes.
- **No magic numbers.** Spacing, font sizes, and radii should come from tokens or be documented inline.

### Adding a new prop to an existing component

1. Add the prop to the `interface`.
2. If the prop controls a visual state, add it to the relevant token map.
3. Add the rendered output — make sure it's conditional (`prop && <element>`) so it's invisible when not passed.
4. Export any new types from `design-system/index.ts`.

### Updating `design-system/index.ts`

Every new component and its types must be exported here:

```ts
export { default as MyComponent } from "./components/MyComponent";
export type { MyComponentProps, MyComponentState } from "./components/MyComponent";
```

---

## Step 3 — Database changes

If a new feature stores data, run a migration in the Supabase SQL editor for project `lrjydzmsqkfmenrtoklv`:

```sql
-- Always use IF NOT EXISTS / IF EXISTS to make migrations safe to re-run
ALTER TABLE entries ADD COLUMN IF NOT EXISTS my_new_field TEXT;
```

Check that the `sb.insertEntry()` call in `App.jsx` includes the new field.

---

## Step 4 — Deploy

**Never commit, push, or deploy without asking the user first — even if the change is verified and working.** Finish the work, confirm it builds/compiles, then stop and ask before touching git or running a deploy. Only proceed once the user explicitly says to commit/deploy.

All deployments are manual, run from your local terminal:

```bash
# 1. Commit the changes
git add <files>
git commit -m "feat: describe what changed"
git push origin main

# 2. Build and deploy frontend to GitHub Pages
npm run build && npm run deploy

# 3. If an edge function changed, redeploy it
npx supabase functions deploy <function-name> --no-verify-jwt

# 4. If the Mac Mini server changed, restart it
# (ssh into the server and restart the Node process)
```

---

## Feature checklist

Use this for every new feature before shipping:

- [ ] Figma component or frame created/updated
- [ ] Screenshot reviewed and approved
- [ ] DS component file created or updated
- [ ] `design-system/index.ts` updated if new exports
- [ ] `App.jsx` wired up (state, handlers, render)
- [ ] Database migration run (if applicable)
- [ ] Frontend deployed (`npm run build && npm run deploy`)
- [ ] Edge function redeployed (if applicable)
- [ ] Tested in browser on mobile viewport
