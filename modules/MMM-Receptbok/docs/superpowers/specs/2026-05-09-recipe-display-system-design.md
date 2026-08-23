# MMM-InfoCentral: Recipe Display System

**Date:** 2026-05-09
**Status:** Design approved

## Summary

Transform MMM-InfoCentral from an image viewer into a recipe display system. Recipes are stored as JSON files, rendered as paginated HTML pages with a Claude-artifact-inspired theme (warm cream background, serif headings, warm brown palette), and navigated via GPIO buttons or a mobile web remote.

## Goals

1. Display recipes on the MagicMirror in a clean, readable format optimized for kitchen use
2. Allow recipe input via two paths: Claude-assisted formatting and a mobile web form
3. Provide a searchable, tag-filtered recipe index on the mobile remote
4. Support both direct recipe selection (mobile) and sequential cycling (GPIO)
5. Paginate long recipes with clear page indicators

## Non-Goals

- No user accounts or authentication (single-household use)
- No recipe scraping/import from URLs (paste text manually)
- No image support in recipes (text-only for v1)
- No editing recipes on the mirror itself (input via mobile or file)

---

## Architecture

### Storage

- **Location:** `modules/MMM-InfoCentral/recipes/*.json`
- One file per recipe, filename is a slug (e.g. `kanelbullar.json`)
- Tags stored as metadata arrays within each recipe file
- No separate database or category files — the index is built dynamically

### Recipe JSON Schema

```json
{
  "id": "kanelbullar",
  "title": "Kanelbullar (Cinnamon Buns)",
  "tags": ["swedish", "baking", "fika", "christmas"],
  "servings": "12 pieces",
  "prepTime": "45 min",
  "totalTime": "1½ hours",
  "ingredients": [
    {
      "group": "Dough",
      "items": ["500g plain flour", "240ml whole milk", "75g butter, melted"]
    },
    {
      "group": "Filling",
      "items": ["75g soft butter", "3 tbsp ground cinnamon", "50g demerara sugar"]
    }
  ],
  "steps": [
    "Warm the milk to 37°C. Stir in yeast and sugar until dissolved.",
    "Combine flour, cardamom, and salt. Add milk mixture and melted butter. Knead 10 minutes.",
    "Cover and rise 1 hour until doubled."
  ],
  "tips": "Don't over-knead — the dough should be slightly tacky."
}
```

**Field rules:**
- `id`: lowercase slug, matches filename (without .json)
- `title`: display name, may include native language in parentheses
- `tags`: lowercase, plural form preferred (e.g. "desserts" not "dessert")
- `ingredients`: array of groups; use a single group named "Ingredients" if no logical sub-groups
- `steps`: array of strings, one logical action per step, include temperatures and times
- `tips`: optional string, brief practical notes

### Server (node_helper.js)

**HTTP Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/infocentral/recipes` | List all recipes (id, title, tags) |
| GET | `/infocentral/recipes/:id` | Get full recipe JSON |
| GET | `/infocentral/tags` | List all unique tags with counts |
| POST | `/infocentral/recipes` | Create/save a new recipe |
| GET | `/infocentral/button/next` | Simulate Next button press |
| GET | `/infocentral/button/return` | Simulate Return button press |
| POST | `/infocentral/show/:id` | Send specific recipe to display |

**Socket Notifications (to frontend):**

| Notification | Payload | Purpose |
|--------------|---------|---------|
| `RECIPE_LIST` | `[{id, title, tags}]` | Initial recipe index |
| `SHOW_RECIPE` | `{recipe, page, totalPages}` | Display a specific recipe page |
| `NEXT_PAGE` | `{page, totalPages}` | Advance within current recipe |
| `RETURN` | `{}` | Hide recipe, return to mirror |

**Responsibilities:**
- Read recipes from disk on startup and when notified of changes
- Paginate recipe content based on estimated display height
- Handle GPIO button presses (Next = next page or next recipe; Return = hide)
- Serve the mobile remote HTML

### Frontend (MMM-InfoCentral.js)

**State:**
- `currentRecipe`: the active recipe object (or null)
- `currentPage`: which page of the recipe is displayed (1-based)
- `totalPages`: total pages for current recipe
- `isActive`: whether a recipe is being displayed
- `recipeList`: ordered list of all recipe IDs for sequential cycling

**Rendering:**
- `getDom()` builds the recipe HTML using the Claude-artifact theme
- Fullscreen display with the header band (title, meta) + body (ingredients groups, steps, tips)
- Page indicator shown in header band (e.g. "Page 1 of 3")
- Content for each page is pre-calculated by the server

**Navigation logic:**
- **Next button (GPIO or HTTP):**
  - If not active → show first recipe, page 1
  - If active and more pages → next page
  - If active and last page → next recipe in list, page 1
- **Return button (GPIO or HTTP):**
  - Hide recipe display, return to normal mirror
- **Show specific recipe (from mobile):**
  - Set active, show recipe page 1

### Display Theme

Based on Claude's artifact styling:
- **Background:** `#FAF7F2` (warm cream)
- **Header band:** gradient from `#d4a574` to `#8b5e3c` (warm brown)
- **Title font:** Georgia/serif, bold
- **Body font:** system sans-serif for readability
- **Section headers:** uppercase, letter-spaced, warm brown (`#6b4c2a`)
- **Ingredient bullets:** warm accent (`#c4956a`)
- **Step numbers:** circles with `#d4a574` background
- **Tips:** left-bordered box with cream highlight background
- **Page indicator:** subtle text in header band

### Mobile Remote (remote_control.html)

**Sections:**

1. **Recipe Index** (main view)
   - Search bar (filters by title and tags)
   - Tag filter chips (tap to toggle)
   - Recipe list (tap to send to mirror)
   - Each entry shows: title, tags, prep time

2. **Add Recipe** (form view)
   - Fields: title, servings, prep time, total time
   - Dynamic ingredient groups (add group, add items within group)
   - Steps (ordered list, add/remove/reorder)
   - Tips (optional textarea)
   - Tags (multi-select from existing + add new)
   - Preview button (shows how it will look)
   - Save button (POST to server)

3. **Controls** (bottom bar, always visible)
   - Next Page / Previous Page buttons
   - Return button
   - Currently displaying indicator

### RECIPE_FORMAT.md

A Markdown file stored at `modules/MMM-InfoCentral/RECIPE_FORMAT.md` that serves as a prompt reference for Claude-assisted recipe formatting. Contains:

- The exact JSON schema with all fields and types
- Writing style rules for steps (active voice, include temps/times, one action per step)
- Ingredient formatting conventions (quantity + unit + item, no abbreviations)
- When to split into ingredient groups (2+ distinct components)
- Tag conventions (lowercase, list of existing/common tags)
- A complete input→output example
- Edge cases (e.g. recipes with multiple yield options, optional ingredients)

---

## Pagination Strategy

The server pre-splits recipe content into pages. Algorithm:
1. Header band (title + meta) is always shown on every page
2. Ingredients section: fits on page 1 (if the ingredient list is very long, it continues to page 2)
3. Steps: fill remaining space on current page, overflow to next page(s)
4. Tips: appear on the last page after steps
5. Page split point: after complete steps (never mid-step)
6. Target: approximately 6-8 steps per page depending on length

The server sends pre-rendered page content to the frontend rather than having the frontend split dynamically — this keeps the display logic simple and deterministic.

---

## Navigation Modes

### Sequential Mode (GPIO only, no mobile interaction)
1. Press Next → shows first recipe in alphabetical order, page 1
2. Press Next → next page (or next recipe if at last page)
3. Press Return → hide, back to mirror

### Direct Mode (mobile selects recipe)
1. User taps recipe on mobile → mirror shows that recipe, page 1
2. GPIO Next or mobile Next → page through recipe
3. GPIO Return or mobile Return → hide

### Combined
- Mobile selection overrides sequential position
- After mobile-selected recipe ends, sequential continues from that recipe's position in the list

---

## Error Handling

- **No recipes on disk:** Display "No recipes found. Add recipes via the mobile remote or RECIPE_FORMAT.md"
- **Recipe JSON parse error:** Skip that file, log warning, continue with others
- **GPIO unavailable:** Log warning, continue (HTTP endpoints still work)
- **Mobile unreachable:** Mirror functions independently via GPIO

---

## File Structure

```
modules/MMM-InfoCentral/
├── MMM-InfoCentral.js          # Frontend module
├── MMM-InfoCentral.css         # Display styles (Claude theme)
├── node_helper.js              # Backend: GPIO, HTTP API, pagination
├── package.json                # Dependencies
├── remote_control.html         # Mobile remote (index + form + controls)
├── RECIPE_FORMAT.md            # Instructions for Claude-assisted formatting
├── recipes/                    # Recipe JSON files
│   ├── kanelbullar.json
│   ├── pepparkakor.json
│   └── ...
└── images/                     # (legacy, kept for backwards compat)
    └── .gitkeep
```

---

## Dependencies

- `onoff` (existing) — GPIO button reading on Raspberry Pi
- No new dependencies needed — recipe rendering is pure HTML/CSS in the frontend
