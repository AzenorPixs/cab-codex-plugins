#!/usr/bin/env python3
"""Purge l'état CAB d'une nouvelle session, après arrêt des ressources CAB."""

import argparse
import fcntl
import json
import os
import shutil
import stat
from contextlib import ExitStack
from pathlib import Path


STATE_DIRECTORY = "cgpt-approval-bridge"
INSTANCE_LOCK = "broker.instance.lock"


def validate_directory(value):
    path = Path(value)
    if not path.is_absolute() or path.name != STATE_DIRECTORY:
        raise ValueError("La cible doit être un répertoire absolu cgpt-approval-bridge.")
    if ".." in path.parts:
        raise ValueError("Les chemins avec .. sont interdits.")
    for part in (path, *path.parents):
        if part.is_symlink():
            raise ValueError("Un répertoire d'état ou son parent est un lien symbolique.")
    if path.exists() and not path.is_dir():
        raise ValueError("La cible d'état existe mais n'est pas un répertoire.")
    return path


def reset_directories(values):
    """Verrouille toutes les cibles avant d'effacer leur contenu sans le lire."""
    directories = list(dict.fromkeys(validate_directory(value) for value in values))
    if any(first != second and first in second.parents
           for first in directories for second in directories):
        raise ValueError("Les répertoires d'état ne doivent pas être imbriqués.")
    reports = []
    with ExitStack() as stack:
        locked = []
        for directory in directories:
            if not directory.exists():
                reports.append({"directory": str(directory), "removed_entries": 0})
                continue
            flags = os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW
            descriptor = os.open(directory / INSTANCE_LOCK, flags, 0o600)
            handle = stack.enter_context(os.fdopen(descriptor, "r+b"))
            metadata = os.fstat(descriptor)
            if not stat.S_ISREG(metadata.st_mode) or metadata.st_nlink != 1:
                raise ValueError("Le verrou doit être un fichier ordinaire sans lien matériel.")
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as exc:
                raise RuntimeError("Un broker détient encore le verrou CAB ; purge refusée.") from exc
            locked.append((directory, handle))

        for directory, handle in locked:
            removed = 0
            for entry in directory.iterdir():
                if entry.name == INSTANCE_LOCK:
                    continue
                if entry.is_symlink() or not entry.is_dir():
                    entry.unlink()
                else:
                    shutil.rmtree(entry)
                removed += 1
            # Garder l'inode verrouillé empêche un nouveau broker de contourner
            # flock pendant la purge ; seule sa métadonnée historique disparaît.
            handle.truncate(0)
            handle.flush()
            os.fsync(handle.fileno())
            remaining = [entry.name for entry in directory.iterdir() if entry.name != INSTANCE_LOCK]
            if remaining:
                raise RuntimeError("L'état CAB a été recréé pendant la purge ; démarrage refusé.")
            reports.append({"directory": str(directory), "removed_entries": removed,
                            "lock_metadata_cleared": True})
    return reports


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state-dir", action="append", required=True,
                        help="Répertoire d'état CAB résolu pour le broker ou le projet.")
    parser.add_argument("--confirm-new-session", action="store_true",
                        help="Confirmer une nouvelle session, ressources CAB arrêtées et OpenCode inactif.")
    args = parser.parse_args()
    if not args.confirm_new_session:
        parser.error("--confirm-new-session est requis ; ne pas purger un RUN en cours.")
    try:
        reports = reset_directories(args.state_dir)
    except (OSError, ValueError, RuntimeError) as exc:
        print(json.dumps({"status": "CAB_RESET_FAILED", "cause": str(exc)}, ensure_ascii=False))
        return 1
    print(json.dumps({"status": "CAB_STATE_RESET", "directories": reports}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
