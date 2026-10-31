# Statistiques — projection minimale du bootstrap CAB Monitor 2.1.34

## 1. Statistiques générales et décisions

Session SCM directe ; agent Codex. Modèle exact, niveau de raisonnement,
durée exhaustive, tokens et coût : N/A, non mesurés. Change sans code de lot ;
attribution ACL ultérieure. Cinq tâches terminées sur cinq.

## 2. Types de messages et d’outils

Lectures ciblées, modifications source/documentation, tests et validations.
Totaux exhaustifs des messages, appels d’outils et fichiers touchés : N/A,
non instrumentés. Aucun accès web externe ni permission native réelle.

## 3. Fichiers modifiés

Moniteur, tests, commande et skill CAB, cadrages, OpenSpec, cartographie,
changelog et rapport statistique. Nombre exhaustif de fichiers distincts : N/A.
`ORCHESTRATED_CODING.md` dans CAB reste inchangé ; son référentiel est le projet
template et sa mise à jour relève d’un correctif distinct.

## 4. Commandes et vérifications

| Vérification finale | Résultat |
|---|---:|
| Node global | 689 découverts : 658 réussis, 0 échoué, 31 ignorés |
| Python global | 81 réussis, 0 échoué |
| `node --check` sur cinq fichiers | 5 réussis |
| `py_compile` sur neuf fichiers | 9 réussis |
| OpenSpec global strict final | 16/16 réussis |
| Tâches OpenSpec | 5/5 terminées |

La suite Node complète a d’abord échoué sur une assertion qui lisait la copie
locale du protocole ; le test CAB a été recentré sur les artefacts distribués
par CAB. La validation stricte a identifié une exigence de monitoring trop
longue ; le delta a été réparti en exigences plus courtes puis validé. Les
résultats du tableau sont les validations finales, sans double comptage des
essais ciblés.

## 5. Accès web

Aucun outil de recherche web. Les tests ont utilisé des serveurs HTTP locaux
de fixture. Nombre d’accès web externe : 0.

## 6. Synthèse globale

Le bootstrap CAB vérifie désormais version et workspace par `GET /api/identity`
et garde le snapshot multi-RUN pour le tableau de bord. Le nouvel endpoint
retourne uniquement ces deux champs et refuse les requêtes avec paramètres,
les méthodes non GET et les origines étrangères. Les commandes, skill,
spécifications et composants communs sont en 2.1.34. Le change est archivé et
les validations source sont terminées ; commit, publications et activation CABU
restent à effectuer et ne sont pas déduits des tests locaux.
