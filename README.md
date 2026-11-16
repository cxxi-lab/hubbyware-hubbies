# hub-modules

hub's official modules, one folder each (`<id>/`: its `module.json`, its code, its models), in one
npm workspace. The accounts' modules (`@<handle>/<name>`) live in their own repositories.

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
npm run typecheck      # every module
npm run build          # every module (hub-module build: dist/)
npm run build -w planner
```

**Releases** (`.github/workflows/release.yml`): on a push to `main`, each module whose folder has a
`feat:` / `fix:` / `perf:` / `BREAKING` commit since its last tag (`<id>-v<version>`) is bumped,
built, signed and uploaded, one after the other (cxxi-lab/hub-ui's reusable workflow). Prefix the
commits with the module's id when it helps: `feat(planner): …`.

Their history before 2026-11-16 is that of their former repositories (`cxxi-lab/hub-module-<id>`,
archived), brought in with `git subtree`.
