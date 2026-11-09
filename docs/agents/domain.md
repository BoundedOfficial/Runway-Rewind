# Domain docs

## Layout and reading rules

This is a single-context repository:
- GLOSSARY.md at the repository root defines domain vocabulary.
- docs/adr/ holds architectural decision records.

Before exploring domain behavior, read the glossary and any ADRs relevant
to the area being changed.

If these documents are absent, proceed silently. Create them lazily through
domain modeling when terms or qualifying decisions are actually resolved.

## Vocabulary

Use glossary terms consistently in specifications, issues, tests, and code.
For a missing concept, reconsider whether an existing term fits; record
genuine vocabulary gaps through domain modeling.

Keep implementation decisions out of the glossary.

## Decision conflicts

If a proposal conflicts with an existing ADR, identify the conflict and
explain why the decision should be reconsidered rather than silently
overriding it.
