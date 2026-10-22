# Contributing

## Workflow

1. Create an issue describing the change (optional for small chores).
2. Branch off `main`: `feature/…`, `fix/…`, `docs/…`, `chore/…`
3. Commit using [Conventional Commits](#commit-messages).
4. Push and open a pull request. Fill in the template, link the issue with `Closes #<number>`.
5. CI (`Server lint`, `Server tests`) must pass before merging.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary in imperative mood>

<optional body: what and why>
```

| Type       | Use for                                      |
| ---------- | -------------------------------------------- |
| `feat`     | A new feature                                |
| `fix`      | A bug fix                                    |
| `docs`     | Documentation only                           |
| `refactor` | Code change without behavior change          |
| `test`     | Adding or updating tests                     |
| `chore`    | Tooling, dependencies, config                |
| `ci`       | CI/CD workflow changes                       |
| `perf`     | Performance improvement                      |

Scope is usually the module: `auth`, `cart`, `orders`, `products`, `users`, `db`, …

Examples:

```
feat(cart): add endpoint to update item quantity
fix(orders): roll back transaction when stock is insufficient
test(auth): cover login with wrong password
chore(deps): bump express to 4.21.2
```

Rules:

- Summary in imperative mood ("add", not "added"), lowercase, no trailing period, max ~72 chars.
- One logical change per commit.
- Breaking API changes: add `!` after the type (`feat(api)!: …`) and a `BREAKING CHANGE:` line in the body.
- PR titles follow the same format.
