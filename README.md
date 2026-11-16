# hub-hubbies

hub's official hubbies, one folder each (`<id>/`: its `hubby.json`, its code, its models), in one
npm workspace. The accounts' hubbies (`@<handle>/<name>`) live in their own repositories.

```
ai/        AI Engine
business/  Invoices and clients
mail/      Mail
planner/   Calendar and agenda
sample/    the sample hubby (not published yet)
workout/   Programs, sessions and stats
```

```sh
npm install            # the whole workspace
npm run typecheck      # every hubby
npm run build          # every hubby (hub-hubby build: dist/)
npm run build -w planner
```

**Releases** (`.github/workflows/release.yml`): on a push to `main`, each hubby whose folder has a
`feat:` / `fix:` / `perf:` / `BREAKING` commit since its last tag (`<id>-v<version>`) is bumped,
built, signed and uploaded, one after the other (cxxi-lab/hubbyware-ui's reusable workflow). Prefix the
commits with the hubby's id when it helps: `feat(planner): …`.

Their history before 2026-11-16 is that of their former repositories (`cxxi-lab/hub-hubby-<id>`,
archived), brought in with `git subtree`.
