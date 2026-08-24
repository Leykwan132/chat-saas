# Booking agent onboarding

## Goal

Let a person fully set up a bookable AI agent while creating it: confirm their availability, optionally add their first service, and optionally enable a ready booking workflow action.

## Flow

Support retains the existing Identity → Goal → Create Agent path.

Book a Service becomes Identity → Goal → Set your availability → Create a service. The availability screen uses the existing weekly availability table, with Monday through Friday set to 9:00am–5:00pm and Saturday/Sunday unavailable. Availability is always created when the agent is created; this screen only lets the creator customise the starting schedule.

The Create a service step is optional. It contains a small form with a service name and duration (default 30 minutes), plus an **Enable appointment booking** switch, on by default. Its primary action is **Create Agent**. It atomically creates the agent, selected availability, an active service assigned only to the creator, and, when the switch is on, a ready Book appointment action immediately after the workflow start node. The action retains the existing customer-intent condition and requires explicit slot confirmation. **Skip for now** immediately creates the agent and selected availability, without a service or booking action.

## Data and workflow behavior

The agent creation mutation accepts optional booking-onboarding data only for the `bookService` goal. It persists the creator's selected shifts while creating their personal schedule, then creates the optional service and workflow node in the same transaction. The booking node is constrained to the newly created active service and has its readiness recalculated before the mutation returns.

The shared default for newly provisioned schedules changes to Monday–Friday, 9:00am–5:00pm. That includes schedules provisioned for current members when an agent is created and schedules provisioned for a new member when they accept an invite to an existing workspace. Each member has an independent schedule per agent and can edit it later. New members are not automatically assigned to a service created by this onboarding flow; the service remains creator-only until changed deliberately.

## UI and testing

The wizard state/model adds booking-only availability and service steps while preserving the existing support path and creation animation. The shared availability editor remains the single visual table implementation. Focused frontend tests cover branching, weekday defaults, skip-direct creation, service form copy, and switch state. Convex tests cover atomic persistence of shifts, self-only service assignment, ready booking-node setup, and invite-time weekday default schedules. Existing support creation behavior remains covered.
