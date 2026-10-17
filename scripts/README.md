# Figma reference files

Add a Figma personal access token with `file_content:read` permission to `.env`:

```
FIGMA_TOKEN=your_token
```

The token stays on your computer. Do not use a `VITE_` variable for it.

Fetch one screen, including a PNG and SVG:

```sh
npm run figma:fetch -- "https://www.figma.com/design/1GDtJiUUSxdWTKU4N3981G/Untitled?node-id=55812-319" --format png,svg
```

Use `--nodes 1:2,3:4` to fetch related screens together, `--assets` for original image fills and `--svg-icons` for small vector elements. The full node JSON preserves text styles, geometry, Auto Layout and component properties. A separate layer index makes them easier to inspect.

Results are saved under `design/figma` and excluded from Git. Cached requests are reused by default, including offline when there is no token. Cache timestamps are printed. Use `--refresh` when you need the latest version, or `--offline` to prevent all network access. Export files are separated by design version so a newer version cannot reuse an old screenshot.

The script respects Figma rate limits and `Retry-After`. Long cooldowns are saved locally; repeat runs will not keep sending requests during that cooldown. Cached results remain available. A missing token, unavailable node, denied access or failed export produces an error instead of a successful-looking result.

```sh
npm run figma:fetch -- --help
```
