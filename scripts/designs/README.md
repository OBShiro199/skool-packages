# Designs library pipeline

Builds `public/designs` (the Vault's Designs page) from live websites.

1. `sites.json`: the list of sites (`name`, `site`, `refero_url`).
2. `run2.py` / `runall2.py`: Firecrawl renders each site, takes a full-page screenshot and runs `measure.js` to read the computed CSS (colours with use counts, type, radii, shadows, spacing, sampled components). Claude then writes an original Style Reference from those measurements with `master-prompt.md`.
3. `export.py <out folder>`: copies the finished designs into `public/designs`.

Keys go in a `.keys` file outside the repo (`FIRECRAWL_API_KEY=…`, `ANTHROPIC_API_KEY=…`), pointed to by `DESIGN_KEYS`. Never commit it.
