# Documentation

## Design record

Each feature in this project started as a written spec, then an implementation
plan, then code. Both are kept here, dated, exactly as written at the time —
including the ones whose approach later changed.

They are the most direct answer to "how was this built": what the constraints
were, which options were weighed, and what the plan was before contact with the
code.

| Date | Feature | Design | Plan |
|---|---|---|---|
| 2026-04-06 | Google OAuth and sessions | [spec](superpowers/specs/2026-04-06-auth-module-design.md) | [plan](superpowers/plans/2026-04-06-auth-module.md) |
| 2026-04-07 | Docker deployment pipeline | [spec](superpowers/specs/2026-04-07-deployment-design.md) | [plan](superpowers/plans/2026-04-07-deployment.md) |
| 2026-04-07 | React app shell and routing | [spec](superpowers/specs/2026-04-07-frontend-shell-design.md) | [plan](superpowers/plans/2026-04-07-frontend-shell.md) |
| 2026-04-07 | Monthly portfolio snapshots | [spec](superpowers/specs/2026-04-07-portfolio-snapshots-design.md) | [plan](superpowers/plans/2026-04-07-portfolio-snapshots.md) |
| 2026-04-09 | Assets page redesign | [spec](superpowers/specs/2026-04-09-assets-page-redesign.md) | [plan](superpowers/plans/2026-04-09-assets-page-redesign.md) |
| 2026-04-09 | Dashboard redesign | [spec](superpowers/specs/2026-04-09-dashboard-redesign-design.md) | [plan](superpowers/plans/2026-04-10-dashboard-redesign.md) |
| 2026-04-09 | Profile page | [spec](superpowers/specs/2026-04-09-profile-page-design.md) | [plan](superpowers/plans/2026-04-10-profile-page-design.md) |
| 2026-04-10 | Marketing landing page | [spec](superpowers/specs/2026-04-10-landing-page-design.md) | [plan](superpowers/plans/2026-04-10-landing-page.md) |
| 2026-04-10 | Snapshot page redesign | [spec](superpowers/specs/2026-04-10-snapshot-page-redesign.md) | [plan](superpowers/plans/2026-04-10-snapshot-page-redesign.md) |
| 2026-04-10 | Monthly reminder emails | [spec](superpowers/specs/2026-04-10-snapshot-reminder-emails-design.md) | [plan](superpowers/plans/2026-04-10-snapshot-reminder-emails.md) |
| 2026-04-10 | Philosophy page | [spec](superpowers/specs/2026-04-10-philosophy-page-design.md) | [plan](superpowers/plans/2026-04-10-philosophy-page.md) |
| 2026-04-10 | Pocket management redesign | [spec](superpowers/specs/2026-04-10-profile-pockets-redesign-design.md) | [plan](superpowers/plans/2026-04-10-profile-pockets-redesign.md) |
| 2026-04-11 | First-run welcome guide | [spec](superpowers/specs/2026-04-11-welcome-guide-design.md) | — |
| 2026-04-12 | Email notification opt-in | [spec](superpowers/specs/2026-04-12-email-notification-opt-in-design.md) | [plan](superpowers/plans/2026-04-12-email-notification-opt-in.md) |
| 2026-04-14 | Blog post likes | [spec](superpowers/specs/2026-04-14-blog-likes-design.md) | [plan](superpowers/plans/2026-04-14-blog-likes.md) |
| 2026-04-15 | Mobile responsive layout | [spec](superpowers/specs/2026-04-15-mobile-responsive-layout-design.md) | — |
| 2026-04-15 | Allocation-over-time chart | [spec](superpowers/specs/2026-04-15-asset-allocation-timeline-design.md) | [plan](superpowers/plans/2026-04-15-asset-allocation-timeline.md) |
| 2026-04-17 | Charts embedded in blog posts | [spec](superpowers/specs/2026-04-17-blog-chart-blocks-design.md) | [plan](superpowers/plans/2026-04-17-blog-chart-blocks.md) |
| 2026-04-18 | Read-only exchange integration | [spec](superpowers/specs/2026-04-18-exchange-integration-design.md) | — |
| 2026-04-18 | Notification preferences | [spec](superpowers/specs/2026-04-18-notification-preferences-design.md) | — |
| 2026-04-19 | Assets module consolidation | [spec](superpowers/specs/2026-04-19-assets-module-consolidation-design.md) | [plan](superpowers/plans/2026-04-19-assets-module-consolidation.md) |
| 2026-04-20 | Shared UI package extraction | [spec](superpowers/specs/2026-04-20-shared-ui-package-design.md) | [plan](superpowers/plans/2026-04-20-shared-ui-package.md) |
| 2026-04-21 | Revolut PDF statement parser | [spec](superpowers/specs/2026-04-21-revolut-pdf-parser-design.md) | — |
| 2026-04-22 | Agent API and scoped tokens | [spec](superpowers/specs/2026-04-22-agents-api-design.md) | [plan](superpowers/plans/2026-04-23-agents-api.md) |
| 2026-04-24 | iOS viewport fixes | [spec](superpowers/specs/2026-04-24-ios-mobile-viewport-design.md) | [plan](superpowers/plans/2026-04-24-ios-mobile-viewport.md) |
| 2026-04-25 | OpenAPI request schemas | [spec](superpowers/specs/2026-04-25-swagger-request-schemas-design.md) | [plan](superpowers/plans/2026-04-25-swagger-request-schemas.md) |

## Runbooks

- [hoster-previews.md](hoster-previews.md) — per-branch preview environments:
  how a branch gets its own full-stack deploy and how to tear one down.

## Product notes

- [brainstorm/](brainstorm/README.md) — the original product thinking the app
  grew out of, kept as a record of where the idea started.
