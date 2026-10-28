#!/usr/bin/env python3
"""Review or apply CAB 2.1.2 protocol updates to explicitly selected projects."""

import argparse
import hashlib
import os
from pathlib import Path
import re
import tempfile

VERSION = "2.1.2"
PILOTED = ("ACSP", "ACSMP", "CISMP", "DOPP", "ISMP", "PPSCP", "RSMP", "SCMP", "SPCMP")
MARKER = "## CAB 1.10.4 — réservations et accès par ressource"
LEGACY_MARKER = "## CAB 1.0.0 — réservations et RUN concurrents"
PREVIOUS_BLOCK_SHA256 = ('c039e5ffbca375c41481eb80913b96a765adaca22c8d47944c4bb2a6c6c0a859', '43119dded169df0b84a85af8d8dc4ec5ec9b7787b8044f89aa735b45f3722ce4', 'a4182b778a8d94fcd5be415db51e57ec769502decd96adf57dd8e02e3b0ad5b8', 'b39b23a3dabbc5e1fea41753ef49442ca99425c48f7c30b956bc478b07b02667', '0769159ecb3d1b391346e0fa9d0c060b2451a2577ce0dc92add298f8423f1b61')
PROMPT_END = "<!-- CAB-PROMPT-END -->"
BLOCK = """
## CAB 1.10.4 — réservations et accès par ressource

Lire ORCHESTRATED_CODING.md avant pilotage. Un OpenCode et un broker stdio sont partagés ; jobs, mandats, décisions, once, preuves et gates restent isolés par RUN.

Consulter GET /runs et OpenSpec, examiner dépendances sémantiques et ressources puis réserver atomiquement change/intention par POST /runs/reserve avant préparation. Un RUN traite un change réservé à la fois ; les sous-jobs héritent du parent. Chaque change suivant conserve run_id mais utilise session, jobId et génération neufs. Les checkpoints sont output/<prompt>/<run_id>/state.json ; conserver preuves/propriété lors d'une reprise historique sans écraser un pair.

Les périmètres déclarés peuvent se recouvrir. Les fichiers partagés utilisent des accès temporaires : lectures compatibles, écriture exclusive, ensemble acquis atomiquement ou attente sans attribution partielle. La FIFO ne bloque que les demandes incompatibles ; les ressources indépendantes continuent. exclusiveResources est une optimisation vérifiée ; un pair recouvrant attend la promotion sûre du fichier privé.

Cibler /runs/<run_id>/job/... et /decision/<requestId>. request_validation inclut coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, expected_revisions et resources. Préparer le contenu exact ; une base périmée exige relecture et nouvelle demande. Une décision reste explicite, une édition porte un fichier, une commande son manifeste complet, et once est unique. Une réservation ou un verrou n'approuve rien.

Après décision et avant effet, utiliser /locks/acquire ; vérifier HELD, token et fencing. WAITING ou STALE ne donne aucune permission. Un fichier privé prouvé peut utiliser l'admission interne sans verrou partagé séparé. Ne pas attendre une extension de ressources tout en conservant un ensemble. Chaque sous-opération d'un groupe reste soumise à sa propre décision/once ; une correction approuvée peut rester dans l'ensemble détenu via /locks/attach.

La fin native corrélée et l'examen des effets précèdent /locks/release. Un effet inconnu conserve ses protections ; idle, timeout ou silence ne libèrent rien. Prévol divergent : conserver candidate, RUN et preuves ; terminer/libérer son accès avant transfert de récupération, sans purge ni rejeu.

Protéger les seules entrées/effets des validations. openspec validate --all --strict protège OpenSpec sans suspendre les éditions de code indépendantes. /publish vérifie les révisions des preuves et toutes les écritures à publier, puis persiste reçu, génération et libération sûre. Les pairs indépendants continuent sans /ready de cohorte ni réconciliation générale de referenceVersion. Synchronisation/archivage restent des mandats distincts autorisés sur leurs ressources. Une ancienne /integration ou /integration-request est refusée dans le profil 1.10.4.

À frontière sûre, /resources réduit la portée sans perdre les obligations. /closing après publication limite REPORT au STATISTIQUES.md de l'archive du change. Préparer les statistiques via /statistics et format=markdown sans RUN d'observation supplémentaire, finaliser/vérifier les six sections après archive, puis gate, désarmement et /release. Les mesures absentes restent N/A ; l'archive seule ne prouve pas la fin du parent.

Pause/arrêt ciblés ne suspendent que leur RUN. Les seuls gels globaux sont GLOBAL_RECONCILIATION, SHARED_MAINTENANCE, GLOBAL_PAUSE et GLOBAL_STOP ; ils demandent cause, autorité, drainage et quiescence prouvés. Ajouter/reprendre un RUN ne purge ni ne reconnecte l'infrastructure. Le registre schéma 4 et le protocole nécessitent un jeu compatible ; migration et retour arrière sont une maintenance explicitement autorisée.

Sans candidat disponible, attendre les dépendances ou conflits ; ne déclarer TERMINÉ qu'après preuve d'absence de travail restant. CISM, CAISM et prompts directs restent exclus du pilotage concurrent. La préparation source ne propage aucun prompt consommateur.
"""


def transform(text, name):
    """Change only orchestration clauses; retain each prompt's specific scope."""
    suffix = ""
    existing_marker = next((marker for marker in (MARKER, LEGACY_MARKER) if marker in text), None)
    if existing_marker:
        prefix, managed = text.split(existing_marker, 1)
        managed = existing_marker + managed
        if PROMPT_END in managed:
            managed, suffix = managed.split(PROMPT_END, 1)
        digest = hashlib.sha256(managed.strip().encode()).hexdigest()
        if digest not in (*PREVIOUS_BLOCK_SHA256, hashlib.sha256(BLOCK.strip().encode()).hexdigest()):
            raise RuntimeError("Managed prompt block was modified; manual reconciliation required")
        text = prefix.rstrip() + "\n"
    text = re.sub(r"output/([a-z]+)-state\.json", r"output/\1/<run_id>/state.json", text)
    replacements = {
        "un seul change est traité à la fois": "un seul change réservé est traité à la fois par RUN",
        "aucun change n’est créé tant qu’un change actif existe": "aucun change n’est créé avant sa réservation atomique et celle de son intention",
        "tant qu’un unique change est concerné": "tant que le seul change réservé du RUN est concerné",
        "Un unique change actif, cohérent et prêt à implémenter": "Le change réservé par ce RUN, cohérent et prêt à implémenter",
        "l’unique change actif": "l’unique change réservé par ce RUN",
        "Lorsqu’un unique change OpenSpec actif est identifié et que la sélection porte exclusivement sur ce change": "Lorsqu’un change OpenSpec cohérent est réservé exclusivement par ce RUN et que la sélection porte sur ce seul change",
        "Lorsque aucun change OpenSpec actif n'existe": "Lorsqu'aucun change compatible existant n'est disponible pour ce RUN",
        "Si un change actif existe, aucun fichier n’est modifié : l’orchestrateur restitue son état et renvoie vers ISM ou ISMP.": "Si un change cohérent est disponible et réservé par ce RUN, l’orchestrateur transmet son implémentation à ISMP ; les changes réservés par les autres RUN sont exclus de la sélection.",
        "Si le référentiel est cohérent et qu’aucun change actif n’existe, il passe à la sélection.": "Si le référentiel est cohérent, il cherche un candidat disponible, indépendant et réservable atomiquement.",
        "mais aucun change OpenSpec actif ne permet de lancer ISM ou ISMP": "mais aucun change existant disponible et compatible ne permet de lancer ISMP pour ce RUN",
        "Sans change actif, l’orchestrateur sélectionne un unique candidat": "Sans change disponible pour ce RUN, l’orchestrateur sélectionne un unique candidat réservable et compatible",
        "Un unique change actif, cohérent et prêt, à implémenter sans sélectionner un change suivant": "Un change cohérent réservé par ce RUN, prêt à implémenter sans sélectionner le suivant",
        "Aucun change actif, spécifications cohérentes et objectif limité à préparer le prochain change sans l’implémenter": "Aucun change compatible disponible pour ce RUN, spécifications cohérentes et objectif limité à préparer un candidat réservable",
        "s’il désigne un unique change actif cohérent, poursuivre avec ce seul change": "s’il désigne le change actif cohérent réservé par ce RUN, poursuivre avec ce seul change",
        "si plusieurs changes actifs rendent le change ciblé ambigu": "si l’attribution du change ciblé reste ambiguë ou si un autre RUN le réserve",
        "Plusieurs changes actifs, un change incomplet ou une incohérence fait passer l’état à `REPRISE`.": "Une incohérence du change réservé par ce RUN fait passer l’état à `REPRISE`. Les autres changes attribués sont suivis par leurs propriétaires.",
        "S’il n’existe aucun candidat, l’orchestrateur vérifie en lecture seule l’absence de change actif et d’exigence validée sans preuve d’implémentation. Cette preuve complète mène à `TERMINÉ` ; toute incertitude mène à `BLOQUÉ`.": "S’il n’existe aucun candidat disponible, l’orchestrateur consulte les réservations et dépendances. Un travail restant réservé, dépendant ou en conflit maintient une attente non terminale. Seule la preuve d’absence de change actif, de RUN actif et d’exigence sans preuve permet `TERMINÉ` ; une incohérence non résolue suit la procédure de reprise.",
        "l’orchestrateur mandate l’archivage OpenSpec, vérifie son succès, puis revient immédiatement à `SÉLECTION`, sans créer de conversation enfant pour l’orchestrateur.": "l’orchestrateur acquiert les ressources utiles, revalide les preuves ciblées, mandate l’archivage OpenSpec et vérifie sa publication. Il libère les accès métier avant STATISTIQUES.md et le gate. Après rapport vérifié, gate, désarmement et libération réconciliés, il revient à `SÉLECTION`, sans créer de conversation enfant pour l’orchestrateur.",
    }
    for before, after in replacements.items():
        text = text.replace(before, after)
    # The protocol owns the exact route and lifecycle definitions, including global actions.
    return text.rstrip() + "\n\n" + BLOCK.strip() + "\n" + PROMPT_END + "\n" + suffix.lstrip("\n")


def atomic_update(path, original, changed):
    if path.read_bytes() != original:
        raise RuntimeError(f"Concurrent modification: {path}")
    descriptor, candidate = tempfile.mkstemp(prefix=".cab-candidate-", dir=path.parent)
    try:
        os.fchmod(descriptor, path.stat().st_mode & 0o777)
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(changed)
            handle.flush()
            os.fsync(handle.fileno())
        if path.read_bytes() != original:
            raise RuntimeError(f"Concurrent modification: {path}")
        os.replace(candidate, path)
    finally:
        if os.path.exists(candidate):
            os.unlink(candidate)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", action="append", required=True, type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    protocol = Path(__file__).parents[1] / "skills/approval-bridge/references/concurrent-runs.md"
    protocol_text = protocol.read_text(encoding="utf-8")
    embedded = re.sub(r"^(#{1,4}) ", lambda match: "#" * (len(match[1]) + 2) + " ", protocol_text, flags=re.M)
    cab_protocol = (Path(__file__).parents[3] / "ORCHESTRATED_CODING.md").read_text(encoding="utf-8")
    recovery_heading = "## Prévol de récupération divergent dans la même session"
    recovery = cab_protocol.split(recovery_heading, 1)[1].split("\n## ", 1)[0]
    for project in args.project:
        project = project.resolve(strict=True)
        index = (project / "PROMPTS/INDEX.md").read_text(encoding="utf-8")
        protected = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in (project / "PROMPTS").glob("*.md") if p.stem not in PILOTED}
        for name in PILOTED:
            if f"| `{name}` |" not in index:
                raise RuntimeError(f"Missing catalog entry: {project.name}/{name}")
            path = project / "PROMPTS" / (name + ".md")
            original = path.read_bytes()
            changed = transform(original.decode("utf-8"), name).encode("utf-8")
            if original != changed:
                print(f"{'UPDATE' if args.apply else 'REVIEW'} {path}")
                if args.apply:
                    atomic_update(path, original, changed)
        path = project / "ORCHESTRATED_CODING.md"
        if not path.exists() or path.is_file():
            original = path.read_bytes() if path.is_file() else None
            text = original.decode("utf-8") if original is not None else re.split(r"\n## Pilotage concurrent CAB [0-9.]+", cab_protocol, maxsplit=1)[0]
            text = re.sub(r"Projet : `[^`]+`", f"Projet : `{project.name}`", text, count=1)
            marker = "\n## Pilotage concurrent CAB 1.10.4\n\n"
            existing_protocol_marker = next((m for m in (marker, "\n## Pilotage concurrent CAB 1.0.0\n\n") if m in text), None)
            end_marker = "\n<!-- CAB-CONCURRENT-END -->\n"
            if existing_protocol_marker:
                prefix, managed = text.split(existing_protocol_marker, 1)
                suffix = managed.split(end_marker, 1)[1] if end_marker in managed else ""
                changed = (prefix + marker + embedded.rstrip() + end_marker + suffix).encode("utf-8")
                if changed != original:
                    print(f"{'UPDATE' if args.apply else 'REVIEW'} {path}")
                    if args.apply:
                        atomic_update(path, original, changed)
            if not existing_protocol_marker:
                # Preserve native proofs, cadence, messages and all unrelated safeguards.
                text = re.sub(r"(?<!<run_id>)/job/(arm|progress|recover|terminal-gate|disarm)", r"/runs/<run_id>/job/\1", text)
                text = text.replace("`GET /job`", "`GET /runs/<run_id>/job`")
                text = text.replace("Avant toute session persistante neuve, appliquer le protocole autorisé",
                    "Avant une initialisation globale exclusive, appliquer le protocole autorisé")
                text = text.replace("permet le désarmement du seul job correspondant, puis l'arrêt autorisé du",
                    "permet le désarmement du seul job correspondant. Seulement après libération et quiescence de tous les RUN, il permet l'arrêt autorisé du")
                old_heading = "## Nouvelle session CAB après prévol de récupération divergent"
                if old_heading in text:
                    start = text.index(old_heading)
                    end = text.find("\n## ", start + len(old_heading))
                    if end < 0:
                        end = len(text)
                    text = text[:start] + recovery_heading + recovery + text[end:]
                changed = (text.rstrip() + "\n" + marker + embedded.rstrip() + end_marker).encode("utf-8")
                print(f"{'UPDATE' if args.apply else 'REVIEW'} {path}" + (" (create)" if original is None else ""))
                if args.apply:
                    if original is None:
                        with path.open("xb") as handle:
                            handle.write(changed)
                            handle.flush()
                            os.fsync(handle.fileno())
                    else:
                        atomic_update(path, original, changed)
        else:
            raise RuntimeError(f"Missing required piloted protocol: {project}")
        if any(hashlib.sha256(p.read_bytes()).hexdigest() != digest for p, digest in protected.items()):
            raise RuntimeError(f"A direct prompt changed: {project}")


if __name__ == "__main__":
    main()
