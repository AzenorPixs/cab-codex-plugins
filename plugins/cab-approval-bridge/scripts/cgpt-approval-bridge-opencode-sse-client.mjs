import {
  rename,
  writeFile,
} from "node:fs/promises";
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';

const baseUrl =
  process.env.OPENCODE_BASE_URL ||
  "http://127.0.0.1:4096";
const openCode = createOpenCodeV2ClientFromEnv({ baseUrl, directory: process.cwd() });

const statePath =
  process.env.OPENCODE_SSE_STATE_PATH ||
  "/tmp/opencode-sse-client-status.json";

const version = "2.1.35";
let connections = 0;

async function publish(state) {
  const temporary =
    `${statePath}.tmp`;

  await writeFile(
    temporary,
    `${JSON.stringify({ version, ...state })}\n`,
    "utf8"
  );

  await rename(
    temporary,
    statePath
  );
}

async function connect() {
  connections += 1;

  const sessions = await openCode.activeSessions();
  const response = await openCode.events();

  await publish({
    state: "connected",
    connections,
    sessions: Object.keys(sessions),
    reconciledAt:
      new Date().toISOString(),
  });

  const reader =
    response.body.getReader();

  while (
    !(await reader.read()).done
  ) {
    await publish({
      state: "connected",
      connections,
      lastEventAt:
        new Date().toISOString(),
    });
  }

  throw new Error(
    "Flux SSE fermé"
  );
}

for (;;) {
  try {
    await connect();
  } catch (error) {
    await publish({
      state: "reconnecting",
      connections,
      error: error.message,
      updatedAt:
        new Date().toISOString(),
    });

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          1000
        )
    );
  }
}
