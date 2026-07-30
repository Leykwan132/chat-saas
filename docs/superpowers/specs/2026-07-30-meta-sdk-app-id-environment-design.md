# Meta SDK App ID Environment Design

## Goal

Initialize the Facebook JavaScript SDK with the deployment's `VITE_META_APP_ID` value instead of a hard-coded Meta App ID.

## Design

Use Vite's native HTML environment replacement in `index.html` by setting `FB.init().appId` to `%VITE_META_APP_ID%`. Keep the existing SDK script loading order, SDK version, login options, and WhatsApp embedded-signup flow unchanged.

The frontend already resolves `VITE_META_APP_ID` when launching WhatsApp Embedded Signup and passes it to the backend token exchange. Using the same variable during `FB.init()` keeps the popup and token exchange on the same Meta application.

## Error Handling

No fallback is added. A deployment must provide `VITE_META_APP_ID`; configuration failures remain visible instead of silently selecting another Meta application.

## Verification

Add a focused contract test that fails while `index.html` contains the old hard-coded App ID and passes when `FB.init().appId` uses `%VITE_META_APP_ID%`. Run the focused test with Node 22, then run the production build with a test Meta App ID and confirm Vite replaces the placeholder in the built HTML.
