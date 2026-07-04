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
| `--text/primary` | `#f0ede6` | Main body text, names, labels |
| `--text/secondary` | `#a09cb8` | Secondary labels, subtitles |
| `--text/tertiary` | `#6b6882` | Dates, captions, hints |
| `--brand/amber` | `#e8a44a` | Hot dog counts, accents, progress |
| `--surface/bg-primary` | `#0e0e14` | App background |
| `--surface/bg-secondary` | `#13131a` | Page/section background |
| `--surface/bg-tertiary` | `#1e1e28` | Card media areas, inset areas |
| `--surface/border-default` | `#2e2e40` | Borders, dividers, progress tracks |
| `--component/card-bg` | `#16161d` | Card background |
| `--component/card-border` | `#2e2e40` | Card border |

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
  default:  "var(--surface/bg-secondary, #13131a)",
  hover:    "var(--surface/bg-tertiary, #1e1e28)",
  disabled: "var(--surface/bg-primary, #0e0e14)",
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
