# Recipe Format Guide for MMM-Receptbok

Use this document when formatting recipes for the Receptbok recipe display system.
Paste any recipe text (from websites, books, or handwritten notes) and ask Claude to
format it according to this specification.

## JSON Schema

Each recipe is a single `.json` file stored in `modules/MMM-Receptbok/recipes/`.

```json
{
  "id": "slug-name",
  "title": "Display Title (Native Name)",
  "tags": ["tag1", "tag2", "tag3"],
  "servings": "number + unit",
  "prepTime": "active hands-on time",
  "totalTime": "including resting/baking",
  "ingredients": [
    {
      "group": "Group Name",
      "items": ["quantity + unit + ingredient"]
    }
  ],
  "steps": [
    "One complete action per step."
  ],
  "tips": "Optional practical notes."
}
```

## Field Rules

### id
- Lowercase, hyphens for spaces: `kanelbullar`, `chicken-tikka-masala`
- Must match the filename (without `.json`)
- Use the primary/native name when possible

### title
- Display title in English with native name in parentheses if applicable
- Examples: `"Kanelbullar (Cinnamon Buns)"`, `"Arroz con Pollo (Chicken Rice)"`

### tags
- Always lowercase
- Use plural form: `"desserts"` not `"dessert"`
- Include: cuisine origin, meal type, season, dietary info, occasion
- Common tags: `swedish`, `colombian`, `baking`, `christmas`, `easter`, `summer`,
  `vegetarian`, `vegan`, `quick`, `fika`, `dinner`, `lunch`, `appetizers`,
  `desserts`, `bread`, `soups`, `salads`, `seafood`, `pasta`

### servings
- Number + unit: `"12 pieces"`, `"4 servings"`, `"1 loaf"`, `"6 portions"`

### prepTime / totalTime
- Human-readable: `"20 min"`, `"45 min"`, `"1½ hours"`, `"2 hours"`
- prepTime = active hands-on time
- totalTime = including passive time (rising, baking, chilling)

### ingredients
- Array of groups, each with a `group` name and `items` array
- **When to split into groups:** If the recipe has 2+ distinct components
  (dough + filling, marinade + sauce, crust + filling + topping)
- **Single group:** Use `"group": "Ingredients"` if no logical split
- **Item format:** `"quantity unit ingredient, preparation"`
  - `"500g plain flour"`
  - `"2 cloves garlic, minced"`
  - `"1 tbsp olive oil"`
  - `"Salt and pepper to taste"`
- No abbreviations beyond standard: g, kg, ml, L, tbsp, tsp, cm
- Spell out numbers under 10 only for non-measurements: `"Pinch of salt"`

### steps
- One logical action per step
- Use active voice: "Mix..." not "The flour is mixed..."
- Include specific temperatures in °C: "Preheat oven to 180°C"
- Include specific times: "Knead for 10 minutes" not "Knead until done"
- Include visual/tactile cues: "until golden brown", "until doubled in size"
- Keep steps concise but complete — each should be self-contained
- Aim for 5–10 steps for a typical recipe (fewer for simple, more for complex)
- Order: prep → combine → cook → assemble → serve

### tips
- Optional but encouraged
- Brief practical notes that aren't obvious from the steps
- Storage advice, substitutions, common mistakes, serving suggestions
- Keep to 1–3 sentences

## Pagination Awareness

Recipes display on a fixed-size screen (1024×768 portrait). The system paginates
automatically, but aim to keep recipes concise:
- Under 6 steps + moderate ingredients = single page (ideal)
- 7–12 steps = 2 pages (common)
- 13+ steps = 3 pages (keep to a minimum, consider simplifying)

## Example: Raw Input → Formatted Output

### Input (pasted from a website):

```
Swedish Meatballs
Makes about 30 meatballs, serves 4

For the meatballs you need 500g minced beef/pork mix, 1 egg, 3 tablespoons breadcrumbs,
3 tablespoons milk, half a finely chopped onion, salt, pepper, and a pinch of allspice.
For the cream sauce: 2 tbsp butter, 2 tbsp flour, 400ml beef stock, 100ml cream,
soy sauce to taste.

Soak breadcrumbs in milk. Mix all meatball ingredients together. Shape into small balls.
Fry in butter until browned on all sides, about 8 minutes. Remove meatballs.
Make sauce: melt butter in same pan, stir in flour, add stock gradually while stirring.
Simmer 5 min. Add cream and soy sauce. Return meatballs to sauce. Serve with mashed
potatoes, lingonberry jam, and pickled cucumber.

Tip: Don't make them too big - slightly smaller than a golf ball is perfect.
Chill the mixture for 30 min before shaping for easier handling.
```

### Output:

```json
{
  "id": "swedish-meatballs",
  "title": "Köttbullar (Swedish Meatballs)",
  "tags": ["swedish", "dinner", "christmas", "comfort-food"],
  "servings": "4 servings (about 30 meatballs)",
  "prepTime": "30 min",
  "totalTime": "50 min",
  "ingredients": [
    {
      "group": "Meatballs",
      "items": [
        "500g minced beef and pork mix",
        "1 egg",
        "3 tbsp breadcrumbs",
        "3 tbsp whole milk",
        "½ onion, finely chopped",
        "1 tsp salt",
        "½ tsp black pepper",
        "Pinch of ground allspice"
      ]
    },
    {
      "group": "Cream Sauce",
      "items": [
        "2 tbsp butter",
        "2 tbsp plain flour",
        "400ml beef stock",
        "100ml double cream",
        "1–2 tsp soy sauce"
      ]
    }
  ],
  "steps": [
    "Soak the breadcrumbs in milk for 5 minutes until softened.",
    "Combine the minced meat, egg, soaked breadcrumbs, chopped onion, salt, pepper, and allspice in a large bowl. Mix until just combined — do not overwork.",
    "Shape into small balls, slightly smaller than a golf ball (about 3 cm diameter). You should get approximately 30.",
    "Fry the meatballs in butter over medium-high heat for 8 minutes, turning frequently until browned on all sides. Remove and set aside.",
    "In the same pan, melt 2 tbsp butter. Stir in the flour and cook for 1 minute.",
    "Gradually add the beef stock while stirring continuously to avoid lumps. Simmer for 5 minutes until thickened.",
    "Stir in the cream and soy sauce. Return the meatballs to the sauce and simmer gently for 5 minutes.",
    "Serve with mashed potatoes, lingonberry jam, and pickled cucumber."
  ],
  "tips": "Chill the mixture for 30 minutes before shaping for easier handling. Wet your hands slightly when rolling to prevent sticking. These freeze well — freeze before adding to sauce."
}
```

## Prompt Template

When formatting a recipe, use this prompt:

> Format this recipe according to RECIPE_FORMAT.md for MMM-Receptbok. Output only the JSON file content,
> ready to save as `[slug].json` in the recipes directory.
>
> [paste recipe text here]
