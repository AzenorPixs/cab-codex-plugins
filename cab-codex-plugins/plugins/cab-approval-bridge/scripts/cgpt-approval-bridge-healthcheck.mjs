import { execFileSync } from "node:child_process";

const controllerUrl =
  process.env.OC_CGPT_CONTROLLER_URL ||
  "http://127.0.0.1:8788/status";

const opencodeUrl = (
  process.env.OC_CGPT_OPENCODE_URL ||
  "http://127.0.0.1:4096"
).replace(/\/$/, "");

const maxReadinessAgeMs = Number(
  process.env.OC_CGPT_READINESS_MAX_AGE_MS ||
    "90000"
);

class HealthError extends Error {
  constructor(
    message,
    {
      restartController = false,
    } = {}
  ) {
    super(message);

    this.restartController =
      restartController;
  }
}

async function fetchJson(url) {
  const response = await fetch(
    url,
    {
      signal:
        AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) {
    throw new HealthError(
      `HTTP ${response.status} pour ${url}.`
    );
  }

  return response.json();
}

function validateBrokerReadiness(
  status
) {
  const readiness =
    status.brokerReadiness;

  const receivedAt = Date.parse(
    status.brokerReadinessReceivedAt ||
      ""
  );

  if (
    !readiness ||
    !Number.isFinite(receivedAt)
  ) {
    throw new HealthError(
      "broker_readiness absent du contrôleur."
    );
  }

  if (
    Date.now() - receivedAt >
    maxReadinessAgeMs
  ) {
    throw new HealthError(
      "broker_readiness expiré."
    );
  }

  if (
    readiness.status === "BLOCKED"
  ) {
    throw new HealthError(
      `Broker BLOCKED: ${
        readiness.root_cause ||
        "cause inconnue"
      }.`
    );
  }

  if (
    readiness.status ===
    "HUMAN_REQUIRED"
  ) {
    throw new HealthError(
      `Broker HUMAN_REQUIRED: ${
        readiness.root_cause ||
        "cause inconnue"
      }.`
    );
  }

  if (
    ![
      "READY",
      "DEGRADED",
    ].includes(readiness.status)
  ) {
    throw new HealthError(
      `Statut broker_readiness invalide: ${String(
        readiness.status
      )}.`
    );
  }

  return readiness;
}

async function check() {
  try {
    const openCode =
      await fetchJson(
        `${opencodeUrl}/global/health`
      );

    if (!openCode.healthy) {
      throw new HealthError(
        "OpenCode n'est pas sain."
      );
    }

    let status;

    try {
      status =
        await fetchJson(
          controllerUrl
        );
    } catch (error) {
      throw new HealthError(
        `Contrôleur indisponible: ${error.message}`,
        {
          restartController: true,
        }
      );
    }

    if (
      status.appServer !== "ready"
    ) {
      throw new HealthError(
        `Codex App Server: ${status.appServer}.`,
        {
          restartController: true,
        }
      );
    }

    if (
      status.opencodeSse !==
      "connected"
    ) {
      throw new HealthError(
        `SSE OpenCode: ${status.opencodeSse}.`,
        {
          restartController: true,
        }
      );
    }

    validateBrokerReadiness(
      status
    );

    return status;
  } catch (error) {
    if (
      error.restartController
    ) {
      execFileSync(
        "systemctl",
        [
          "--user",
          "restart",
          "cgpt-approval-bridge-controller.service",
        ],
        {
          stdio: "inherit",
        }
      );
    }

    throw error;
  }
}

await check();

setInterval(
  () => {
    void check().catch(
      (error) =>
        console.error(
          error.message
        )
    );
  },
  30_000
);
