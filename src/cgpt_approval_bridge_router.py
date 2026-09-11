#!/usr/bin/env python3
"""Routeur OC du cgpt-approval-bridge.

Usage :
  router.py propose --change-id X --title T --files a,b --summary S [--approval-id ID]
  router.py poll --approval-id ID [--timeout 600 --interval 5]
  router.py decide --approval-id ID --reviewer CGPT --decision approve|reject [--comment C]

Codes retour :
  0 APPROVED / succes, 2 REJECTED, 3 EXPIRED/CANCELLED/timeout, 1 erreur d usage ou magasin.
"""
import argparse
import json
import sys
import time

import cgpt_approval_bridge_server as server


def parse_files(value):
    """Decoupe la liste de fichiers frugale."""
    items = [x.strip() for x in value.split(",")]
    return [x for x in items if x]


def cmd_propose(ns):
    """OC -> request_validation : cree un PENDING persistant."""
    try:
        item = server.do_propose(
            {
                "change_id": ns.change_id,
                "title": ns.title,
                "files": parse_files(ns.files),
                "summary": ns.summary or "",
                "approval_id": ns.approval_id or "",
            }
        )
    except (server.ValidationError, server.StoreError) as exc:
        print("erreur propose : %s" % exc, file=sys.stderr)
        return 1
    print(json.dumps(item, ensure_ascii=False))
    return 0


def cmd_poll(ns):
    """OC -> attend APPROVED explicite, echec ferme sinon."""
    deadline = time.time() + ns.timeout
    while True:
        try:
            item = server.do_get({"approval_id": ns.approval_id})
        except (server.ValidationError, server.StoreError) as exc:
            print("erreur poll : %s" % exc, file=sys.stderr)
            return 1
        status = item.get("status")
        if status == "APPROVED":
            print(json.dumps(item, ensure_ascii=False))
            return 0
        if status in ("REJECTED",):
            print(json.dumps(item, ensure_ascii=False))
            return 2
        if status in ("CANCELLED", "EXPIRED"):
            print(json.dumps(item, ensure_ascii=False), file=sys.stderr)
            return 3
        if time.time() >= deadline:
            print("timeout : decision CGPT non recue pour %s" % ns.approval_id, file=sys.stderr)
            return 3
        time.sleep(ns.interval)


def cmd_decide(ns):
    """CGPT -> approve ou reject explicite."""
    try:
        if ns.decision == "approve":
            item = server.do_decide(
                {"approval_id": ns.approval_id, "reviewer": ns.reviewer, "comment": ns.comment or ""}
                , "APPROVED",
            )
        else:
            item = server.do_decide(
                {"approval_id": ns.approval_id, "reviewer": ns.reviewer, "comment": ns.comment or ""}
                , "REJECTED",
            )
    except (server.ValidationError, server.StoreError) as exc:
        print("erreur decide : %s" % exc, file=sys.stderr)
        return 1
    print(json.dumps(item, ensure_ascii=False))
    return 0


def build_parser():
    """Construit le parseur CLI."""
    parser = argparse.ArgumentParser(description="Routeur OC du cgpt-approval-bridge")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_propose = sub.add_parser("propose", help="demande une validation CGPT")
    p_propose.add_argument("--change-id", required=True)
    p_propose.add_argument("--title", required=True)
    p_propose.add_argument("--files", required=True, help="liste separee par virgules")
    p_propose.add_argument("--summary", default="")
    p_propose.add_argument("--approval-id", default="")
    p_poll = sub.add_parser("poll", help="attend la decision CGPT")
    p_poll.add_argument("--approval-id", required=True)
    p_poll.add_argument("--timeout", type=int, default=600)
    p_poll.add_argument("--interval", type=int, default=5)
    p_decide = sub.add_parser("decide", help="decision CGPT")
    p_decide.add_argument("--approval-id", required=True)
    p_decide.add_argument("--reviewer", required=True)
    p_decide.add_argument("--decision", required=True, choices=["approve", "reject"])
    p_decide.add_argument("--comment", default="")
    return parser


def main(argv=None):
    """Point d entree CLI."""
    parser = build_parser()
    ns = parser.parse_args(argv)
    if ns.cmd == "propose":
        return cmd_propose(ns)
    if ns.cmd == "poll":
        return cmd_poll(ns)
    if ns.cmd == "decide":
        return cmd_decide(ns)
    parser.print_usage(sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
