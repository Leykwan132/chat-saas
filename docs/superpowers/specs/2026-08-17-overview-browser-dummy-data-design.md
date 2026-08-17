# Overview Browser Dummy Data Design

## Goal

Let a tester render representative Common Topics and Customer Sentiment data without writing to Convex.

## Behavior

The Agent Overview page reads `dummyData=true` from its URL search parameters only in local development. When present, it passes a fixed seven-topic distribution, a positive/neutral/negative sentiment distribution, and enabled analytics entitlement to the existing topics-and-sentiment component. No queries, records, or global application state change. Removing the parameter immediately returns the page to the live analytics response.

## Validation

A pure resolver test proves the URL-mode data replaces only the two panel inputs and normal mode preserves live values. The existing Agent Overview page test confirms the browser search-parameter integration.
