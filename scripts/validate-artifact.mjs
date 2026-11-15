import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/config/deployment.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

console.log("Artifact is valid ESM and exports default.fetch");
const deck = await readFile(resolve(projectRoot, 'docs/presentation.pptx'));
for (const route of ['/presentation', '/presentation.pptx']) {
  const response = await workerModule.default.fetch(new Request('https://hackcampus.test' + route), {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.ok(response.headers.get('content-disposition').includes('.pptx'));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), deck);
}
console.log('Both presentation routes return the complete PowerPoint file.');
