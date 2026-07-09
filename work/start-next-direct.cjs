const path = require("path");

const { startServer } = require("next/dist/server/lib/start-server");
const loadConfig = require("next/dist/server/config").default;
const { PHASE_DEVELOPMENT_SERVER } = require("next/dist/shared/lib/constants");
const traceShared = require("next/dist/trace/shared");

async function main() {
  const dir = path.resolve(__dirname, "..");
  const config = await loadConfig(PHASE_DEVELOPMENT_SERVER, dir);

  traceShared.setGlobal("phase", PHASE_DEVELOPMENT_SERVER);
  traceShared.setGlobal("distDir", path.join(dir, config.distDir ?? ".next"));

  await startServer({
    dir,
    port: Number(process.env.PORT || 3000),
    allowRetry: true,
    isDev: true,
    hostname: process.env.HOSTNAME || "127.0.0.1"
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
