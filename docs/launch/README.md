# Public Beta Launch Docs

This folder is the source of truth for the `Public Beta` launch stream.

The launch documentation is now restructured into two execution folders:

- [launch-core/](./launch-core/): must-ship scope for the first public launch
- [launch-plus/](./launch-plus/): approved follow-up scope that must not block launch

## Canonical Reading Order

### Launch Core

1. [launch-core/launch-core-plan.md](./launch-core/launch-core-plan.md)
2. [launch-core/launch-core-implementation-slices.md](./launch-core/launch-core-implementation-slices.md)
3. [launch-core/launch-core-information-architecture.md](./launch-core/launch-core-information-architecture.md)
4. [launch-core/launch-core-auth-and-deploy-spec.md](./launch-core/launch-core-auth-and-deploy-spec.md)
5. [launch-core/launch-core-qa-checklist.md](./launch-core/launch-core-qa-checklist.md)

### Launch Plus

1. [launch-plus/launch-plus-plan.md](./launch-plus/launch-plus-plan.md)
2. [launch-plus/launch-plus-information-architecture.md](./launch-plus/launch-plus-information-architecture.md)
3. [launch-plus/launch-plus-auth-spec.md](./launch-plus/launch-plus-auth-spec.md)
4. [launch-plus/launch-plus-qa-checklist.md](./launch-plus/launch-plus-qa-checklist.md)

## Scope Model

### Launch Core

`Launch Core` is the minimum scope that makes EveryShift launchable as a public product.

It includes:

- public landing page at `/`
- public/app route split for SEO and product clarity
- existing email/password login and signup continuity
- real CTA path for lead capture or admin signup
- Vercel deployment contract
- launch-blocking QA and release gates

### Launch Plus

`Launch Plus` is intentionally deferred scope that can ship immediately after `Launch Core`
or be pulled in only if `Core` is already stable.

It includes:

- Google login
- Kakao login
- shared OAuth callback behavior
- provider-linking and auth recovery polish
- extra launch polish that is helpful but not required to make the product public

## Deprecated Legacy Docs

The old flat files in `docs/launch/` are now deprecated compatibility entry points.
They remain in place only to redirect readers to the new folder structure.

Deprecated files:

- [public-beta-launch-plan.md](./public-beta-launch-plan.md)
- [public-beta-information-architecture.md](./public-beta-information-architecture.md)
- [public-beta-auth-and-deploy-spec.md](./public-beta-auth-and-deploy-spec.md)
- [public-beta-qa-checklist.md](./public-beta-qa-checklist.md)

## Defaults Locked Here

- Release name: `Public Beta`
- Public site route: `/`
- Authenticated app route root: `/app`
- Deploy target: `Vercel`
- SEO-sensitive content lives on public routes, not under `/app`
- `Launch Core` ships first unless the launch plan explicitly promotes a `Plus` item
