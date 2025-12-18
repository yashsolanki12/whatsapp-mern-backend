import { register } from "node:module";
import { pathToFileURL } from "node:url";
// Register ts-node as an ES module loader
register("ts-node/esm", pathToFileURL(`${process.cwd()}/`));
//# sourceMappingURL=register-ts-node.js.map