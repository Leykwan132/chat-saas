# Combined Kilobot workspace access

2026-11-17: User chose one connection exposing personal and connected organizational workspace together.

Keep the existing OAuth organization, consent and revocation checks. Add the authenticated user's personal team as an additional authorized scope. Personal data uses an empty organization ID and must always match the authenticated WorkOS user; channels must match their connecting user. Do not grant other organizations or other users' personal data. Preserve existing tool inputs and result contracts, labelling discovered agent names by workspace. Page organization agents then personal agents using the existing signed cursor envelope. Search and conversation responses identify their actual workspace.

- [x] Add failing combined-discovery, pagination, personal-read and ownership-isolation tests.
- [x] Extract shared test fixture and implement personal scope authorization and paginated discovery.
- [x] Verify integration tests, scoped formatting and file lengths; deploy development backend and smoke-test the connected tool.

No production release; record development availability in CONTINUITY.md.
