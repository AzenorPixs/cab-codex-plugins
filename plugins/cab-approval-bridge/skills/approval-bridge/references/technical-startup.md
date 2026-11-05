# Précisions startup — CAB 2.2.34

## Bootstrap prioritaire du monitoring

Dès la résolution du workspace absolu canonique, appliquer intégralement
`monitor-service.md` du skill CAB installé, avant PLLM, santé
OpenCode et prévols modèle/MCP. Ce passage est obligatoire à chaque entrée
ou reprise de session de codage pilotée, même si le contrôleur et le superviseur
sont déjà actifs et réutilisés. Ne pas se limiter au constat d'une unité absente :
si elle est inactive ou absente dans le périmètre autorisé, installer son jeu
indépendant, puis exécuter `systemctl --user daemon-reload` et
`systemctl --user start cgpt-approval-bridge-monitor.service` séparément.
Réutiliser une instance active conforme sans modification ni redémarrage.
Vérifier service actif, GET /api/identity avec la version de base du plugin CAB installé et identity.workspace
attendus, puis GET / ; ne pas lire le snapshot multi-RUN pour ce contrôle d'identité.
terminer cette tentative bornée et rapporter son résultat
avant les contrôles amont. Afficher l'URL réelle uniquement après ces preuves,
sinon la cause et l'URL attendue séparément du statut CAB. Préserver configuration
et port existants, sans activation au login. Un échec PLLM ou CAB ultérieur
n'arrête pas le moniteur. Une divergence active ou un échec de monitoring ne
permet aucun arrêt, redémarrage ou changement de RUN dans les autres briques.


## PLLM Automatique — fraîcheur initiale et conservation du choix

Pour les prompts imposant PLLM Automatique, le contrôle de fraîcheur de huit
heures s'applique exclusivement au démarrage initial de la session de codage
pilotée, portée par le RUN parent. À ce démarrage seulement, l'orchestrateur
lit le catalogue public `data/pllm-current.json` du skill actif et son rapport.
Il réutilise sans benchmark une sélection `Valide`, évaluée dans cette
publication, si la publication et l'évaluation ont strictement moins de huit
heures (28 800 secondes). Calculer les âges depuis les horodatages ISO 8601
avec leurs fuseaux, jamais depuis la date du fichier ; ne renouveler aucune
date à la lecture. Un rapport absent, inexploitable, sans horodatage vérifiable,
futur ou atteignant le seuil à ce démarrage impose une évaluation automatique
du skill actif, puis la relecture de sa publication achevée. Une évaluation
interrompue ne vaut pas publication réussie. Un rapport récent sans politique
valide impose l'attente définie ci-dessous, sans nouvel essai automatique.

Pendant cette même session, le dépassement de huit heures ne déclenche aucune
réévaluation, interruption ni nouveau prévol. Les tâches, changements de change
dans le cycle, sous-jobs, pauses, reprises et compactages conservent le choix
vérifié du RUN parent ; ils ne constituent pas un nouveau démarrage initial.
Une publication ultérieure ne remplace pas spontanément ce choix. Conserver
ses références et preuves dans le checkpoint non secret déjà autorisé,
lorsqu'il existe. L'agent de codage ne modifie pas ce choix de sa propre initiative.

Seuls un dysfonctionnement réel du modèle appliqué ou une instruction explicite
du développeur peuvent déclencher une réévaluation ou un basculement vers une
politique PLLM de priorité inférieure dans l'ordre de repli du skill actif.
Seul l'orchestrateur parent conduit cette opération, sans concurrence entre
sous-jobs. Une panne réelle suspend le mandat concerné et impose une
réévaluation immédiate, quel que soit l'âge du rapport. Après réconciliation
des effets et permissions, appliquer la première politique disponible de
priorité inférieure au choix défaillant, issue de cette évaluation et qualifiée
par prévol natif. Écarter les candidates défaillantes sans boucle de réessais.
Un échec de test métier ou un défaut CAB seul ne prouve pas une panne du modèle.

Qualifier le fournisseur, le modèle et la variante natifs par une génération
bornée sans outil ni accès au projet avant transmission métier, au démarrage
initial et avant tout nouveau choix. Les prévols requis après maintenance
du raccord restent applicables ; le seul âge du rapport ne les renouvelle pas.
Respecter les priorités du skill, y compris ses modes gratuits, sans inventer
de quota disponible ni de variante. Conserver les identités, sessions, jobs et
preuves ; utiliser la frontière CAB de bascule sans réarmement implicite ni
rejeu d'une permission consommée.

Si aucune PLLM admissible n'est disponible, ne démarrer ni poursuivre aucun
travail, mandat, écriture métier, test, maintenance ou sonde. Avertir le
développeur avec le constat daté et attendre son instruction, sans évaluation
ni benchmark relancé automatiquement. Conserver l'état et les preuves ;
ne pas déclarer de clôture réussie ni arrêter ou redémarrer les processus
partagés. Les validations CAB, permissions natives et accords du prompt
restent requis. Cette section ne déclenche aucun RUN ni évaluation par sa lecture.


## Environnement DevOps

- Sur l’hôte Devops, OpenSpec est installé sous `/home/devops/.local/npm/bin/openspec`.
- Dans le conteneur OpenCode, ce répertoire peut être monté sous `/opt/devops/npm`.
- Utiliser les chemins explicites prévus par l’environnement au lieu de déduire l’absence d’OpenSpec depuis le seul `PATH`.


## Ordre de mise en place

Après le bootstrap prioritaire du monitoring, avant une réinitialisation globale exclusive, appliquer intégralement la
[procédure de purge](session-reset.md). Elle est obligatoire quel
que soit l'ancien état, y compris en présence de conflits Syncthing. Le script
`../../scripts/cgpt-approval-bridge-reset.py` est fourni par ce plugin.
Une reprise ordinaire du même RUN conserve son état et commence par la
réconciliation. Un prévol de récupération divergent conserve la candidate,
le job et le runtime selon la procédure ci-dessous, sans purge ni renouvellement.

1. Vérifier `GET /api/info` d’OpenCode avec Basic Auth, une version majeure 2 et un schéma V2 valide.
2. Vérifier que `cgpt-validation` est déclaré comme MCP local `stdio`.
3. Vérifier `GET /api/mcp` dans la location demandée et exiger `cgpt-validation: connected`.
4. Si ce statut est absent ou en échec, tenter uniquement les routes V2 documentées de reconnexion de ce serveur MCP puis relire `/api/mcp`. Ne jamais appeler `/instance/dispose`, tuer ou lancer directement le broker, qui appartient à OpenCode.
5. Relever par API, pour l’agent de codage ciblé, le fournisseur, le modèle et le niveau de raisonnement effectivement configurés. Vérifier que le fournisseur et le modèle sont publiés par OpenCode sans lire de secret.
6. Créer une session de prévol temporaire sans outil ni accès au projet, lui adresser une requête inoffensive en imposant exactement ces paramètres et vérifier la réponse ainsi que ses métadonnées observées. Fermer la session temporaire après le contrôle.
7. Si la réponse, le fournisseur, le modèle ou le raisonnement est absent ou divergent, publier `CAB_INACTIF` avec la cause et ne créer ni session persistante ni contrôleur. Ne jamais corriger la configuration à la place du développeur.
8. Installer ou actualiser les ressources utilisateur du contrôleur et du superviseur sans `systemctl --user enable`, puis démarrer ou réutiliser explicitement le service `cgpt-approval-bridge-controller.service`, qui exécute `../../scripts/cgpt-approval-bridge-controller.mjs` hors sandbox avec `OC_Codex_OUTSIDE_SANDBOX=1` (ou l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1`). Vérifier qu'il est actif et que son redémarrage sur échec est actif.
9. Vérifier le statut local du contrôleur.
10. Démarrer explicitement `cgpt-approval-bridge-supervisor.service` après le contrôleur, sans activation au login. Vérifier son statut local et `Restart=on-failure` ; il supervise le job sans créer de décision ni de session de remplacement.
11. Démarrer ou maintenir le SSE authentifié `GET /api/event`.
12. Créer une nouvelle session maîtresse pour un nouveau RUN via `POST /api/session` ; réutiliser la session seulement pour une reprise du même RUN. Conserver son identifiant et adresser tous les mandats par `POST /api/session/<id>/prompt`.
13. Appeler `broker_readiness` dans cette session, sans accès au projet.
14. Interpréter `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`.
15. Réconcilier l’état OpenCode via HTTP après chaque reconnexion ou divergence, puis revalider `/api/mcp` avant tout mandat.
16. Vérifier qu’aucune approbation parasite n’est en attente.
17. Tester `request_validation` avec un `requestId` inédit dans la session persistante.
18. Rendre une décision Codex explicite unique.
19. Vérifier la réponse MCP corrélée reçue par OpenCode dans cette session.
20. Vérifier la supervision native et le SSE après validation complète, sans
    automation LLM périodique.


## Readiness

`broker_readiness` doit être utilisé avant tout test actif.

Interprétation :

- `READY` : pilotage nominal.
- `DEGRADED` : pilotage potentiellement poursuivable si l’action reste sûre ; afficher la cause et l’action recommandée.
- `BLOCKED` : arrêter l’action réellement concernée ; un résumé de coordination du RUN ne prouve pas un gel de toute unité disjointe. Suivre [la reprise propriétaire](owner-reconciliation.md), sans supprimer ses protections.
- `HUMAN_REQUIRED` : suspendre la partie concernée et demander l’intervention humaine requise.

Ne reconstruis pas toi-même une seconde logique de diagnostic si `broker_readiness` fournit déjà :
- `root_cause` ;
- `recommended_action` ;
- `controller_reachable` ;
- `pending_count` ;
- `stalled_count` ;
- `auto_recovery_available`.


## Changement de modèle OC

Avant de modifier le modèle d’un agent OC :

1. Vérifier que le fournisseur et le modèle ciblés sont publiés par l’API OpenCode, sans lire de secret.
2. Exécuter une requête OC temporaire, sans outil ni accès aux fichiers.
3. N’appliquer le changement qu’après une réponse modèle observée.
4. Si le test échoue, ne pas modifier la configuration.
5. Après changement, vérifier le fournisseur, le modèle et le niveau de raisonnement réellement utilisés.


## Modèle du prompt et PLLM automatique

Avant un nouveau job piloté, appliquer intégralement references/model-policy.md après le bootstrap du monitoring. Un modèle concret explicite reste prioritaire. Sinon, utiliser la PLLM automatique actuelle ; sans raisonnement explicite, demander medium. Si medium est indisponible, demander high sur le même modèle ; examiner la politique PLLM suivante seulement si les deux niveaux sont indisponibles. Un modèle explicite incompatible bloque. Résoudre OC_Codex_PLLM_CATALOG depuis le skill actif et négocier pllm-auto-v1 ; armer avec modelSelection et la preuve native modelPreflight du prévol exact. Vérifier codingModel dans le job. Une reprise conserve le contexte et réexamine la priorité medium puis high selon la section de convergence ; aucun changement actif implicite n’est autorisé. Les anciens jobs non négociés restent historiques. Le broker et le moniteur ne choisissent pas de LLM.

La session de pilotage définit explicitement providerMaxBytes pour la lecture /provider dans /model-policy/resolve et le répète dans modelSelection à l'armement, selon references/model-policy.md du skill installé. Ce budget local en octets n'élargit ni les autres observations ni le catalogue PLLM.

Pour le raccord courant, utiliser la préparation sans effet du catalogue dans references/model-policy.md avant le démarrage autorisé, transmettre son patch au contrôleur puis vérifier /model-policy/resolve avant nouvel armement. Conserver la provenance logique et employer le fournisseur natif vérifié. Les variantes parent imbriquée/historique et assistant présent doivent rester cohérentes. Aucune activation n’est déduite de cette préparation source.

Contrat courant CABU : les tolérances historiques de broker non vérifiable
ne permettent plus le succès si OpenCode est actif. Une absence prouvée est
requise pour la seule exception broker. Appliquer le contrat de coupure courte
de component-update.md ; ne prévenir ni modifier les RUN pour cet update.


### Permissions réappliquées par DIU

DIU peut remettre le répertoire `~/.config/cab-approval-bridge/` en `0770`. Dans CAB 2.1.33, la lecture du credential existant reste possible si `opencode.password` est un fichier ordinaire, sans lien, détenu par l’utilisateur du service et protégé en `0600`. Le passage du répertoire à `0770` ne prouve donc pas une panne de l’API OpenCode.

Le provisionnement d’un credential absent exige en revanche un répertoire détenu par l’utilisateur et non modifiable par le groupe ou les autres. Si DIU a remis `0770` et que le fichier manque, rétablir les permissions sûres du seul répertoire CAB, par exemple `0700`, avant le raccord explicitement autorisé à OPENCODE_PASSWORD. Préserver le credential et son mode lors des mises à jour DIU ; ne jamais afficher sa valeur. La variable reste facultative pour les projets qui n’utilisent pas OpenCode.


## Modèle du client : reasoning en entrée

Lire references/model-policy.md avant création de session ou sonde, changement
de modèle ou prompt avec modèle explicite. Le client attend model.reasoning ;
les lectures exposent model.variant. En2.1.32, réinjecter ce champ natif est
refusé avant HTTP avec opencode-model-variant-unsupported, même si reasoning
est aussi présent. Convertir explicitement le modèle relu en un nouvel objet
{providerID,modelID,reasoning}, sans alias ni repli silencieux vers default.
Conserver le choix du codeur et les permissions existantes.



## Fournisseur et modèle à chaud — CAB2.1.32

Appliquer [la procédure de changement à chaud](hot-model-switch.md).
Le dernier choix explicite peut remplacer fournisseur/modèle/raisonnement dans
le même job sans contrainte de l’ancienne politique ; sans choix explicite,
suivre la PLLM actuelle. POST /runs/<run_id>/job/model-transition conserve
RUN/job/session et historique, avec prepare/commit/cancel et reprise prouvée.
Le raccord confidentiel utilise l’API V2 native et le helper provider-connect,
sans reload/dispose. Aucun SCM CAB réussi ne se termine sans CABU ensuite ;
annoncer l’activation seulement sur versions réellement observées, puis avertir
les sessions. Ni CABU ni la livraison source ne modifient implicitement leur
clé, leur choix ou leurs décisions.



## Projection du contexte après transition PLLM/compte — CAB2.1.32

Appliquer la référence [portable-context.md](portable-context.md) : ne plus rejouer les anciens blocs de raisonnement et métadonnées fournisseur après transition. Projeter seulement les messages anciens de la session/connexion/cible autorisées, sans changer histoire, modèle ou permissions. Hook natif chargé à chaud puis preuve historique sans outil avant prévol CAB/RESUME. Le mode2 demandé conserve Muse/medium et le compte2 ; une connexion différente bloque sans repli.



## Readiness vide et omission native — CAB2.1.32

Appliquer [empty-readiness-input.md](empty-readiness-input.md) : seule l’omission input du broker_readiness({}) littéral unique, achevé sans erreur et non tronqué peut être projetée. Métadonnées/empreinte brute intactes, autres outils et formes ambiguës toujours bloquants ; aucun argument implicite global ou pouvoir de décision/once ajouté.

## Relevés initiaux

Au démarrage initial, recueillir les mesures et quotas natifs autorisés,
identifiés par RUN et session, avant le premier travail. Une valeur absente
reste N/A motivé ; aucun relevé rétrospectif n'est fabriqué. Si les modalités
ou une mesure ne sont pas couvertes nativement, lire la procédure ciblée du
skill voisin ../../coding-session-statistics/SKILL.md. La collecte continue
ne nécessite pas de tour LLM périodique ; les rapports d'archive restent requis.

Pour un401 observé par le pilote, appliquer [HTTP401 et client authentifié](protocol-interfaces.md) avant de modifier un credential ou de remplacer une session.
