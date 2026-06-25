/**
 * Generates scoped copies of the Tabulator theme CSS files so multiple themes
 * can coexist in one bundle. Every selector is prefixed with
 * `.widget-tabulator-datagrid.wtd-theme-<key>` — the higher specificity makes
 * the chosen theme win over both the base theme and the widget's own
 * Mendix-style overrides.
 *
 * Run after upgrading tabulator-tables:  node scripts/generate-themes.js
 */
const postcss = require("postcss");
const fs = require("fs");
const path = require("path");

const themes = {
    plain: "tabulator.min.css",
    simple: "tabulator_simple.min.css",
    midnight: "tabulator_midnight.min.css",
    modern: "tabulator_modern.min.css",
    site: "tabulator_site.min.css",
    siteDark: "tabulator_site_dark.min.css"
};

const srcDir = path.join(__dirname, "..", "node_modules", "tabulator-tables", "dist", "css");
const outDir = path.join(__dirname, "..", "src", "ui", "themes");
fs.mkdirSync(outDir, { recursive: true });

for (const [key, file] of Object.entries(themes)) {
    const css = fs.readFileSync(path.join(srcDir, file), "utf8");
    const root = postcss.parse(css);
    const scope = `.widget-tabulator-datagrid.wtd-theme-${key}`;

    root.walkRules(rule => {
        // Keyframe step selectors (from/to/%) must not be prefixed
        if (rule.parent && rule.parent.type === "atrule" && /keyframes/i.test(rule.parent.name)) {
            return;
        }
        // body/html-level rules (print fullscreen) are identical across themes
        // and already present via the base import — drop them here
        const kept = rule.selectors.filter(sel => !/^\s*(body|html)\b/.test(sel));
        if (kept.length === 0) {
            rule.remove();
            return;
        }
        rule.selectors = kept.map(sel => `${scope} ${sel.trim()}`);
    });

    // Strip source map reference comments
    root.walkComments(c => {
        if (c.text.includes("sourceMappingURL")) c.remove();
    });

    const outFile = path.join(outDir, `${key}.css`);
    fs.writeFileSync(outFile, root.toString(), "utf8");
    console.log(`generated ${path.relative(process.cwd(), outFile)}`);
}
