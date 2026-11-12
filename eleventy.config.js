// ─── SINGLE SWITCH ────────────────────────────────────────────────────────────
// Custom domain root (artcard.la):  "/"
// GitHub project site preview without a custom domain: "/la-artist/"
// Can also be overridden at build time:  PATH_PREFIX=/la-artist/ npm run build
import fs from "node:fs";

export const PATH_PREFIX = process.env.PATH_PREFIX ?? "/";
export const SITE_URL = process.env.SITE_URL ?? "https://artcard.la";
const site = JSON.parse(fs.readFileSync(new URL("./src/_data/site.json", import.meta.url)));
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

  const orgId = `${SITE_URL}/#organization`;
  const organization = {
    "@type": "Organization",
    "@id": orgId,
    name: "ArtCard.LA",
    url: SITE_URL,
    logo: `${SITE_URL}/assets/artcard-wordmark.png`,
    sameAs: ["https://www.instagram.com/artcard.la/"],
    email: site.contactEmail,
    telephone: site.phoneTel,
    address: {
      "@type": "PostalAddress",
      addressLocality: site.addressLocality,
      addressRegion: site.addressRegion,
      addressCountry: "US",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: site.contactEmail,
      telephone: site.phoneTel,
      contactType: "customer support",
      url: `${SITE_URL}/contact/`,
    },
  };
  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "ArtCard.LA",
    url: SITE_URL,
    inLanguage: "en",
    publisher: { "@id": orgId },
  };
  eleventyConfig.addGlobalData("bookJsonLd", [
    {
      "@type": "Book",
      name: "ArtCard Volume 1",
      url: "https://www.magcloud.com/browse/issue/542698",
      image: `${SITE_URL}/assets/books/artcard-volume-1.webp`,
      datePublished: "2014-07-24",
      numberOfPages: 48,
      description: "Featuring 100+ artists’ work mailed from every corner of Los Angeles, CA.",
      publisher: { "@id": orgId },
    },
    {
      "@type": "Book",
      name: "ArtCard Volume 2",
      url: "https://www.magcloud.com/browse/issue/759613",
      image: `${SITE_URL}/assets/books/artcard-volume-2.webp`,
      datePublished: "2014-06-11",
      numberOfPages: 94,
      description: "The second book in a series of publications featuring art from LA’s largest and most inclusive mail art project. The book spotlights 40 artists who mailed ArtCards in 2013.",
      publisher: { "@id": orgId },
    },
  ]);
  eleventyConfig.addFilter("homeJsonLd", (stats) => ({
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/#collection`,
    url: `${SITE_URL}/`,
    name: "ArtCard.LA",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: { "@type": "Collection", name: "ArtCards", numberOfItems: stats.artworks },
  }));
  eleventyConfig.addFilter("seoGraph", (extra) => {
    const extras = extra == null ? [] : (Array.isArray(extra) ? extra : [extra]);
    return JSON.stringify({ "@context": "https://schema.org", "@graph": [organization, website, ...extras] }).replace(/</g, "\\u003c");
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    pathPrefix: PATH_PREFIX,
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
  };
}
