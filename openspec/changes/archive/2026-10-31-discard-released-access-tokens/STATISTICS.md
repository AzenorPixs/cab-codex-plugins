# Statistiques — retrait des jetons d’accès libérés CAB 2.1.35

## 1. Statistiques générales et décisions

Session SCM directe ; agent Codex. Modèle exact, niveau de raisonnement,
durée exhaustive, tokens et coût : N/A, non mesurés. Change sans code de lot ;
attribution ACL ultérieure. Cinq tâches terminées sur cinq.

## 2. Types de messages et d’outils

Lectures ciblées, modification source, OpenSpec, tests et contrôles de
distribution. Totaux exhaustifs de messages, appels d’outils et fichiers
touchés : N/A, non instrumentés. Aucun accès web externe ni permission native.

## 3. Fichiers modifiés

Registre de coordination, contrôleur, tests de registre et contrôleur,
spécification concurrente, documentation technique et distribution,
changelog, cartographie, registre des codes et rapport d’archive.
Le nombre exhaustif de chemins n’a pas été mesuré séparément des fichiers
alignés pour l’incrément 2.1.35. Le `ORCHESTRATED_CODING.md` déjà synchronisé
dans ce checkout reste hors du correctif CAB.

## 4. Commandes et vérifications

| Vérification finale | Résultat |
|---|---:|
| Node global | 691 découverts : 660 réussis, 0 échoué, 31 ignorés |
| Python global | 81 réussis, 0 échoué |
| `py_compile` des onze fichiers Python modifiés | 11 réussis |
| `node --check` des fichiers JavaScript modifiés | 40 réussis |
| OpenSpec standard global | 17/17 réussis |
| OpenSpec strict global | 17/17 réussis |
| Tâches OpenSpec | 5/5 terminées |

Les tests synthétiques vérifient que l’accès actif conserve son jeton, que la
libération et la publication l’effacent du registre et de la réponse, que le
rejeu exact reste idempotent après restauration et qu’une requête divergente
est refusée. Aucun service CAB/OpenCode actif, RUN ou bail n’a été testé.

## 5. Accès web

Aucun outil de recherche web. Nombre d’accès web externe : 0.

## 6. Synthèse globale

CAB 2.1.35 supprime le jeton brut lorsqu’un accès passe à `RELEASED`, y
compris après publication. Le reçu d’empreinte préserve l’idempotence sans
réexposer le jeton. Les accès actifs gardent leur jeton et leurs gardes. Le
change est archivé ; commit, publications et activation CABU restent à effectuer
et ne sont pas déduits des tests locaux.
