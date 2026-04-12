```markdown

# Design System Strategy: The Elevated Academic



## 1. Overview & Creative North Star

The "Creative North Star" for this design system is **The Digital Curator**.



In an educational landscape often cluttered with information, this system acts as a sophisticated filter. It moves beyond the "standard dashboard" by treating data like an editorial spread in a high-end magazine. We break the "template" look through **intentional asymmetry**—offsetting headings and using varied column widths—to guide the eye naturally. By prioritizing breathing room (whitespace) over structural lines, we create an environment that lowers cognitive load and fosters deep focus. The aesthetic is "Soft Minimalism": precise, intentional, and premium.



## 2. Colors & Surface Philosophy

The palette utilizes a sophisticated range of soft neutrals punctuated by a vibrant, authoritative blue.



* **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined through background color shifts. Use `surface-container-low` (#f3f4f5) for secondary sections sitting on a `surface` (#f8f9fa) background.

* **Surface Hierarchy & Nesting:** Treat the UI as a series of physical layers.

* **Base:** `surface` (#f8f9fa)

* **Secondary Content Areas:** `surface-container` (#edeeef)

* **Elevated Components (Cards):** `surface-container-lowest` (#ffffff)

* **The "Glass & Gradient" Rule:** Floating elements, such as navigation overlays or popovers, should utilize Glassmorphism. Use `surface` at 80% opacity with a `24px` backdrop blur.

* **Signature Textures:** For primary actions, use a subtle linear gradient (135°) from `primary` (#0050cb) to `primary_container` (#0066ff). This adds a "soul" to the UI that flat colors cannot replicate.



## 3. Typography

The system employs a dual-typeface pairing to balance authoritative "Display" moments with highly legible "Utility" text.



* **Display & Headlines (Manrope):** Used for `display-lg` through `headline-sm`. Manrope’s geometric yet open counters feel modern and academic. Use `on_surface` (#191c1d) for maximum contrast.

* **Body & UI (Inter):** Used for all functional text (`body-lg` to `label-sm`). Inter provides exceptional readability at small sizes.

* **The Editorial Scale:** To create a signature look, exaggerate the scale between titles and body. A `display-md` (2.75rem) header should feel significantly more "important" than the `body-md` (0.875rem) text below it, creating a clear entry point for the user.



## 4. Elevation & Depth

Depth is achieved through **Tonal Layering** rather than structural geometry.



* **The Layering Principle:** Avoid shadows for static cards. Instead, place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f3f4f5) background. This creates a "soft lift" that feels architectural.

* **Ambient Shadows:** For active states or modals, use extra-diffused shadows.

* *Shadow Property:* `0 12px 32px -4px rgba(25, 28, 29, 0.06)`. The color is a tinted version of `on_surface`, making it feel like natural ambient light.

* **The "Ghost Border" Fallback:** If a container requires definition against a similar background, use `outline_variant` (#c2c6d8) at **15% opacity**. Never use 100% opaque borders.



## 5. Components



### Buttons

* **Primary:** Gradient from `primary` to `primary_container`. White text (`on_primary`). Roundedness: `md` (0.75rem).

* **Secondary:** Background `primary_fixed` (#dae1ff) with text `on_primary_fixed_variant` (#003fa4). No border.

* **Tertiary:** Ghost style. `on_surface_variant` text.



### Cards & Progress Modules

* **Structure:** No dividers. Separate content using the spacing scale (e.g., `spacing.5` between header and body).

* **Visual Shift:** Use `surface-container-high` (#e7e8e9) for small inset data points within a white card.



### Input Fields

* **Aesthetic:** "Soft Inset." Use `surface-container` (#edeeef) as the field background.

* **Focus State:** A 2px "Ghost Border" of `primary` at 40% opacity. No harsh outlines.



### Chips & Tags

* **Selection:** Use `secondary_container` (#9bb4fe) with `on_secondary_container` (#294487) text. Roundedness: `full`.



### Key Educational Components

* **Course Progress Bar:** Use a wide, 12px height bar. Background: `surface-variant`. Fill: `primary` gradient.

* **Focus Modals:** Use full-screen `surface` backgrounds with 10% opacity `primary_fixed` overlays to dim the background, keeping the student's eyes on the task.



## 6. Do’s and Don’ts



### Do

* **Do** use asymmetrical layouts. For example, a 60% width main content area paired with a 30% width sidebar, leaving 10% as "dead" whitespace to frame the content.

* **Do** use `surface-container-highest` for subtle hover states on list items.

* **Do** use the `spacing.8` (2.75rem) token for major section margins to ensure "airiness."



### Don’t

* **Don't** use black (#000000) for text. Use `on_surface` (#191c1d) to maintain a soft, professional look.

* **Don't** use 1px horizontal lines to separate list items. Use vertical spacing (`spacing.4`) and background color shifts.

* **Don't** use sharp corners. Every component must adhere to the `md` (0.75rem/12px) or `lg` (1rem/16px) roundedness scale.



---

*This design system is designed to evolve. When in doubt, prioritize whitespace over structure.*```