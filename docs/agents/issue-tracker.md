# Issue tracker: GitHub

Issues and specs live in BoundedOfficial/Runway-Rewind on GitHub.
Use the gh CLI from this repository.

## Operations

- Verify the destination with `gh repo view --json nameWithOwner`.
- Create issues with `gh issue create --repo BoundedOfficial/Runway-Rewind`.
- For multiline descriptions or comments, write the exact text to a file
  and use `--body-file`.
- Read issues with `gh issue view <number> --json number,title,body,labels,comments`.
- List issues with `gh issue list`, using appropriate state and label filters.
- Apply or remove labels with `gh issue edit`.
- Before closing an issue, post the resolution as a comment, then close it.
- Use native sub-issues and blocking dependencies when supported by the
  installed CLI/API. Otherwise record `Part of #<number>` or
  `Blocked by: #<number>` in the issue body.
- A ticket is unblocked when every blocker is closed.

When a skill says “publish to the issue tracker,” create a GitHub issue.
When it says “fetch the relevant ticket,” read the GitHub issue.

File issues only in this project repository. Check the destination before
the first issue creation in a session; do not use an upstream skill repository.

## Pull requests as a triage surface

PRs as a request surface: no.
