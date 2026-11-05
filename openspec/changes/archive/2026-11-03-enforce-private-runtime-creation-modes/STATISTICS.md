# Statistiques — CAB2.2.9

## 1. Statistiques générales et décisions

Archive :2026-11-03-enforce-private-runtime-creation-modes ;SCM directe.
Mandat :correctif, incrément, publication,CABU, remontée aux sessions.
Fichiers projet0775, checkpoints privés0600 ;autonomie dans le change.

| Mesure | Valeur |
|---|---|
| Date | 2026-11-03 |
| Tests finaux uniques qualifiés | 249réussis,0échec restant,0ignoré dans le périmètre |
| Tâches terminées | 4 |
| Syntaxe des sources modifiées | 71 :60Node et11Python |
| Modèle, raisonnement, bornes globales et durée totale | N/A — export exhaustif absent |
| Tokens input/output, cache LLM fournisseur et coût | N/A — aucune mesure exhaustive de production |

Un outil réussi ne prouve pas une approbation manuelle ;erreur de test et refus
de permission ne sont pas confondus. Ventilation et pourcentages :N/A lorsque
les dénominateurs natifs exhaustifs sont absents.

## 2. Types de messages et d’outils

Lecture, édition, tests Node/Python/OpenCode, OpenSpec, GitSCM, publication et
CABU. Aucune délégation d’agent. Information des propriétaires PA01/CISMP5
explicitement autorisée. Comptage exhaustif des appels/messages :N/A.

## 3. Fichiers modifiés

Entrées contrôleur/superviseur, contexte de validation, versions courantes,
tests effectifs de mode, reprise après renotification et distribution.
AGENTS propagé par DIU est conservé ;les assertions suivent son contrat actuel.
Pas de modification manuelle de template ou de décision métier Pixs.
Aucune dépendance ou variable ajoutée. Inventaire exact :commit SCM.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs restants | Ignorés |
|---|---:|---:|---:|
| Node paquet/continuité/distribution, cas uniques qualifiés | 145 | 0 | 0 |
| Node HTTP modes, migration et admission | 9 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode réel V2 | 1 | 0 | 0 |
| Total unique sans double compte | 249 | 0 | 0 |

Paquet initial143/145 ;2assertions AGENTS obsolètes requalifiées dans37/37,
sans double compte. Régression reprise en échec avant fix, puis HTTP9/9,
8857ms. Natif final1/1,9607ms, fournisseur synthétique loopback. Une première
fixture native legacy-job-active et les anciennes instabilités restent tracées
dans VALIDATION.md ;aucune cause produit inventée. Pas de suite globale répétée
pour les versions seules. OpenSpec20/20avant puis19/19après ;syntaxe71fichiers.
Empreintes et limites :qualification.json.

## 5. Accès web et effets externes

Pas de recherche documentaire supplémentaire. Publication/CABU ont leurs
preuves séparées après archive. La bascule2.2.8 a préservé53RUN,4645opérations,
4402once et un PENDING ;le propriétaire a ensuite décidé approved via CAB.
La permission attendait encore sa reprise ;aucune réponse once directe par
le correcteur. La correction préserve cet objet et ses gardes, sans nouveau
mandat ni rejeu. Secrets et payloads runtime réels ne sont pas versionnés.
Dénombrement exhaustif des accès web :N/A.

## 6. Bilan, impacts et limites

La création privée ne dépend plus de l’umask de shell. Une renotification
identique garde les marqueurs de restauration ;après décision, le contrôleur
acquiert l’accès normal et transmet once à la permission exacte. Les conflits
et effets inconnus restent protégés. Le premier incident CISMP5 contraste-01
est antérieur au contrôleur2.2.8 ;aucun diagnostic rétroactif n’est créé.
Le succès d’exécution et la reprise métier attendent les preuves du propriétaire,
indépendamment de la publication/activation. Gain cache ou coût LLM :N/A.
