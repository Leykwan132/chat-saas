# Push notifications

Push delivery uses the existing notification workpool, a Node action with
`web-push`, and the app service worker.

## Development setup

Use Node 22 and install the pinned dependencies with `bun install`. Generate
a VAPID key pair once with `bunx web-push generate-vapid-keys --json`. Keep the
private key confidential and retain this pair across deployments.

Configure these variables on the development Convex deployment.

| Variable                | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `WEB_PUSH_PUBLIC_KEY`   | Generated VAPID public key                                         |
| `WEB_PUSH_PRIVATE_KEY`  | Generated VAPID private key                                        |
| `WEB_PUSH_SUBJECT`      | Contact URI such as `mailto:support@kilobot.app`                   |
| `APP_BASE_URL`          | Native app origin, normally `https://kilobot.app`                  |
| `WEB_PUSH_LOCAL_ORIGIN` | Optional exact development origin, such as `http://localhost:5173` |

Deploy the development Convex functions and frontend, then open an agent’s
Notifications page. Choose **Enable on this device**, allow the browser prompt,
and send a test notification. A queued test is accepted by the push service
only when its delivery status changes to **Accepted by push service**.

On iPhone and iPad, install the app on the Home Screen and open that installed
app before enabling notifications. Test on a physical device.

## Behavior

Each device has separate agent subscriptions and notification-type preferences.
Alerts cover human escalations and booking creation, changes and cancellations.
Push settings operate independently of Telegram.

Notifications use the subscribed origin’s branding. Delivery checks current
membership, role access, partner account and domain status. Lock-screen text
contains generic event descriptions. Customer messages are not included.

Clicking an alert opens its same-origin inbox or calendar page. The destination
is retained through sign-in. Explicit logout unsubscribes the browser and
removes its device record.

Failed transient sends retry through the workpool. Responses with status
404 or 410 remove the expired device and its subscriptions. Event keys prevent
duplicate queue entries, and notification tags replace repeated deliveries
after an ambiguous network failure. Delivery records expire after seven days.

VAPID key rotation requires enabling notifications again on existing devices.
