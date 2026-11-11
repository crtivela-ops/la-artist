// ─── SINGLE SWITCH ────────────────────────────────────────────────────────────
// Custom domain root (artcard.la):  "/"
// GitHub project site preview without a custom domain: "/la-artist/"
// Can also be overridden at build time:  PATH_PREFIX=/la-artist/ npm run build
export const PATH_PREFIX = process.env.PATH_PREFIX ?? "/";
export const SITE_URL = process.env.SITE_URL ?? "https://artcard.la";
// ──────────────────────────────────────────────────────────────────────────────

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "node_modules/leaflet/dist": "assets/vendor/leaflet" });
  eleventyConfig.addGlobalData("pathPrefix", PATH_PREFIX);
  eleventyConfig.addGlobalData("siteUrl", SITE_URL);

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  eleventyConfig.addFilter("niceDate", (d) => { const [y, m, dd] = d.split("-"); return `${months[+m - 1]} ${+dd}, ${y}`; });
  eleventyConfig.addFilter("plural", (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`);
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("take", (arr, n) => arr.slice(0, n));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    pathPrefix: PATH_PREFIX,
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
  };
}
