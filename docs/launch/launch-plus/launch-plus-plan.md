# Launch Plus Plan

> Status: Approved follow-up scope after Launch Core

## Objective

Add auth convenience and conversion polish without blocking the first public launch.

## Scope

In scope:

- Google login
- Kakao login
- shared OAuth callback route at `/auth/callback`
- provider-specific identity linking
- provider-specific recovery states
- provider-specific QA in preview and production

Out of scope:

- full auth rewrite
- invite model redesign
- broad product expansion outside the scheduling flow

## Start Condition

Do not begin Launch Plus until:

- Launch Core is deployed
- Launch Core routing is stable
- public CTA path is working
- preview and production smoke checks are green

## Implementation Order

### 1. Provider Setup

- configure Google provider
- configure Kakao provider
- confirm redirect URLs

### 2. Entry Surface Updates

- add provider buttons to login
- add provider buttons to signup where appropriate

### 3. Callback Flow

- introduce `/auth/callback`
- resolve session
- load RBAC context
- redirect to the same access-state destinations as email/password login

### 4. Account Linking Rules

- use email-first matching
- avoid duplicate product identity creation
- fail clearly if provider email is unusable

### 5. QA and Release

- preview provider QA
- production provider QA
- duplicate-account regression QA

## Release Gate

Launch Plus is not ready unless:

- Google login works in preview and production
- Kakao login works in preview and production
- `/auth/callback` resolves in every environment
- duplicate-account handling is verified
- pending, rejected, and active redirects stay consistent
