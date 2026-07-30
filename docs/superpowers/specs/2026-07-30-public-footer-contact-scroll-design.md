# Public Footer Contact Scroll Design

## Goal

Ensure the public footer's Contact link opens the Contact page at the top, including when the user clicks it while already on `/contact`.

## Design

Reuse the `scrollToPageTop` handler already defined in `SiteFooter`. Attach it to the Contact link just as the neighboring Book a demo and Support links do.

The handler keeps the existing immediate behavior:

```ts
window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
```

No router-wide scroll behavior or Contact-page lifecycle behavior will change.

## Testing

Update the focused SiteFooter source contract so it requires all three Contact-page footer links to use `scrollToPageTop`:

- Contact
- Book a demo
- Support

Run the focused test with Node.js 22 and confirm it fails before the implementation and passes afterward.

## Release State

This customer-facing improvement remains unreleased until it is merged and its production availability is confirmed.
