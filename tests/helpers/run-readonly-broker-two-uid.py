"""Lance le banc CAB à deux UID dans le seul conteneur de test dédié."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import uuid


def copy_plugin(source: Path, target: Path) -> int:
    copied = 0
    patterns = {"scripts": ("*.mjs", "*.py"), "broker": ("*.py",),
                "web-monitor": ("*.html", "*.mjs", "*.css"), "systemd": ("*.service",),
                ".codex-plugin": ("plugin.json",)}
    for directory, globs in patterns.items():
        destination = target / directory
        destination.mkdir(parents=True, exist_ok=True, mode=0o755)
        for pattern in globs:
            for item in (source / directory).glob(pattern):
                if item.is_symlink() or not item.is_file():
                    raise RuntimeError("Le banc refuse une entrée source non régulière")
                shutil.copy2(item, destination / item.name)
                copied += 1
    return copied


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original-plugin", type=Path, required=True)
    parser.add_argument("--node", type=Path, default=Path("/home/devops/node/current/bin/node"))
    parser.add_argument("--python", type=Path, default=Path("/home/devops/python/current/bin/python3"))
    parser.add_argument("--image", default="debian:stable-slim")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    work = root / ".cab-readonly-work"
    work.mkdir(exist_ok=True, mode=0o700)
    key = uuid.uuid4().hex
    inputs = work / ("two-uid-inputs-" + key)
    inputs.mkdir(mode=0o755)
    copied = copy_plugin(root / "plugins/cab-approval-bridge", inputs / "plugins/cab-approval-bridge")
    copied += copy_plugin(args.original_plugin.resolve(), inputs / "original")
    destination = inputs / "tests/helpers"
    destination.mkdir(parents=True, mode=0o755)
    shutil.copy2(root / "tests/helpers/readonly-broker-two-uid.mjs", destination)
    node = args.node.resolve(strict=True)
    python = args.python.resolve(strict=True)
    runtime_mounts = {node.parent.parent: node.parent.parent, python.parent.parent: python.parent.parent,
                      Path("/usr/lib/x86_64-linux-gnu"): Path("/usr/lib/x86_64-linux-gnu"),
                      args.node.absolute().parent.parent: node.parent.parent,
                      args.python.absolute().parent.parent: python.parent.parent}
    image = subprocess.run(["/usr/bin/docker", "image", "inspect", args.image, "--format", "{{.Id}}"],
                           text=True, capture_output=True, check=True).stdout.strip()
    name = "cab-readonly-uid-" + key
    command = ["/usr/bin/docker", "run", "--rm", "--name", name, "--network", "none",
               "--tmpfs", "/work:rw,exec,nosuid,nodev,size=512m,mode=1777",
               "--mount", "type=bind,src=" + str(inputs) + ",dst=/inputs,readonly"]
    for destination, runtime in sorted(runtime_mounts.items()):
        command.extend(["--mount", "type=bind,src=" + str(runtime) + ",dst=" + str(destination) + ",readonly"])
    command.extend(["--env", "PATH=" + str(node.parent) + ":" + str(python.parent) + ":/usr/bin:/bin",
                    "--env", "CAB_TEST_ISOLATED_TWO_UID=1", "--entrypoint", str(node), image,
                    "/inputs/tests/helpers/readonly-broker-two-uid.mjs"])
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=240)
        (work / ("two-uid-" + key + ".stdout")).write_text(result.stdout)
        (work / ("two-uid-" + key + ".stderr")).write_text(result.stderr)
        if result.returncode:
            raise RuntimeError("Banc deux UID échoué : " + result.stderr[-12000:])
        proof = json.loads(result.stdout)
        proof.update(image=image, inputs=str(inputs), source_files_copied=copied,
                     host_uid=os.getuid(), host_accounts_and_permissions_changed=False)
        (work / "two-uid-result.json").write_text(json.dumps(proof, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps(proof, ensure_ascii=False, indent=2))
    finally:
        subprocess.run(["/usr/bin/docker", "rm", "--force", name], capture_output=True, check=False)


if __name__ == "__main__":
    main()
