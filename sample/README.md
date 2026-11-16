# hub module: Hubby Lab

The first isolated hubby: a few notes, in a sandboxed frame. An official [hub](https://github.com/cxxi-lab/hubbyware-client) isolated hubby (runs in its sandboxed frame).

- `module.json`: its id, version, SDK range, scopes, the capabilities it uses
- `models/`: its collections' models (the server enforces them; the app seals the fields they mark encrypted)
- `index.tsx`: its entry

## Develop

Its checkout sits next to the apps (`~/dev/hubbyware/repos/hubbies/sample`, `~/dev/hubbyware/repos/client`): the app's development build loads
the modules' sources from `../../hubbies` (or `HUB_MODULES_DIR`).

```sh
npm install
npm run typecheck
npm run build      # hub-module build → dist/
```

## Release

Each push to `main` releases a new version when the commits call for one (`feat:`, `fix:`, `perf:`,
`BREAKING`): see `.github/workflows/release.yml`.
