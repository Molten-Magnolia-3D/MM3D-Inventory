import fs from "node:fs";
import path from "node:path";
import { nextReleaseVersion } from "./release-version.mjs";

const pkgPath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = nextReleaseVersion(pkg.version, process.env.GITHUB_RUN_NUMBER);
pkg.version = version;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
process.stdout.write(`version=${version}\n`);
