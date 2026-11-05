# Prévalidation des payloads de build — CAB 2.2.39

## Why
Le développeur demande d’aider PA01 et de compléter le contrat CAB si nécessaire.
Le premier helper embarqué était syntaxiquement invalide malgré une enveloppe
Bash analysable. Après correction, le build a produit son artefact, mais la
ligne BUILD_OK contenait une tabulation ldd non échappée et le rapport a échoué.

## What Changes
Documenter contrôle par langage des octets finaux, vérification sémantique
bornée des constantes, sérialisation JSON au producteur et reprise sur artefact
existant qualifié. Préserver sorties échouées, effets et protections.

## Scope
Référence ciblée, liens du skill/plugin/commande via le triage, cadrages et
spécification documentaire. Aucun changement runtime hors versions. SCM,
qualification ciblée, commit/publication/CABU ; code non attribué, ACL ultérieure.
Le correcteur ne modifie ni payload métier ni état Pixs ; le propriétaire produit
et valide sa correction. Retour par version précédente sous transaction propre,
sans restauration d’un ancien état métier ni rejeu d’une once.
