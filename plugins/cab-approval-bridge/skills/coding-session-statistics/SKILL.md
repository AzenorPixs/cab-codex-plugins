---
name: coding-session-statistics
description: Préparer et produire des statistiques détaillées et auditables d'une session de codage ou de pilotage OpenCode, notamment la télémétrie périodique des agents de codage, les messages, outils, approbations, refus, fichiers, commandes et accès web. Utiliser lorsqu'un utilisateur demande de mesurer une session, des statistiques, un bilan quantifié ou un rapport STATISTIQUES.md sur une session de développement.
---

# Statistiques de session de codage

Produire un rapport factuel à partir de l'historique persistant de la session concernée. Ne pas inventer les données absentes.

## Sources et méthode

1. Identifier précisément la session et utiliser son historique complet, sans exposer de secret ni lire de source exclue par les règles du projet.
2. Agréger les données plutôt que recopier les contenus des messages ou les longues sorties d'outils.
3. Distinguer systématiquement :
   - **approuvé et exécuté** : appel terminé avec succès, autorisé automatiquement ou manuellement ;
   - **refusé** : refus de permission explicitement enregistré ;
   - **erreur technique** : échec, interruption ou abandon sans refus de permission.
4. Expliquer cette convention dans le rapport : un appel réussi ne prouve pas nécessairement une approbation manuelle.
5. Vérifier les totaux croisés : somme par type, par domaine et total global.
6. Afficher les pourcentages avec tous les totaux et sous-totaux, en plus des valeurs absolues :
   - part d'une catégorie = total de la catégorie / total de son tableau ;
   - taux d'un résultat = nombre approuvé, refusé ou en erreur / total de sa ligne ;
   - arrondir à une décimale et afficher `N/A` lorsque le dénominateur vaut zéro ;
   - faire apparaître `100 %` sur les lignes de total général.
7. Identifier séparément les agents de codage et les agents orchestrateurs ayant réellement opéré sur la spécification. Regrouper leurs interventions par modèle, version, fournisseur et niveau de raisonnement.

## Agents en début de rapport

Avant les six sections numérotées, insérer deux sous-sections de niveau 3 afin de conserver exactement six titres de niveau 2 :

### Agents de codage

Lister les agents de codage ayant opéré sur la spécification OpenSpec dans un tableau utilisant exactement ces colonnes :

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|

### Agents orchestrateurs

Lister les agents orchestrateurs ayant piloté, revu ou autorisé le travail dans un tableau utilisant les mêmes colonnes.

Calculer les métriques comme suit :

- **Version** : version exacte du modèle ou de l'agent fournie par la télémétrie ; ne pas la déduire du nom du modèle.
- **TTMT moyen** : moyenne du délai entre la réception de la demande et le premier token ou événement de sortie mesurable pour les réponses de l'agent.
- **Tokens/seconde moyens** : moyenne arithmétique des débits relevés par les sondes périodiques valides. En l'absence de sondes, utiliser seulement si disponible le débit pondéré de la télémétrie de session, en le signalant comme tel.
- **Temps de service** : somme des durées actives mesurables de l'agent ; afficher la durée et sa part du temps de service cumulé de tous les agents listés.
- Signaler le dénominateur employé et les éventuels chevauchements d'activité. Ne pas assimiler la durée calendaire, les pauses, les attentes de permission ou les appels d'outils au temps de génération du modèle.
- Afficher `N/A` pour toute version ou métrique absente de la télémétrie ; ne jamais l'estimer à partir de données insuffisantes.
- Si aucun agent d'une catégorie n'est identifiable, conserver le tableau et inscrire `Aucun agent identifiable` sur une ligne explicite.

## Sondes TTMT et débit de l'agent de codage

Lorsque la collecte peut être préparée dès le début de la session, l'agent orchestrateur DOIT mesurer uniquement le ou les agents de codage :

1. effectuer une sonde initiale avant la première tâche de codage ;
2. effectuer une sonde toutes les 30 minutes pendant l'activité de codage ;
3. effectuer une sonde finale après la dernière tâche de codage et avant la production des statistiques.

Ne pas sonder l'agent orchestrateur. Exécuter chaque sonde dans une session dédiée et jetable utilisant exactement le même modèle, la même version, le même fournisseur et le même niveau de raisonnement que l'agent de codage mesuré. La sonde NE DOIT utiliser aucun outil, lire ou modifier aucun fichier, accéder au réseau, ni être injectée dans le contexte de travail de l'agent de codage.

Utiliser le même prompt déterministe pour toutes les relèves : demander une sortie textuelle fixe suffisamment longue pour mesurer le débit, sans raisonnement métier ni appel d'outil. Conserver le prompt et sa taille constants pendant toute la session.

Pour chaque relève, enregistrer :

- horodatage et position (`début`, `+30 min`, `+60 min`, etc., ou `fin`) ;
- modèle, version, fournisseur et niveau de raisonnement réellement utilisés ;
- instant d'envoi, instant du premier token ou événement SSE et instant du dernier token ;
- nombre réel de tokens de sortie fourni par la télémétrie ;
- TTMT = premier token moins instant d'envoi ;
- débit = tokens de sortie divisés par la durée entre premier et dernier token ;
- succès, échec ou relève manquée.

Piloter la cadence par horloge, heartbeat, SSE ou mécanisme de planification disponible ; ne pas maintenir une commande `sleep` bloquante. Poursuivre le travail entre les échéances, sans arrêter le travail pour attendre un créneau de 30 minutes. Une relève manquée NE DOIT PAS être recréée rétroactivement : la signaler comme manquée. Une sonde échouée peut être retentée une seule fois immédiatement et les deux tentatives doivent rester visibles.

Une sonde statistique échouée reste distincte d'un échec du benchmark PLLM :
elle ne suspend pas, à elle seule, le RUN. Les nouvelles tentatives illimitées
du benchmark PLLM toutes les 30 minutes relèvent du protocole `approval-bridge`
et ne remplacent pas la règle de tentative unique immédiate d'une sonde
statistique échouée.

Dans le rapport, calculer séparément pour chaque configuration d'agent de codage :

- la moyenne arithmétique des TTMT valides ;
- la moyenne arithmétique des débits valides ;
- le nombre de relèves prévues, réussies, échouées et manquées ;
- les valeurs minimale et maximale en complément de la moyenne lorsque plusieurs relèves existent.

Exclure les sondes invalides des moyennes sans les masquer. Comptabiliser séparément leur durée, leurs tokens et leur coût comme surcharge de télémétrie, sans les mélanger aux statistiques de production. Si la collecte n'a pas été activée au début de la session, ne pas simuler ces mesures et afficher `N/A` avec la mention `sondes périodiques non activées`.

## Quota Codex sur sept jours : début et fin de session

Lorsque ce skill est utilisé pour suivre une session de codage, appeler directement l'outil natif `mcp__codex_app__get_usage_limits` en temps réel :

1. **Avant** : au début de la session, avant la première tâche de codage et les sondes de performance.
2. **Après** : à la fin de la session, après les tâches de codage, les sondes finales et l'archivage effectif de la spécification, avant la rédaction de la synthèse globale.

Conserver chaque relevé dans l'historique persistant de la session, avec son identifiant, sa position (`avant` ou `après`), l'horodatage de lecture, le pourcentage **utilisé**, l'identifiant du quota (`codex`), la durée de fenêtre (`10080` minutes) et l'horodatage de réinitialisation fourni par la source. Le relevé initial doit rester disponible indépendamment des lectures suivantes. Ne pas substituer un quota Spark, un quota restant ou une ancienne valeur à un relevé réel.

Calculer **différence = utilisé après − utilisé avant**, exprimée en **points de pourcentage du quota hebdomadaire** (exemple : 40 % puis 43 % donnent 3 points). Conserver la précision de la source et ne pas convertir cette différence en tokens ou en euros. Cette mesure couvre l'intervalle entre les deux relevés, sans inclure la rédaction ultérieure du rapport.

Comparer uniquement des relevés du même compte et de la même fenêtre de quota. Si une réinitialisation a eu lieu entre les relevés, si les horodatages de réinitialisation diffèrent, si la différence est négative ou si les données ne permettent pas de vérifier la comparaison, afficher `N/A` pour la différence et en donner la cause. Ne pas reconstituer une consommation à travers une réinitialisation avec seulement deux relevés.

Si le suivi commence trop tard, afficher `N/A — relevé initial absent` ; ne pas recréer le début rétroactivement. Si une lecture échoue, conserver sa cause et afficher `N/A`. Lorsque l'archivage prévu échoue ou reste à faire, signaler que le relevé final après archivage est en attente ; ne pas présenter une lecture antérieure comme finale. Si aucune spécification n'est à archiver, relever le quota à la fin des travaux et indiquer `archivage sans objet`. Ce protocole ne constitue pas une autorisation d'archiver une spécification.

Dans la **Synthèse globale**, inclure systématiquement ce tableau, même si des valeurs manquent :

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | horodatage et fuseau | valeur % | horodatage et fuseau |
| Après — après archivage de la spécification | horodatage et fuseau | valeur % | horodatage et fuseau |
| Différence après − avant | — | valeur en points de pourcentage ou N/A | — |

Adapter le libellé final lorsque l'archivage est sans objet ou en attente. Préciser sous le tableau que les quotas sont partagés par le compte : la différence représente sa variation pendant la session et peut inclure d'autres tâches simultanées. Ne l'attribuer exclusivement à la session que si cette exclusivité est vérifiée. Une différence nulle peut résulter de la précision ou du délai de mise à jour du compteur.

Pour lire le quota, sélectionner l'entrée `codex` de `rateLimitsByLimitId`
lorsqu'elle est disponible et sa fenêtre `windowDurationMins=10080`. Utiliser
`usedPercent` et `resetsAt` retournés par l'outil ; ne pas calculer le quota
utilisé à partir d'une autre métrique. N'utiliser le format historique
`rateLimits` que si la source permet de confirmer la même identité de quota
et la même fenêtre. Une valeur absente n'est pas zéro. Si l'outil ou
l'identité du quota est indisponible, indiquer `N/A` avec sa cause. Aucun
skill `cgpt`, fichier de profil ou secret externe n'est requis.

## Intégration obligatoire au protocole CAB

Au début de chaque change piloté par CAB, préparer les bornes de collecte,
les relevés de quota et les sondes définis ci-dessus, avant le premier travail.
La génération de statistiques est systématique après chaque archivage
OpenSpec réussi, même sans demande supplémentaire de rapport.

1. Attendre la preuve d'un archivage explicitement autorisé ; cette obligation
   de statistiques ne constitue jamais une autorisation d'archiver.
2. Effectuer les contrôles finaux de collecte et le relevé de quota après
   archivage, puis fixer la fin de l'intervalle avant rédaction de la synthèse.
3. Faire autoriser un mandat d'édition distinct pour le seul fichier
   `openspec/changes/archive/<archive>/STATISTIQUES.md` du projet piloté.
4. Produire les six sections ci-dessous, puis vérifier l'existence, l'encodage
   UTF-8/LF, les six titres de niveau 2 et la cohérence des totaux.
5. Rapporter le chemin et les validations observées à l'orchestrateur avant
   toute clôture normale `TERMINÉ` du change.

Pour un lot, produire un rapport par archive avec l'identité du change et de
la session, ses bornes et son périmètre. Identifier les données communes au
lot sans inventer leur répartition. Une donnée absente ou une sonde non
activée est représentée par `N/A` motivé et n'exonère pas du rapport.

Si l'archivage échoue, le rapport final après archivage reste en attente. Si
l'archive existe mais que le rapport échoue, signaler le cycle incomplet,
conserver les preuves et reprendre uniquement le rapport avec un nouveau
mandat. Ne pas réarchiver, inventer des mesures ni déclarer le cycle terminé.
Le broker et le contrôleur ne rédigent pas le rapport et ne décident pas.

## Durée globale de la session

Enregistrer le début effectif de la session et sa fin après l'archivage de la spécification, au moment du relevé final `mcp__codex_app__get_usage_limits`, avant la rédaction du rapport. Calculer la durée calendaire totale par soustraction des horodatages complets (avec fuseau), sans additionner les durées des agents travaillant simultanément. Cette durée inclut les pauses, attentes, tests et l'archivage ; elle est distincte du temps de service des agents. Si l'archivage est sans objet, utiliser la fin des travaux.

Afficher obligatoirement dans la **Synthèse globale**, à côté du bilan des quotas, le tableau suivant :

| Durée de la session de codage | Valeur |
|---|---|
| Début | date, heure et fuseau |
| Fin — après archivage | date, heure et fuseau |
| Durée globale (pauses et attentes incluses) | HH h MM min SS s |

Conserver le nombre total d'heures même au-delà de 24 heures. Adapter le libellé de fin si l'archivage est sans objet. Utiliser les horodatages vérifiables de l'historique si la collecte n'a pas commencé au début ; si une borne manque, afficher `N/A` et sa cause. Si la session ou l'archivage prévu est encore en cours, indiquer `en cours` et présenter seulement une durée provisoire horodatée, jamais une durée finale.

## Rapport attendu

Présenter exactement ces six sections, sauf demande contraire :

1. **Statistiques générales et décisions** : durée calendaire en signalant qu'elle inclut les pauses, messages, appels d'outils, approbations, refus, erreurs, taux, tokens, cache, coût et compactions disponibles ; ajouter les résultats du développement et les pourcentages de tous les totaux pertinents.
2. **Types de messages et d'outils** : rôles des messages, types de parties, terminaisons des réponses et décisions par type d'outil, avec effectifs et pourcentages.
3. **Fichiers modifiés** : chemin absolu complet, nombre et pourcentage d'écritures approuvées, refusées et en erreur ; préciser qu'il s'agit de tentatives, puis signaler les déplacements ou archivages.
4. **Commandes** : statistiques par famille avec effectifs et pourcentages, puis toutes les commandes refusées regroupées ; limiter chaque libellé de commande affiché à 100 caractères et conserver le nombre et la part des occurrences.
5. **Accès web** : nombres et pourcentages d'approbations, refus et erreurs ; conserver dans le rapport les URL des accès approuvés ainsi que celles des accès refusés, en distinguant explicitement leur statut. Limiter chaque URL affichée à 100 caractères maximum, indicateur de troncature compris ; ne pas présenter une URL refusée comme effectivement visitée. S'il n'existe qu'une requête sans URL effectivement visitée, l'indiquer explicitement.
6. **Synthèse globale** : afficher le début, la fin et la durée globale de la session selon le protocole ci-dessus ; afficher les deux relevés `mcp__codex_app__get_usage_limits` et leur différence selon le protocole ci-dessus ; agréger fichiers, commandes, web et autres outils en conservant tous les chiffres absolus déjà demandés et en ajoutant leur part globale ainsi que les taux d'approbation, de refus et d'erreur de chaque domaine ; ajouter une ligne globale à 100 %, puis conclure avec l'état des tests, de l'archivage, de Git, des accès externes et des secrets lorsqu'ils sont vérifiables.

Utiliser des tableaux Markdown pour les comparaisons répétées. Pour les chemins, conserver la valeur intégrale même si elle est longue. Ne pas confondre refus d'autorisation, échec de test et erreur technique.

## Production de fichier

Dans un cycle CAB, créer systématiquement `STATISTIQUES.md` dans le dossier réel de chaque évolution OpenSpec archivée, selon le protocole ci-dessus. Hors de ce cycle, si l'utilisateur demande un fichier, utiliser l'emplacement explicitement demandé. Respecter les autorisations du projet, UTF-8 et une fin de ligne Unix LF, puis vérifier qu'il existe exactement six titres de niveau 2.
