# hub hubby: Mail

Your mailboxes in one place. An official [hub](https://github.com/cxxi-lab/hubbyware-client) hubby (runs in the app, through the SDK).

- `hubby.json`: its id, version, SDK range, scopes, the capabilities it uses
- `models/`: its collections' models (the server enforces them; the app seals the fields they mark encrypted)
- `manifest.tsx`: its entry

## Develop

Its checkout sits next to the apps (`~/dev/hubbyware/repos/hubbies/mail`, `~/dev/hubbyware/repos/client`): the app's development build loads
the hubbies' sources from `../../hubbies` (or `HUB_HUBBIES_DIR`).

```sh
npm install
npm run typecheck
npm run build      # hub-hubby build → dist/
```

## Release

Each push to `main` releases a new version when the commits call for one (`feat:`, `fix:`, `perf:`,
`BREAKING`): see `.github/workflows/release.yml`.
