---
name: SkinSafe AI
colors:
  surface: '#fef7ff'
  surface-dim: '#dfd7e5'
  surface-bright: '#fef7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f1ff'
  surface-container: '#f3ebf9'
  surface-container-high: '#ede5f3'
  surface-container-highest: '#e8e0ee'
  on-surface: '#1d1a24'
  on-surface-variant: '#4a4455'
  inverse-surface: '#332f39'
  inverse-on-surface: '#f6eefc'
  outline: '#7b7486'
  outline-variant: '#ccc3d7'
  surface-tint: '#7331df'
  primary: '#5300b7'
  on-primary: '#ffffff'
  primary-container: '#6d28d9'
  on-primary-container: '#dac5ff'
  inverse-primary: '#d3bbff'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#414141'
  on-tertiary: '#ffffff'
  tertiary-container: '#585858'
  on-tertiary-container: '#cfcfcf'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ebddff'
  primary-fixed-dim: '#d3bbff'
  on-primary-fixed: '#250059'
  on-primary-fixed-variant: '#5b00c5'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#fef7ff'
  on-background: '#1d1a24'
  surface-variant: '#e8e0ee'
typography:
  headline-xl:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-md:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Poppins
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  button-text:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 20px
  stack-gap: 16px
  section-gap: 32px
---

## Brand & Style

The design system is centered on a "Clinical-Chic" aesthetic—merging the rigorous reliability of dermatological science with the vibrant, fluid energy of modern skincare branding. It targets a Gen-Z and Millennial audience that prioritizes ingredient transparency, safety, and a premium digital experience.

The style is **Modern Corporate with a Tactile twist**, utilizing heavy whitespace, generous corner radii, and high-contrast typography to ensure extreme legibility. The UI should feel airy and professional, yet "squishy" and approachable through the use of soft shapes and playful interaction patterns. The goal is to evoke a sense of calm authority and effortless safety.

## Colors

The palette is dominated by a deep **Primary Purple**, used strategically to drive action and highlight key data. **White** serves as the structural foundation, creating a "clean room" feel, while **Black** provides high-contrast grounding for text and structural borders.

- **Primary**: Use `#6D28D9` for primary buttons, active navigation states, and scan progress indicators. Use lighter lavender tints (`#F5F3FF`) for subtle card backgrounds or secondary button states.
- **Safety Semantics**: These are non-negotiable for accessibility.
  - **Safe (Green)**: Use for approved ingredients and high safety scores.
  - **Caution (Yellow)**: Use for potential allergens or "use with care" warnings.
  - **Avoid (Red)**: Use for prohibited ingredients or severe irritant alerts.
- **Neutral**: Use a pure white background to maintain a clinical feel. Grays should be avoided in favor of varying opacities of black or tinted lavenders to keep the palette "clean."

## Typography

This design system utilizes **Poppins** for its friendly geometric character and strong mobile hierarchy. The type hierarchy is "Top-Heavy," meaning headlines are bolder and tighter than body text while remaining compact enough for small screens.

- **Headlines**: Use Bold (700) weight with slight negative letter-spacing to create a confident, modern look.
- **Body**: Maintain standard tracking and 1.5x line height to ensure ingredient lists and safety descriptions are easy to read during a quick scan.
- **Labels**: Use uppercase labels for category headers (e.g., "INGREDIENTS") to differentiate data types from descriptive text.

## Layout & Spacing

The layout follows a **Mobile-First Fluid Grid** with a specific focus on the "thumb-zone."

- **Safe Zones**: Maintain a 20px margin on the left and right of the viewport.
- **Stacking**: Use a base 8px rhythmic scale. Components are typically separated by 16px (stack-gap), while major logical sections are separated by 32px.
- **Floating Navigation**: The bottom navigation bar must be floating (detached from the bottom edge) with a 16px bottom margin to maintain the modern, airy aesthetic.

## Elevation & Depth

Depth is used sparingly but intentionally to separate the "Scanning" layer from the "Information" layer.

- **Surface Layer**: The main background is flat white.
- **Card Layer**: Cards use a subtle, extra-diffused shadow (`0px 10px 30px rgba(109, 40, 217, 0.05)`) to appear slightly lifted.
- **Floating Layer**: The Floating Action Button (FAB) and Bottom Nav use a higher elevation with a more pronounced shadow to indicate they sit above the content scroll.
- **Safety Tints**: Use extremely light background fills (e.g., 5-10% opacity of the semantic color) to group related safety information without adding heavy borders.

## Shapes

The shape language is **Ultra-Soft**. This counteracts the clinical nature of the product, making it feel more like a lifestyle companion.

- **Standard Elements**: Buttons and input fields use `rounded-lg` (16px).
- **Containers**: Product cards and result sheets use `rounded-2xl` (24px) or `rounded-3xl` (32px).
- **FAB**: The central 'Scan' button is a perfect circle to stand out from the rectangular navigation icons.

## Components

- **Buttons**:
  - **Primary**: Solid Primary Purple with white text. Height: 56px for high tap-target accessibility.
  - **Secondary**: Soft Lavender background with Primary Purple text.
- **Scanning FAB**: A large, circular purple button located in the center of the bottom nav. It should feature a high-contrast white "Scan" icon (e.g., a viewfinder or barcode icon).
- **Ingredient Chips**:
  - Small, rounded-full capsules. Use semantic colors for the background (Safe = Green background, 10% opacity; Dark Green text).
- **Product Cards**:
  - 2xl rounded corners, subtle shadow, and a clear safety badge in the top right corner.
- **Bottom Navigation**:
  - A floating "pill" or rectangular bar with 2xl roundedness. The center is recessed or raised to accommodate the FAB.
- **Safety Gauges**:
  - Circular progress rings or thick horizontal bars using the semantic color scale to visualize the overall safety score of a product.
- **Input Fields**:
  - Large (56px height) with 16px rounding. Use a 1px border in a very light purple-gray, which thickens to 2px Primary Purple on focus.

## Product screens

- **Home**: personal greeting, readiness summary, latest safety result, educational insight, and a prominent path to scan.
- **Scan**: camera/upload-first capture experience, alternative manual ingredient input, supported source guidance, and privacy reassurance.
- **History**: search and safety filters, chronological scan cards, score badges, and a clear empty state.
- **Profile**: skin profile summary, concerns and sensitivities, routine preferences, privacy controls, and editable settings.
- **Offline**: calm recovery state that explains which features need a connection and gives a clear retry/home action.

All screens must remain usable at 320px width, prioritize one-handed mobile interaction, and expand gracefully on tablet or desktop without turning into a desktop dashboard.
