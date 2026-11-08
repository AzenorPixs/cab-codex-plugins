#!/usr/bin/env python3
"""Point d'entrée conservé pour signaler le retrait de l'ancien propagateur."""

import sys

VERSION = "2.4.35"


def main():
    print("Propagation historique retirée : consulter AGENTS.md et le contrat CAB distribué.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
