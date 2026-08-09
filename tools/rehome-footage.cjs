const fs = require("fs");
const path = require("path");

const ROOT = "C:/crime-documantory/video";
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/footage.json"), "utf8"));
const OUT = path.join(ROOT, "public", "footage");

let copied = 0;
for (const [key, rel] of Object.entries(manifest)) {
  const src = path.join(ROOT, "public", rel);
  if (!fs.existsSync(src)) {
    console.log(`MISSING on disk: ${rel}`);
    continue;
  }
  const slot = key.includes("-") ? `beat-${key.replace("-", "-")}.jpg` : `beat-${key}.jpg`;
  const dst = path.join(OUT, slot);
  if (fs.existsSync(dst)) continue;
  fs.copyFileSync(src, dst);
  copied++;
  console.log(`${key}  ->  ${slot}`);
}
console.log(`\ncopied ${copied} file(s) into flat slot naming`);
