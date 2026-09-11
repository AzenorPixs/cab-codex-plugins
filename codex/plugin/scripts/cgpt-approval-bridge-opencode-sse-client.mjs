import {
  rename,
  writeFile,
} from "node:fs/promises";

const baseUrl =
  process.env.OPENCODE_BASE_URL ||
  "http://127.0.0.1:4096";

const statePath =
  process.env.OPENCODE_SSE_STATE_PATH ||
  "/tmp/opencode-sse-client-status.json";

let connections = 0;

async function publish(state) {
  const temporary =
    `${statePath}.tmp`;

  await writeFile(
    temporary,
    `${JSON.stringify(state)}\n`,
    "utf8"
  );

  await rename(
    temporary,
    statePath
  );
}

async function connect() {
  connections += 1;

  const sessions = await fetch(
    `${baseUrl}/session`
  ).then(
    (response) =>
      response.json()
  );

  const response = await fetch(
    `${baseUrl}/event`,
    {
      headers: {
        Accept:
          "text/event-stream",
      },
    }
  );

  if (
    !response.ok ||
    !response.body
  ) {
    throw new Error(
      `SSE refusé (${response.status})`
    );
  }

  await publish({
    state: "connected",
    connections,
    sessions: sessions.map(
      (session) => session.id
    ),
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
