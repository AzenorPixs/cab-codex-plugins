#!/usr/bin/python3
"""Installer et vérifier le lancement de Codex Desktop sur son daemon local."""

import argparse
import os
import pwd
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

APP = Path("/usr/lib/chatgpt/ChatGPT")
ENGINE = APP.parent / "resources/codex"
DESKTOP = Path("/usr/share/applications/chatgpt.desktop")


def invoke(*args):
    return subprocess.run(args, check=True, timeout=45)


def write_owned(path, content, mode):
    if path.exists() or path.is_symlink():
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid():
            raise RuntimeError(f"Fichier local non sûr : {path}")
        if path.read_bytes() == content and stat.S_IMODE(info.st_mode) == mode:
            return
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as file:
        temp = Path(file.name)
        try:
            os.fchmod(file.fileno(), mode)
            file.write(content)
            file.flush()
            os.replace(temp, path)
        finally:
            temp.unlink(missing_ok=True)


def install(home):
    launcher = home / ".local/bin/cab-desktop"
    if any(c in str(launcher) for c in '"\\$`%\n\r'):
        raise RuntimeError("Chemin incompatible avec une entrée Exec GNOME.")
    data_home = Path(os.environ.get("XDG_DATA_HOME") or home / ".local/share")
    target = data_home / "applications/chatgpt.desktop"
    if target.is_symlink():
        raise RuntimeError("Le raccourci ChatGPT est un lien symbolique.")
    source = target if target.exists() else DESKTOP
    # Remplacer seulement la commande de l’entrée principale par celle du lanceur.
    from configparser import ConfigParser

    config = ConfigParser(interpolation=None, strict=True)
    config.optionxform = str
    content = source.read_text(encoding="utf-8")
    config.read_string(content)
    lines = content.splitlines(keepends=True)
    section = ""
    for index, line in enumerate(lines):
        if line.startswith("["):
            section = line.strip()
        if section == "[Desktop Entry]" and line.startswith("Exec="):
            lines[index] = f'Exec="{launcher}" launch %U\n'
            break
    else:
        raise RuntimeError("Entrée Exec ChatGPT introuvable.")
    write_owned(launcher, Path(__file__).read_bytes(), 0o755)
    write_owned(target, "".join(lines).encode("utf-8"), 0o600)
    print(f"Raccourci GNOME configuré : {target}")


def launch(home, urls):
    invoke(str(ENGINE), "app-server", "daemon", "start")
    invoke(str(ENGINE), "app-server", "daemon", "version")
    codex_home = Path(os.environ.get("CODEX_HOME") or home / ".codex")
    socket_dir = codex_home / "app-server-control"
    socket = socket_dir / "app-server-control.sock"
    if not socket.is_absolute() or any(c in str(socket) for c in ":?#%") or any(c.isspace() for c in str(socket)):
        raise RuntimeError("Le chemin du socket n’est pas compatible avec l’adresse WebSocket.")
    info = socket_dir.lstat()
    peer = socket.stat()
    if (not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid()
            or info.st_mode & 0o077 or not stat.S_ISSOCK(peer.st_mode)
            or peer.st_uid != os.getuid() or peer.st_mode & 0o077):
        raise RuntimeError("Le socket du daemon doit être privé et appartenir au compte.")
    env = os.environ.copy()
    for key in ("CODEX_CLI_PATH", "CODEX_APP_SERVER_FORCE_CLI"):
        env.pop(key, None)
    env["CODEX_APP_SERVER_WS_URL"] = f"ws+unix://localhost{socket}:/rpc"
    os.execve(APP, [str(APP), *urls], env)


def check(home):
    expected = (home / ".codex/packages/app-server-daemon/current/bin/codex").resolve()
    pid = os.getppid()
    while pid > 1:
        proc = Path("/proc") / str(pid)
        fields = dict(line.split(":", 1) for line in (proc / "status").read_text().splitlines() if ":" in line)
        if proc.joinpath("exe").resolve() == expected:
            if fields["NoNewPrivs"].strip() != "0":
                raise RuntimeError("Le daemon actif porte NoNewPrivs=1.")
            print(f"Daemon local dans la chaîne de cette commande : PID {pid}.", flush=True)
            invoke("/usr/bin/sudo", "-n", "id")
            return
        pid = int(fields["PPid"])
    raise RuntimeError("Exécuter cette vérification depuis un chat de l’application de bureau.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("install", "launch", "check"))
    parser.add_argument("urls", nargs="*")
    args = parser.parse_args()
    if sys.platform != "linux" or os.getuid() == 0 or os.geteuid() != os.getuid():
        parser.error("Exécuter sous le compte GNOME habituel, sans sudo.")
    if args.urls and args.action != "launch":
        parser.error("Les URL sont réservées au lancement.")
    home = Path(pwd.getpwuid(os.getuid()).pw_dir)
    try:
        if args.action == "install":
            install(home)
        elif args.action == "launch":
            launch(home, args.urls)
        else:
            check(home)
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
        parser.exit(1, f"CABD : {error}\n")


if __name__ == "__main__":
    main()
