/**
 * Dev helper: see what the fetcher gets from a URL without running Claude.
 *   npx tsx --env-file=.env scripts/probe-source.ts <url>
 */

const { fetchSource } = await import("../src/import/source.js");

const url = process.argv[2];
if (!url) {
  console.error("usage: probe-source <url>");
  process.exit(1);
}
const source = await fetchSource(url, "tmp/probe");
console.log(JSON.stringify({ ...source, pageText: source.pageText?.slice(0, 800) }, null, 2));
