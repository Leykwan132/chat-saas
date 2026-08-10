# Landing Hero SEO Copy Design

## Goal

Make Kilobot's landing page immediately understandable to customers and search engines while preserving the five-minute, no-complex-setup onboarding promise.

## Approved copy

- Hero heading: `AI Agent for Every Inbox`
- Hero description: `Handle customer support and sales conversations in one place. No complex setup—get started in just 5 minutes.`
- Page title: `Kilobot | AI Agent for Every Inbox`
- Meta, Open Graph, and Twitter description: `Kilobot’s AI chatbot handles customer support and sales conversations in one place. No complex setup—get started in just 5 minutes.`

## Design

The existing LandingHero remains the landing page's single, prominent H1. Its wording positions Kilobot as an inbox-first AI agent. The supporting description communicates support and sales coverage while removing setup friction.

The static homepage metadata will use the same inbox-first AI-agent title and a description containing the AI-chatbot keyword, support/sales coverage, and setup promise. The existing social preview image and URL remain unchanged.

## Verification

A source-level regression test will assert the hero heading, two-row description, homepage title, descriptions, and social titles. The focused Vitest suite and production build will run under Node 22.
