# Maintaining esp-labs-web

What runs on every pull request, what protects `main`, and the repository settings that the files in `.github/` rely on.

## What runs where

| Workflow                                                     | When                              | What it does                                                                                       |
| ------------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| [CI](../.github/workflows/ci.yml)                            | every PR, push to `main`, merge queue | `pnpm typecheck`, `pnpm lint`, `pnpm test` (a stale translator catalogue fails), `pnpm chip:refs` (every chip citation names a section of the committed reference), `pnpm build` with the esp-labs firmware, actionlint on the workflows |
| [Deploy](../.github/workflows/deploy.yml)                    | by hand (Run workflow, `gh workflow run Deploy --ref main`) | runs lint, citation checks, tests and a build with the esp-labs firmware and reference, deploys `dist/` to GitHub Pages, and tags it `vX.Y.Z` with a GitHub release and its notes. Never runs a PR's code |
| [CodeQL](../.github/workflows/codeql.yml)                    | every PR, push to `main`, weekly  | security analysis of the TypeScript and of the workflows                                          |
| [Dependency review](../.github/workflows/dependency-review.yml) | PRs that touch dependencies or `.github/` | fails when a PR adds a dependency with a known moderate-or-worse vulnerability          |
| [PR title](../.github/workflows/pr-title.yml)                | PR opened or edited               | the title (the squash commit) follows Conventional Commits, lower-case subject                    |
| [PR limit](../.github/workflows/pr-limit.yml)                | PR opened or reopened             | closes a PR, with a kind comment, when its author already has 3 open. Owner, collaborators and bots are exempt. Change `MAX_OPEN_PRS` to adjust |
| [Stale](../.github/workflows/stale.yml)                      | daily                             | PRs idle 30 days and issues idle 90 days get `stale`, then close 14 days later. `pinned`, `security`, `good first issue`, `help wanted` and drafts are exempt |
| [Dependabot](../.github/dependabot.yml)                      | weekly                            | grouped npm and Actions updates, each release at least 14 days old; TypeScript stays on 6         |

Every third-party action is pinned to a full commit SHA (Dependabot keeps the pins fresh), every workflow starts with a read-only token, and the two `pull_request_target` workflows never check out the PR's code. Keep both rules when you add a workflow.

## Protecting `main`

[`.github/rulesets/main.json`](../.github/rulesets/main.json) is the branch ruleset: no deletion or force push, linear history, changes only through a pull request with an approving code-owner review (re-requested after new pushes), resolved conversations, and the CI, workflow-lint and PR-title checks green. Repository admins can bypass it, so you can still push a hotfix.

Apply it once, and again after you edit the file (replace `<id>` with the id the first command printed):

```sh
gh api -X POST repos/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/rulesets --input .github/rulesets/main.json --jq .id
gh api -X PUT repos/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/rulesets/<id> --input .github/rulesets/main.json
```

## Repository settings

These live on GitHub, not in the repo. Apply them once with `gh`:

```sh
R=repos/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web

# Fork PRs from anyone outside the repo wait for your approval before any workflow runs.
gh api -X PUT $R/actions/permissions/fork-pr-contributor-approval -f approval_policy=all_external_contributors
# Workflows get a read-only token by default and can't approve pull requests.
gh api -X PUT $R/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false

# Private vulnerability reports (SECURITY.md), Dependabot alerts and security fixes.
gh api -X PUT $R/private-vulnerability-reporting
gh api -X PUT $R/vulnerability-alerts
gh api -X PUT $R/automated-security-fixes
# Secret scanning and push protection.
gh api -X PATCH $R --input - <<'JSON'
{ "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" } },
  "delete_branch_on_merge": true,
  "allow_merge_commit": false,
  "allow_squash_merge": true,
  "allow_rebase_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY" }
JSON
```

## Production deploys

[Deploy](../.github/workflows/deploy.yml) puts `main` on GitHub Pages when you run it (merging does not deploy), and refuses a branch other than `main`. It runs the same checks as CI before the upload, and the build fails if the firmware checkout is missing. After a successful deploy:

- **Release.** `tools/deploy/` picks the next version from the Conventional Commits since the last `v*` tag (breaking: major, or minor below 1.0.0; `feat`: minor; anything else: patch; the first release is `package.json`'s version), tags the deployed commit and publishes a GitHub release marked latest. The notes group the changes (breaking first, then features, fixes, performance, docs, maintenance) with their PRs, and link the live URL, the commit, the run and the comparison with the previous tag. Redeploying a commit that is already tagged makes no new release. Tags are the version; `package.json`'s stays the starting point.
- **Deployment history.** GitHub's `github-pages` environment lists each deployment with its URL and workflow run. GitHub Pages serves the latest successful deployment.

To undo a bad release, revert the change on `main`, wait for CI, then run Deploy again. The next deployment and release contain the revert.

If Actions are disabled in this fork, enable them on the **Actions** tab first. Before the first run, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The workflow uses `GITHUB_TOKEN`, so it needs no deployment secrets or variables. Protect the automatically created `github-pages` environment in **Settings → Environments** so only `main` can deploy.

To run it:

```sh
gh workflow run Deploy --ref main
```

[`.github/rulesets/release-tags.json`](../.github/rulesets/release-tags.json) keeps released `v*` tags from being moved or deleted (admins can bypass). Apply it once, as for `main`:

```sh
gh api -X POST repos/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/rulesets --input .github/rulesets/release-tags.json --jq .id
```

## When it gets noisy

- **A wave of spam PRs or comments**: Settings → Moderation options → Interaction limits restricts issues, PRs and comments to prior contributors or collaborators for 24 hours up to 6 months:

  ```sh
  gh api -X PUT repos/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/interaction-limits -f limit=existing_users -f expiry=one_week
  ```

- **One account**: block it from your profile (Settings → Moderation → Blocked users), or report it to GitHub from the ⋯ menu on its comment.
- **A heated thread**: lock it (`gh issue lock <n> --reason too_heated`).
- **A PR that touches `.github/`**: read it line by line before approving the workflow run. A change there can alter what CI checks or what a workflow is allowed to do.
