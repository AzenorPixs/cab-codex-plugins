import { constants } from 'node:fs';
import { open,rename } from "node:fs/promises";
import { createOpenCodeV2ClientFromEnv } from './cgpt-approval-bridge-opencode-client.mjs';

const baseUrl =
  process.env.OPENCODE_BASE_URL ||
  "http://127.0.0.1:4096";
const openCode = createOpenCodeV2ClientFromEnv({ baseUrl, directory: process.cwd() });

const statePath =
  process.env.OPENCODE_SSE_STATE_PATH ||
  "/tmp/opencode-sse-client-status.json";

const version = "2.7.4";
let connections = 0;

async function publish(state) {
  const temporary =
    `${statePath}.tmp`;

  const fd=await open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_TRUNC|constants.O_NOFOLLOW,0o770);
  try{await fd.chmod(0o770);await fd.writeFile(`${JSON.stringify({ version, ...state })}\n`,"utf8");}finally{await fd.close();}

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
