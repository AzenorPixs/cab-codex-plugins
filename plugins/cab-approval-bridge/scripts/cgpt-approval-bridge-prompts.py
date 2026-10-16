#!/usr/bin/env python3
"""Review or apply CAB 1.0.0 protocol updates to explicitly selected projects."""

import argparse
import hashlib
import os
from pathlib import Path
import re
import tempfile

VERSION = "1.2.1"
PILOTED = ("ACSP", "ACSMP", "CISMP", "DOPP", "ISMP", "PPSCP", "RSMP", "SCMP", "SPCMP")
MARKER = "## CAB 1.0.0 — réservations et RUN concurrents"
PREVIOUS_BLOCK_SHA256 = ('c039e5ffbca375c41481eb80913b96a765adaca22c8d47944c4bb2a6c6c0a859', '43119dded169df0b84a85af8d8dc4ec5ec9b7787b8044f89aa735b45f3722ce4', 'a4182b778a8d94fcd5be415db51e57ec769502decd96adf57dd8e02e3b0ad5b8', 'b39b23a3dabbc5e1fea41753ef49442ca99425c48f7c30b956bc478b07b02667')
PROMPT_END = "<!-- CAB-PROMPT-END -->"
BLOCK = """
## CAB 1.0.0 — réservations et RUN concurrents

Lire le protocole concurrent de ORCHESTRATED_CODING.md avant pilotage.
Un OpenCode et un broker MCP stdio sont partagés ; les mandats, décisions,
permissions, preuves, récupérations et gates sont isolés par RUN.

Avant sélection, consulter GET /runs et OpenSpec. Un change réservé par un
autre RUN n'est pas sélectionnable. Examiner fichiers, capacités, contrats,
dépendances et ressources partagées ; des fichiers distincts ne prouvent pas
l'indépendance. Réserver atomiquement le change et sa clé d'intention par
POST /runs/reserve avant création ou préparation. Un conflit conduit au
prochain candidat compatible ou à une attente non terminale.

Un RUN traite un seul change à la fois ; plusieurs RUN peuvent traiter des
changes compatibles. Chaque nouveau change utilise une session OpenCode et
un jobId inédits. Après libération contrôlée, le cycle parent conserve son
run_id et réserve le suivant avec une version fraîche. Les sous-jobs héritent
du RUN et du checkpoint parent sans arrêter CAB à leur retour.
Si le checkpoint scopé manque à la reprise, l'orchestrateur lit l'ancien
output/<prompt>-state.json en lecture seule et réconcilie identité, preuves
natives et propriété avant migration de ce seul RUN. Un ancien job armé
reste sur les interfaces historiques jusqu'à sa clôture réconciliée ; ne pas
écraser son état ni transformer ses anciennes permissions en autorisations.

Cibler /runs/<run_id>/job/... et /runs/<run_id>/decision/<requestId>.
Chaque request_validation inclut run_id, reservation_version et, pour une
commande, resources explicites couvertes par la réservation. Appeler
broker_readiness avec run_id et vérifier les métadonnées natives. Une
réservation n'approuve jamais une opération ; un mandat reste un fichier
ou une commande exacte avec une décision explicite et once unique.

Avant extension, obtenir POST /runs/<run_id>/extend avec la version courante.
Préparer une opération complète et vérifiable par fichier avant armement,
sans reformulation du contenu approuvé ; traiter immédiatement les demandes
et rapports dans la boucle SSE existante, avec décision et once par opération.
Préparer les statistiques pendant le travail via GET /runs/<run_id>/statistics
et format=markdown, sans RUN d'observation ni appel LLM supplémentaire.
Après quiescence, /resources avec version, resources et evidence peut réduire
la portée sans l'élargir ; conserver la nouvelle génération retournée.
Terminer analyses, validations locales, commandes et brouillon avant la file.
Soumettre /integration-request avec version et evidence : file FIFO durable,
annulation explicite cancel=true, aucune libération par timeout. Dès une demande,
terminer l'opération autorisée puis atteindre le prochain jalon cohérent validé
et /ready, sans attendre toutes les tâches du change ni nouveau mandat stable.
GET /runs/<run_id>/integration-status expose les obstacles par RUN sans contenu.
L'intégration dans la référence commune exige l'exclusion /integration,
les validations combinées et l'archivage autorisé. La clôture exige le rapport
STATISTIQUES.md vérifié, même lorsque sa rédaction suit la publication.
Dans le répertoire partagé, chaque RUN atteint d'abord un jalon stable avec
ses validations locales et le déclare par /ready avec version et evidence.
L'intégration attend ces jalons et la quiescence native ; les nouvelles
opérations des autres RUN sont suspendues. Le propriétaire peut déclarer
project:* en lecture pour ses validations globales sous cette exclusion.
L'exclusion ne couvre que base, quiescence, validations combinées applicables,
synchronisation, archive et preuve de publication. Rapport, relevés finaux et
gate suivent sa libération ; aucun timeout ne libère un effet inconnu.
La libération /integration avec acquire=false précise published et, en cas
de publication, ses evidence. Les autres RUN réconcilient referenceVersion
par /reconcile, avec preuves et nouvelle version de réservation, avant reprise.
Réexaminer les validations affectées sans rejouer les effets déjà prouvés.
Le profil optimisé ajoute referenceVersion attendue et completion avec
transactionId inédit et reportFile pour publier, réduire au rapport et libérer
en une seule transition durable. Répéter exactement la transaction restitue
son reçu sans effet ; un contenu divergent est refusé. Conserver la génération
courante du registre, sans traiter un ancien reçu comme une autorisation.
Le schéma 3 de ces reçus exige les nouvelles sources, sans migration implicite.
Après publication prouvée et libération de l'exclusion, /closing avec version,
evidence et reportFile limite irréversiblement le RUN au STATISTIQUES.md de sa
propre archive. Les pairs réconcilient et reprennent ; le rapport reste sous
mandat unitaire et attend toute autre exclusion. Finaliser les bornes après
archive et publier le brouillon vérifié, avec N/A pour les mesures absentes.
La libération /release exige gate, désarmement, preuves et réconciliation métier ;
ni délai, ni silence, ni interruption ne libère automatiquement le change.
Prévol divergent : conserver la candidate, le RUN et les preuves ; utiliser
la récupération prepare/retry/complete sans purge ni renouvellement.

Le démarrage ou l'arrêt d'un RUN ne purge ni ne reconnecte le broker commun.
Une action globale exige la quiescence de tous les RUN affectés. Sans candidat
disponible, attendre les dépendances ou ressources ; ne pas déclarer le projet
terminé tant qu'un autre RUN ou une exigence sans preuve subsiste.
CISM, CAISM et les prompts directs restent exclus et ne sont pas exécutés
en concurrence avec ces travaux.
"""


def transform(text, name):
    """Change only orchestration clauses; retain each prompt's specific scope."""
    suffix = ""
    if MARKER in text:
        prefix, managed = text.split(MARKER, 1)
        managed = MARKER + managed
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
        "l’orchestrateur mandate l’archivage OpenSpec, vérifie son succès, puis revient immédiatement à `SÉLECTION`, sans créer de conversation enfant pour l’orchestrateur.": "l’orchestrateur obtient l’exclusion d’intégration, revalide la base courante, mandate l’archivage OpenSpec et vérifie sa publication. Il libère l’exclusion avant STATISTIQUES.md et le gate. Après rapport vérifié, gate, désarmement et libération réconciliés, il revient à `SÉLECTION`, sans créer de conversation enfant pour l’orchestrateur.",
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
            text = original.decode("utf-8") if original is not None else cab_protocol.split("\n## Pilotage concurrent CAB 1.0.0", 1)[0]
            text = re.sub(r"Projet : `[^`]+`", f"Projet : `{project.name}`", text, count=1)
            marker = "\n## Pilotage concurrent CAB 1.0.0\n\n"
            end_marker = "\n<!-- CAB-CONCURRENT-END -->\n"
            if marker in text:
                prefix, managed = text.split(marker, 1)
                suffix = managed.split(end_marker, 1)[1] if end_marker in managed else ""
                changed = (prefix + marker + embedded.rstrip() + end_marker + suffix).encode("utf-8")
                if changed != original:
                    print(f"{'UPDATE' if args.apply else 'REVIEW'} {path}")
                    if args.apply:
                        atomic_update(path, original, changed)
            if "## Pilotage concurrent CAB 1.0.0" not in text:
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
