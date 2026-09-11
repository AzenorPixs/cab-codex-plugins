import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const controllerPath = fileURLToPath(
  new URL(
    "../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs",
    import.meta.url
  )
);

function startWith(environment) {
  return spawnSync(
    process.execPath,
    [controllerPath],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        OC_CGPT_OUTSIDE_SANDBOX: "1",
        OC_CGPT_WORKSPACE: "/workspace",
        ...environment,
      },
    }
  );
}

test("refuse une interface contrôleur non loopback", () => {
  const result = startWith({
    OC_CGPT_STATUS_HOST: "0.0.0.0",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /OC_CGPT_STATUS_HOST doit être une adresse loopback autorisée/
  );
});

for (const workspace of [
  "/workspace",
  "/home/devops/datas/cab",
]) {
  test(`accepte le workspace CAB ${workspace}`, () => {
    const result = startWith({
      OC_CGPT_WORKSPACE: workspace,
      OC_CGPT_STATUS_HOST: "0.0.0.0",
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /OC_CGPT_STATUS_HOST doit être une adresse loopback autorisée/
    );
  });
}

test("refuse un workspace relatif", () => {
  const result = startWith({
    OC_CGPT_WORKSPACE: ".",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /OC_CGPT_WORKSPACE doit être une racine CAB absolue autorisée/
  );
});

test("refuse un workspace absolu hors CAB", () => {
  const result = startWith({
    OC_CGPT_WORKSPACE: "/tmp",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /OC_CGPT_WORKSPACE doit être une racine CAB absolue autorisée/
  );
});
