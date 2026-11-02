# Statistiques — CAB 2.2.3

## 1. Statistiques générales et décisions

Change archivé : `2026-11-02-fix-cabu-stopped-controller-status`, SCM directe.

| Agent | Modèle de LLM | Niveau de raisonnement |
|---|---|---|
| Codex, codage direct | N/A — non mesuré nativement | N/A — non mesuré nativement |

| Mesure | Valeur |
|---|---|
| Date d’archivage | 2026-11-02 |
| Début et fin de session | N/A — bornes globales non instrumentées |
| Durée totale et hors pauses | N/A — attentes et interruptions non mesurées |
| Tests finaux uniques | 924 réussis, 0 échec ; 31 tests opt-in ignorés |
| Tâches OpenSpec prouvées et terminées | 4 — préparation Git ; publication et CABU attestés séparément |
| Fichiers distincts touchés | 126 |
| Fichiers syntaxiquement valides | 92 fichiers distincts : 81 Node et 11 Python |
| Tokens, cache, coût et compactions de production | N/A — télémétrie exhaustive non exposée |

L’autorisation du développeur couvre SCM, incrément, publication, CABU et
information des sessions concernées. Aucun RUN Pixs n’a été édité manuellement.
Le correctif confirme MainPID=0 avec état inactive ou failed, sans remplacer
l’adoption du transfert par un résultat de processus. La preuve réelle PA01 reste insuffisante ; aucun terminal ou
NO_EFFECT n’est fabriqué à partir des deux erreurs natives aborted.

## 2. Types de messages et d’outils

Recherche et lecture ciblées, édition locale, tests Node/Python/OpenCode réel,
OpenSpec et Git SCM. Messages et appels par rôle : N/A — export exhaustif absent.
Les fixtures natives ne sont pas des agents délégués pour ce développement.

## 3. Fichiers modifiés

CABU, fixture de service et versions des briques,
manifestes, unités systemd, commandes, documentation, tests et OpenSpec.
Les références de protocole portent la version du correctif ; les sources et
empreintes historiques de la migration 2.2.0 restent identifiables.
Écritures et lignes ajoutées/supprimées : N/A — métrique exhaustive non collectée.
Les chemins complets du commit SCM constituent l’inventaire après publication.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs | Ignorés |
|---|---:|---:|---:|
| Node, cas uniques après reprise isolée | 830 | 0 résiduel | 31 |
| Python, unittest de référence | 93 | 0 | 0 |
| OpenCode natif réel | 1 | 0 | 0 |
| Total exécuté, sans double compte des campagnes ciblées | 924 | 0 | 31 |

Node : 83 212 ms ; campagne native : 9 258 ms. Contrôles ciblés CABU 87/87 sont inclus dans la suite globale et non additionnés. OpenSpec strict :
20/20 avant archive, 19/19 après synchronisation. La dernière suite globale compte 829 réussites, 1 échec de démarrage de fixture
avant le corps du test et 31 ignorés. Le seul cas échoué réussit ensuite isolément,
1/1, sans changement du produit ; les 830 cas uniques sont validés après cette
reprise. La campagne globale n’est pas présentée comme sans échec. Voir
VALIDATION.md et les empreintes séparées de qualification.json. Sources et empreintes des preuves :
[qualification.json](qualification.json).

## 5. Accès web et effets externes

Aucun accès web requis pour qualifier le code. La publication distante et
CABU suivent cette archive sous le même mandat ; leur réussite ne se déduit
pas des tests. Les versions actives et la réconciliation du cas réel doivent
être vérifiées après installation. Statistiques web exhaustives : N/A.

## 6. Bilan, impacts et limites

Source CAB 2.2.3 qualifiée. Le contrôleur principal doit terminer avant le
stop de son groupe ; le transfert adopté reste obligatoire. La pagination
reste complète ou en erreur explicite. Les frontières natives, accès et
permissions actives restent protégées. Le cas réel PA01 demeure à qualifier.
Absence de nouvelle dépendance, schéma 4 conservé.
Publication, activation et notification sont attestées séparément après le
commit ; aucun succès opérationnel n’est revendiqué à partir de cette archive.
