# Statistiques — CAB 2.2.1

## 1. Statistiques générales et décisions

Change archivé : `2026-11-02-reconcile-approved-native-cancellation`, SCM directe.

| Agent | Modèle de LLM | Niveau de raisonnement |
|---|---|---|
| Codex, codage direct | N/A — non mesuré nativement | N/A — non mesuré nativement |

| Mesure | Valeur |
|---|---|
| Date d’archivage | 2026-11-02 |
| Début et fin de session | N/A — bornes globales non instrumentées |
| Durée totale et hors pauses | N/A — attentes et interruptions non mesurées |
| Tests finaux uniques | 921 réussis, 0 échec ; 31 tests opt-in ignorés |
| Tâches OpenSpec prouvées et terminées | 6 — préparation Git ; publication et CABU attestés séparément |
| Fichiers distincts touchés | 131 |
| Fichiers syntaxiquement valides | 92 fichiers distincts : 81 Node et 11 Python |
| Tokens, cache, coût et compactions de production | N/A — télémétrie exhaustive non exposée |

L’autorisation du développeur couvre SCM, incrément, publication, CABU et
information des sessions concernées. Aucun RUN Pixs n’a été édité manuellement.
La preuve native autorise uniquement la clôture d’une validation sans effet ;
elle ne remplace aucune décision métier ni ne rejoue once.

## 2. Types de messages et d’outils

Recherche et lecture ciblées, édition locale, tests Node/Python/OpenCode réel,
OpenSpec et Git SCM. Messages et appels par rôle : N/A — export exhaustif absent.
Les fixtures natives ne sont pas des agents délégués pour ce développement.

## 3. Fichiers modifiés

Contrôleur, contexte de communication, registre, versions des briques,
manifestes, unités systemd, commandes, documentation, tests et OpenSpec.
Les références de protocole portent la version du correctif ; les sources et
empreintes historiques de la migration 2.2.0 restent identifiables.
Écritures et lignes ajoutées/supprimées : N/A — métrique exhaustive non collectée.
Les chemins complets du commit SCM constituent l’inventaire après publication.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs | Ignorés |
|---|---:|---:|---:|
| Node, suite globale | 827 | 0 | 31 |
| Python, unittest de référence | 93 | 0 | 0 |
| OpenCode natif réel | 1 | 0 | 0 |
| Total exécuté, sans double compte des campagnes ciblées | 921 | 0 | 31 |

Node : 73 868 ms ; campagne native : 9 192 ms. Contrôles ciblés 23/23 et CABU
85/85 sont inclus dans la suite globale et non additionnés. OpenSpec strict :
20/20 avant archive, 19/19 après synchronisation. Les échecs intermédiaires de
reproduction et d’alignement de version sont décrits dans VALIDATION.md et ne
sont pas masqués par les résultats finaux. Sources et empreintes des preuves :
[qualification.json](qualification.json).

## 5. Accès web et effets externes

Aucun accès web requis pour qualifier le code. La publication distante et
CABU suivent cette archive sous le même mandat ; leur réussite ne se déduit
pas des tests. Les versions actives et la réconciliation du cas réel doivent
être vérifiées après installation. Statistiques web exhaustives : N/A.

## 6. Bilan, impacts et limites

Source CAB 2.2.1 qualifiée. Historique approved conservé, réponse exécutable
retirée après CANCELLED/OC stable, aucun once créé. Les frontières native,
accès et permissions actives restent protégées. Le moniteur attend la base du
paquet installé. Absence de nouvelle dépendance, schéma 4 conservé.
Publication, activation et notification sont attestées séparément après le
commit ; aucun succès opérationnel n’est revendiqué à partir de cette archive.
