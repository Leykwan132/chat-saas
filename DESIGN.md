# Installation Page Design Specification

## 1. Overview
This document specifies the design for the "Installation" documentation page, guiding users through setting up the shadcn/ui library. It aims to provide clear, efficient, and consistent installation instructions across various project types and frameworks.

## 2. Experience Goals
*   **Clarity:** Provide straightforward, easy-to-follow installation instructions.
*   **Efficiency:** Enable users to quickly find relevant installation methods.
*   **Consistency:** Maintain a consistent visual and interactive experience with the broader documentation site.

## 3. Information Architecture
The page is structured to guide users through different installation paths:
*   **Header:** Global navigation, search, and theme toggles.
*   **Sidebar:** Primary documentation navigation.
*   **Main Content:** Installation instructions, categorized by method.
*   **Footer:** Copyright and external links.

## 4. Layout System
The page uses a two-column layout: a fixed-width sidebar for navigation and a main content area.
*   **Sidebar Width:** `--sidebar-width: calc(var(--spacing) * 72)` (standard), `--sidebar-width-icon: 3rem` (collapsed).
*   **Layout Patterns:** Confirm during design review.

## 5. Section-by-Section Design Spec
*   **Header:** Includes site logo, navigation links (Docs, Components, Blocks, Charts, Directory, Create), search, GitHub star count, layout toggle, and theme toggle.
*   **Main Content:**
    *   `H1`: "Installation" with a descriptive paragraph.
    *   `H2`: "Use shadcn/create" (visual builder).
    *   `H2`: "Use the CLI" (command-line instructions).
    *   `H2`: "Existing Project" (adding to existing apps).
    *   `H2`: "Choose Your Framework" (framework-specific guides).
*   **Sidebar:** Hierarchical list of documentation topics and components.
*   **Footer:** Links to shadcn, Vercel, and GitHub.

## 6. Component Inventory
*   **Header Navigation:** Buttons, links, search input.
*   **Sidebar Navigation:** Nested list of links.
*   **Cards:** For highlighting installation methods.
*   **Buttons:** Standard interactive elements.
*   **Icons:** Used for UI elements (e.g., menu, search, theme toggle).

## 7. Visual Design Specification

### 7.1. Design System Tokens
*   **Colors:**
    *   `--color-text-light`: `#e1e4e8`
    *   `--color-text-dark`: `#1f2328`
    *   `--color-bg-dark`: `#24292e`
    *   `--color-bg-light`: `#ffffff`
*   **Typography:**
    *   `--font-sans`: "Geist", ui-sans-serif, system-ui, sans-serif
*   **Spacing:** Confirm specific values for margins, padding, and gutters.
*   **Border Radius:** fix at fully rounded for main button. but rounded-sm for minor button.
*   **Shadows:** No Shadows.

### 7.2. Typography
*   **Headings:** Use `var(--font-sans)` ("Geist").
*   **Body Text:** Use `var(--font-sans)` ("Geist").

### 7.3. Color and Surfaces
*   **Background:** `var(--color-bg-light)` for light mode, `var(--color-bg-dark)` for dark mode.
*   **Text:** `var(--color-text-dark)` for light mode, `var(--color-text-light)` for dark mode.
*   **Surfaces:** Confirm specific colors for cards and other elevated elements.

### 7.4. Spacing and Rhythm
*   All spacing values (margins, padding, gutters) to be confirmed.

### 7.5. Component Styling
*   **Buttons:** Confirm styles for primary, secondary, and ghost buttons.
*   **Cards:** Confirm background, border, shadow, and padding.

### 7.6. Responsive Behavior
*   **Breakpoints:** Confirm specific breakpoints and media queries.
*   **Adaptation:** Sidebar should collapse on smaller viewports.

### 7.7. Interaction States
*   **Hover:** Clear visual feedback for links and interactive elements.
*   **Focus:** Visible focus indicators for all interactive elements.
*   **Dark Mode:** Supported via a class or `data-theme` attribute.

### 7.8. Imagery
*   No images detected on the page. Confirm if any imagery is intended.

### 7.9. Icons
*   Utilize inline SVG icons for UI elements.

## 8. Content Requirements
*   **H1:** "Installation"
*   **Meta Description:** "How to install dependencies and structure your app."
*   Content must be clear, concise, and actionable.

## 9. Accessibility Requirements
*   All interactive elements
