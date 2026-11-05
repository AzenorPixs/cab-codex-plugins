# CAB 2.2.0 — Continuité du protocole, récupération et mise à jour courte

## Mandat et continuité du change

Le 2 novembre 2026, le développeur a validé le programme d’évolution CAB
2.2.0 présenté dans le chat « Analyser les blocages du protocole CAB », sous
mandat SCM direct. Ce change actif est élargi sans changer son identifiant.
Son périmètre initial ci-dessous et ses preuves sont conservés. Code de lot
non attribué ; attribution et normalisation définitive relèvent d’ACL.

## Périmètre autonome 2.2.0

- Distribuer un contrat CAB modulaire unique, des entrées CAB/CABU courtes,
  des mandats différentiels et les références nécessaires à chaque branche.
- Migrer les obligations du protocole local avec une correspondance vérifiable,
  modifier AGENTS.md dans le référentiel template et propager uniquement vers
  CAB après l’accord explicite reçu ; retirer le protocole local en dernier.
- Persister les validations, décisions, acquittements et observations nécessaires
  à la continuité ; distinguer interruption de transport et issue d’un effet.
- Préserver les accès et baux sains pendant une reprise compatible et certifiée,
  sans transformer un simple redémarrage en récupération métier générale.
- Qualifier les shells durables et leur observation terminale, sans inventer
  les identités absentes des opérations historiques.
- Fournir une récupération typée, limitée au propriétaire et à son mandat,
  avec aperçu, preuves, reçus et issues explicites pour les cas non couverts.
- Préparer CABU à chaud, éviter les redémarrages inutiles, raccourcir la bascule,
  reprendre le même reçu après interruption et vérifier la continuité effective.
- Réduire les attentes fixes, le contexte répété et les échanges ; exposer les
  mesures natives disponibles sans inventer de tokens, cache ou gains.
- Qualifier les parcours complets sous pannes, concurrence et mises à jour.

## Fichiers et responsabilités

Les adaptations concernent les scripts controller, job-context, runs,
resource-coordination, opencode-client, supervisor/context, monitor-events,
update, statistiques et leurs dépendances distribuées ; les nouveaux modules
continuity, recovery, shell-lifecycle et efficiency isolent leurs contrats.
Les tests unitaires, HTTP et OpenCode isolés couvrent ces interfaces. Le
broker Python et sa copie distribuée restent concordants. Les manifestes,
unités et commandes portent la version commune 2.2.0.

PROJECT.md, TECHNICAL.md, BUILD.md, README.md et CHANGELOG.md sont ajustés aux
comportements effectivement livrés. DEVOPS.md reste un inventaire observé,
sans régénération automatique. DEVELOPMENT_MAP.md et openspec/BATCH_CODES.md
reçoivent seulement les amendements ciblés SCM. Les statistiques d’archive
et la maintenance conditionnelle du rapport global restent requises.

## Compatibilité et limites

Les identités RUN/job/session, choix LLM, décisions, permissions unitaires et
preuves existantes sont conservés. Une décision n’est jamais fabriquée et une
permission once n’est jamais rejouée par simple expiration ou reconnexion.
Les états d’effet incertains restent protégés ; leur présence n’immobilise
que les ressources incompatibles. Aucun changement de secret, de projet
consommateur autre que la propagation AGENTS vers CAB, d’infrastructure ou
de dépendance n’est inclus dans le mandat initial. Les deux accords explicites
du 2 novembre 2026 étendent ce mandat aux seuls renvois des 18 fichiers du
projet prompts listés dans PROMPTS_COMPATIBILITY.md, sans changement métier,
propagation supplémentaire ou opération Git dans cet autre projet.

Une source 2.1.81 ne possède pas le contrat de transfert 2.2.0. Sa première
transition ne peut pas être annoncée comme une reprise certifiée de ce contrat.
Sans preuve de transfert valide, les protections historiques et voies de
réconciliation restent applicables. Les nouveaux fichiers privés sont
distincts du registre historique afin de ne pas rendre son ancien lecteur
incompatible ; un retour arrière ne restaure jamais un ancien état métier.

## Critères d’acceptation du programme

1. Les obligations migrées ont une destination et les liens distribués sont
   valides ; le noyau chargé et la commande sont sensiblement réduits, mesurés
   sur les octets réellement distribués, sans perte d’obligation.
2. Une coupure/reprise conserve les identités, décisions, acquittements et
   positions d’observation ; aucun doublon de livraison ne crée un effet.
3. Un transfert compatible vérifié conserve les baux et accès sains ; un crash,
   reçu périmé ou état divergent conserve les protections existantes.
4. Les shells durables gardent leur verrou jusqu’à une fin native corrélée.
5. Chaque incident fournit une prochaine action typée ou une décision précise ;
   la récupération ne dépend pas de la readiness qu’elle doit réparer.
6. CABU conforme est sans redémarrage ; staging et vérifications sont hors
   coupure. Préparation, indisponibilité et rattrapage sont mesurés séparément.
   La cible d’une seconde est un objectif de qualification, jamais un résultat
   déduit ou une raison de réduire les contrôles.
7. Les tests de panne aux frontières décision/once/résultat et la campagne
   multi-RUN démontrent absence de perte, de rejeu et d’invalidation générale.
8. La validation finale, la cohérence documentaire, l’archive, ses statistiques,
   le commit et les publications SCM sont vérifiés séparément de l’activation.

## Périmètre initial conservé

## Problème

Le client CAB refuse les shells OpenCode `background=true`. Un shell foreground
qui expire peut ne fournir ni `shellID` ni code de sortie ; CAB ne peut alors
pas relier une observation globale de port à cette opération et garde l’accès
protégé.

## Objectif

Qualifier une voie native bornée pour lancer un serveur en arrière-plan,
maintenir le verrou de sa ressource pendant son exécution et ne conclure
qu’après lecture de son `Shell.Info` terminal corrélé.

## Hors périmètre

- Reconstituer rétroactivement un `shellID` ou un exit manquant.
- Fermer automatiquement un accès à partir d’un timeout, d’un port fermé ou d’une session idle.
- Modifier une opération `EXECUTING` existante ou rejouer son `once`.

## Vérification

Les tests isolés doivent couvrir start background exact, session/commande/
shellID divergents, observation RUNNING, fin native terminale, timeout,
indisponibilité de l’API shell, verrou maintenu en état inconnu et préservation
d’une opération foreground déjà `EXECUTING` sans `shellID`.
