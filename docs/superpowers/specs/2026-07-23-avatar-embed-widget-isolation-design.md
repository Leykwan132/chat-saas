# Avatar Embed Widget Isolation Design

## Goal

Prevent KiloBot's regular website chat widget from appearing or initializing
inside `/avatar/embed/:publicKey`.

## Root Cause

`index.html` loads KiloBot's own `widget/v1.js` on every application route.
The script initializes before React resolves the route, creates a shadow-DOM
host, loads widget configuration and messages, and displays its launcher over
the Avatar iframe.

The Avatar page itself does not mount the website widget.

## Selected Approach

Add an opt-in route exclusion to the widget bootstrap.

KiloBot's script tag in `index.html` will declare:

```html
data-kilobot-exclude-path-prefix="/avatar/embed/"
```

At the beginning of `public/widget/v1.js`, after reading
`document.currentScript` and before reading visitor state or creating the
widget host, the script will:

1. read `data-kilobot-exclude-path-prefix`;
2. compare it with `window.location.pathname`;
3. return immediately when the pathname starts with the configured prefix.

The prefix includes its trailing slash, so `/avatar/embed/:publicKey` is
excluded without matching unrelated paths such as `/avatar/embedding`.

## Isolation Boundary

The exclusion is enabled only by KiloBot's application-shell script tag.
Generated customer website-widget snippets do not include the attribute and
retain their current behavior on every customer route.

The early return occurs before:

- creating or reading a website-widget visitor ID;
- creating `[data-kilobot-root]`;
- attaching a shadow root;
- loading widget configuration or messages;
- registering widget event listeners.

The Avatar iframe loads as its own document, so the initial pathname check
runs before any widget initialization.

## Rejected Approaches

CSS hiding is rejected because the website widget would still initialize,
persist visitor state, register listeners, and call its APIs.

Removing the widget from `AvatarEmbedPage` is rejected because the widget is
created outside React before the page mounts.

Replacing the static script tag with a route-specific dynamic loader is
rejected because it duplicates script construction in `index.html` and makes
the application's own widget configuration less declarative.

## Testing

Add a source contract proving that:

- `index.html` declares the exact exclusion prefix;
- the widget reads the exclusion attribute;
- the pathname guard appears before visitor-state creation and
  `[data-kilobot-root]`;
- customer-generated widget snippets do not include the exclusion attribute;
- the public Avatar route and shared `AvatarVideoStage` remain unchanged.

Run the focused isolation and widget-snippet tests, the Avatar regression
suite, widget regression tests, scoped ESLint where applicable, and the
production TypeScript/Vite build.

## Out of Scope

- Removing KiloBot's regular website widget from normal application routes.
- Changing customer website-widget installation snippets.
- Changing Avatar session, video, microphone, or feature-gate behavior.
- Deploying the application.
