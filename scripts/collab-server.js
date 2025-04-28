import { Hocuspocus } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const server = new Hocuspocus({
  name: "hocuspocus-jinntap",
  port: 8082,
  timeout: 30000,
  debounce: 5000,
  maxDebounce: 30000,
  quiet: false,
  extensions: [new Logger()]
});

server.listen();