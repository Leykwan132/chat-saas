# Telegram notifications page design

## Goal

Give each agent one dedicated Notifications page for managing notification recipients, while making it explicit that Telegram is the only supported channel today.

## Navigation and route

Add `Notifications` to the agent sidebar's Tools group immediately above `Broadcast`. It uses the Bell icon and the existing agent-management permission. The route is `/dashboard/:agentId/notifications`.

## Page

The page title is `Notifications`, using the standard compact dashboard title style. Its supporting line says `Telegram is currently the only supported notification channel.`

The existing Telegram recipient management experience moves from Agent Setup to this page unchanged in capability: add up to five phone numbers, share or regenerate verification links, enable or disable a subscription, send a test, and remove a recipient. The Telegram section remains in a bordered card consistent with existing settings surfaces.

## Source of truth

Agent Setup no longer renders the Telegram notifications section. Notifications is the sole dashboard location for recipient management. No Convex API, data model, delivery behavior, or verification behavior changes.

## Validation

Focused tests cover the registered route, the Tools navigation ordering and access requirement, and the dedicated page's Telegram-only copy and title treatment. Review confirms Agent Setup no longer renders the duplicate panel.
