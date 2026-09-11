# LANGUAGE.md format

`LANGUAGE.md` is a bounded glossary for project-specific vocabulary. It is not a spec, architecture document, implementation guide, or scratchpad.

## Root format

```md
# Language

One or two sentences describing the product or domain area this vocabulary covers.

## Terms

**Canonical Term**:
One or two sentences defining what the term is.
_Avoid_: Ambiguous synonym, outdated name

**Another Term**:
One or two sentences defining what the term is.
_Avoid_: Other synonym
```

## Rules

- Add only project-specific terms that future agents or humans must use consistently.
- Keep definitions to one or two sentences.
- Define what the term is, not how it is implemented.
- Prefer one canonical term and list rejected synonyms under `_Avoid_`.
- Do not include implementation details, architecture decisions, plans, acceptance criteria, or open questions.
- Prune obsolete terms when the project language changes.

## Scope rules

Start local unless the term crosses boundaries.

- Use root `LANGUAGE.md` for vocabulary shared across multiple parts of the project.
- Use local `LANGUAGE.md` files for feature, module, or bounded-context vocabulary.
- Promote a local term to root only when multiple areas need the same meaning.
- Use `LANGUAGE-MAP.md` only when multiple language files exist and navigation is needed.

## LANGUAGE-MAP.md format

```md
# Language map

## Contexts

- [Product](./LANGUAGE.md): Shared product vocabulary.
- [Billing](./src/billing/LANGUAGE.md): Billing-specific vocabulary.
- [Onboarding](./src/onboarding/LANGUAGE.md): Onboarding-specific vocabulary.

## Relationships

- **Product -> Billing**: Billing uses shared account and subscription language.
- **Onboarding -> Product**: Onboarding introduces product concepts to new users.
```
