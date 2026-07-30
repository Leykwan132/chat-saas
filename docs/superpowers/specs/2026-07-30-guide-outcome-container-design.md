# Guide Outcome Container Design

## Goal

Make the `By the end, you will` preview the strongest visual element near the top of every instructional guide. The introduction remains supporting context; the outcome container tells readers immediately what completing the guide gives them.

## Scope

Apply one shared outcome container to all 25 instructional guides already covered by the outcome content contract.

Keep these pages excluded:

- `start-here/welcome.mdx`
- `start-here/launch-guide.mdx`
- `releases/changelog.mdx`

Do not change the approved outcome wording, Quick Start introduction, navigation, prerequisites, instructional steps, media briefs, or success criteria.

## Approaches Considered

### Shared borderless outcome component

Wrap the existing Markdown heading and bullets in one reusable component with a focused muted surface. This is the selected approach because it creates one consistent container without duplicating presentation rules or removing the heading from the page structure.

### Bordered card

A bordered card would separate the outcomes clearly, but it conflicts with the approved borderless guide system and would reintroduce the visual treatment the documentation cleanup removed.

### Colored accent panel

A branded or semantic color would attract attention, but it could imply a status such as success, warning, or information. The outcomes are orientation content, so a neutral focused surface is more accurate.

## Component

Create `DocOutcomes` as a small semantic wrapper:

- Render a `<section>` around its children.
- Accept only `children`.
- Keep the literal `### By the end, you will` heading and Markdown list inside each MDX file so Docusaurus continues to include the heading in the right-side page outline.
- Import `DocOutcomes` explicitly in every included guide.

Each guide uses:

```mdx
<DocOutcomes>

### By the end, you will

- Existing approved outcome
- Existing approved outcome
- Existing approved outcome

</DocOutcomes>
```

## Visual Treatment

The container is intentionally more prominent than the introduction and surrounding body content:

- Border: none
- Background: a stronger neutral muted surface that works in light and dark themes
- Border radius: `16px`
- Desktop padding: `28px`
- Mobile padding below `640px`: `20px`
- Outer spacing: `24px` above and `32px` below
- Heading: no top margin, `12px` below the heading
- List: no bottom margin and normal readable indentation
- Bullets: comfortable vertical separation without enlarging the text

The container must not use an icon, gradient, shadow, stripe, accent border, or status color. Its focus comes from surface contrast, spacing, and grouping.

## Reading Order

Every included guide keeps this order:

1. Page title
2. Verification date when present
3. One short introduction
4. Focused `DocOutcomes` container
5. Prerequisites when present
6. First instructional section

The right-side outline continues to show `By the end, you will`.

## Responsive Behavior

At desktop widths, the container fills the article column and aligns with the body text.

At a `390px` viewport:

- The container stays within the article width.
- It uses `20px` internal padding.
- Text and bullets wrap naturally.
- The page has no horizontal overflow.

## Testing

Extend the existing outcome content contract to confirm:

- All 25 included guides import and render exactly one `DocOutcomes`.
- The outcome heading and its three approved bullets are inside the container.
- The three excluded pages do not import or render `DocOutcomes`.
- The heading still appears before prerequisites or the first instructional section.

Extend the rendered component test to confirm `DocOutcomes` renders a semantic section with its children.

Extend the visual-system contract to confirm the shared container:

- Has no border.
- Uses a neutral background.
- Uses a `16px` radius.
- Uses `28px` desktop padding.
- Uses `20px` mobile padding below `640px`.

Run all documentation tests, rendered component tests, TypeScript, and the Docusaurus production build under Node 22. Visually verify Quick Start and representative guides in light and dark desktop themes and at `390px`.

## Release Status

This remains an unreleased documentation presentation improvement. Record it in `CONTINUITY.md`; do not add it to the public changelog until production availability is confirmed.
