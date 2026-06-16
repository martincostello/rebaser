# Rebaser

[![Build status](https://github.com/martincostello/rebaser/actions/workflows/build.yml/badge.svg?branch=main&event=push)](https://github.com/martincostello/rebaser/actions/workflows/build.yml?query=branch%3Amain+event%3Apush)
[![codecov](https://codecov.io/gh/martincostello/rebaser/branch/main/graph/badge.svg)](https://codecov.io/gh/martincostello/rebaser)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/martincostello/rebaser/badge)](https://securityscorecards.dev/viewer/?uri=github.com/martincostello/rebaser)

A GitHub Action that rebases the current branch onto another branch, attempting to
automatically resolve any merge conflicts caused by conflicting dependencies. In the
event of a conflicting dependency, the highest version of the dependency is always chosen.

Its functionality is based on [this small .NET command-line application][rebaser-csharp].

The rebased commits are pushed to the remote branch using the [GitHub API][create-commit-api]
so that every commit created by the action is [GPG-verified][verified-commits] by GitHub,
without the workflow needing to configure Git commit signing itself.

## Example Usage

```yml
steps:
- uses: actions/checkout@v5
  with:
    ref: 'my-branch'
    fetch-depth: 0
- uses: martincostello/rebaser@v4
```

### Example Workflow

```yml
name: rebase

on:
  workflow_dispatch:
    inputs:
      branch:
        required: true
        type: string

permissions:
  contents: write

jobs:
  rebase:
    runs-on: [ ubuntu-latest ]

    concurrency:
      group: "rebase-${{ inputs.branch }}"
      cancel-in-progress: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
          ref: ${{ inputs.branch }}

      - name: Rebase ${{ inputs.branch }}
        uses: martincostello/rebaser@v4
```

## Inputs

| **Name** | **Description** | **Default** |
|:--|:--|:--|
| `branch` | The branch to rebase the current branch onto. | `github.event.repository.default_branch` |
| `repository` | The path of the repository to rebase. | `'.'` |
| `repository-token` | The GitHub access token used to push the rebased commits via the GitHub API. Requires the `contents: write` permission. | `github.token` |
| `user-email` | The optional email address to use for the local Git commit(s) created while rebasing. | `github-actions[bot]@users.noreply.github.com` |
| `user-name` | The optional user name to use for the local Git commit(s) created while rebasing. | `github-actions[bot]` |

## Outputs

| **Name** | **Description** |
|:--|:--|
| `result` | The result of attempting to rebase the branch. The value is one of: `upToDate`, `success`, `conflicts` or `error`. |

## Notes

Because the rebased commits are recreated through the GitHub API so that they are GPG-verified:

- The committer and the commit timestamps are set by GitHub to the identity associated with
  the `repository-token`. The original author of each commit is preserved using a
  [`Co-authored-by`][co-authored-by] trailer added to the commit message.
- File mode changes (such as setting the executable bit), symlinks and submodules cannot be
  expressed through the API. If a commit being rebased contains one of these changes the
  action aborts with an `error` result without modifying the remote, rather than silently
  dropping the change. Text and binary file content is preserved.
- The branch being rebased and the target branch must both already exist on the remote.

## Feedback

Any feedback or issues can be added to the issues for this project in [GitHub][issues].

## Repository

The repository is hosted in [GitHub][rebaser]: <https://github.com/martincostello/rebaser.git>

## License

This project is licensed under the [Apache 2.0][license] license.

[co-authored-by]: https://docs.github.com/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors
[create-commit-api]: https://docs.github.com/graphql/reference/mutations#createcommitonbranch
[issues]: https://github.com/martincostello/rebaser/issues
[license]: https://www.apache.org/licenses/LICENSE-2.0.txt
[rebaser]: https://github.com/martincostello/rebaser
[rebaser-csharp]: https://github.com/martincostello/github-automation/blob/a28ef23bbc47711c136b5011a0ec654b935df4c8/src/Rebaser/Program.cs
[verified-commits]: https://docs.github.com/authentication/managing-commit-signature-verification/about-commit-signature-verification
