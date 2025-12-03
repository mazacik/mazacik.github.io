## Notes for Codex

- Ripgrep behaved oddly from the repo root: `rg "reduceDataUsage"` returned no matches even though the string exists. Scoping the search to `src/app` (e.g., `rg "reduceDataUsage" src/app`) made it work, so now I explicitly pass `src` paths to avoid the false "no match" result from root-level searches. Might be a global `.ripgreprc`/ignore config in this environment. 
