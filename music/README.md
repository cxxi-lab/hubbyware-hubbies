# hubbyware hubby: Music

Your music library. Announced: a single "Coming soon" page until its pages come. An official isolated hubby (runs in its sandboxed frame).

- `hubby.json`: its id, version, SDK range
- `index.tsx`: its entry

```sh
npm run typecheck -w music
npm run build -w music      # hubby build → dist/
```

Released by the repository's `.github/workflows/release.yml` (`feat:`, `fix:`, `perf:`, `BREAKING`).
