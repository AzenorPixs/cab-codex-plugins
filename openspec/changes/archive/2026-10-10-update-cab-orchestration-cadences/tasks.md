## 1. Contrat validé

- [x] 1.1 Créer et valider les deltas des trois capacités dans le périmètre approuvé.

## 2. Protocole et distribution

- [x] 2.1 Inscrire l'attente PLLM persistante, le SSE temps réel, les contrôles 3 s et les pauses 7 s dans AGENTS, la commande et le skill CAB.
- [x] 2.2 Expliciter la collecte statistique toutes les 30 minutes sans attendre le créneau ni arrêter le travail.
- [x] 2.3 Aligner les cadrages, README, CHANGELOG et les briques distribuées sur 0.86.8.
- [x] 2.4 Adapter les contrôles de distribution aux exigences et à la version.

## 3. Validation et clôture

- [x] 3.1 Réussir les vérifications de syntaxe, tests applicables, versions, JSON et UTF-8/LF.
- [x] 3.2 Contrôler la cohérence et le périmètre avant la synchronisation native à l'archivage.

## Opérations de clôture après validation

L'archivage natif synchronise les trois références OpenSpec et déplace
uniquement ce change. Après sa preuve, produire et vérifier le
`STATISTIQUES.md` factuel SCM à six sections dans l'archive. Ces opérations ne
sont pas cochées avant exécution : leur preuve finale figure dans le rapport,
afin de ne pas créer de précondition circulaire à l'archivage.

## Preuves avant archivage

- Delta strict : valide après découpage des exigences initialement trop longues.
- Tests Node hors sandbox : 33/33 réussis ; les serveurs simulés loopback sont interdits dans le sandbox (`EPERM`).
- Tests Python : 37/37 réussis après alignement de deux attentes historiques de version `0.86.6` vers `0.86.8`.
- Syntaxe : trois fichiers Python et trois fichiers JavaScript modifiés vérifiés.
- UTF-8/LF, JSON et versions : réussis ; 23 fichiers examinés avant synchronisation.
- Périmètre contrôlé sans Git : 17 fichiers existants modifiés, six artefacts du nouveau change ; code runtime modifié uniquement pour la version.
- Référentiel strict avant synchronisation : échec sur 13 avertissements historiques de longueur répartis entre six spécifications ; une spécification valide, zéro erreur normative signalée.
