# Qualification SCM — cab 2.3.2

## Périmètre et source de vérité

Moteur, coordination REPORT, projection d’effacement, skills, protocole et versions CAB.
Code non attribué ; aucune attribution automatique, convergence ACL ultérieure.
Le change existant de publications Git du projet prompts n’est pas repris ni
archivé par ce travail. Les modifications versionnées préexistantes de chaque
projet sont conservées dans le commit complet prévu par SCM.

## Résultats ciblés acquis

- CAB :57tests SGS réussis sur isolation du global, stdin, concurrence,
  variantes, historique, agents libres et reprise idempotente.
- Python global CAB :193tests réussis ; syntaxe de24fichiers réussie.
- Coordination : mandats rapport/candidat exacts, refus des fichiers globaux
  et métier, restauration ancienne et réancrage vérifiés.
- Recettes Chromium et Firefox réussies sur CAB2.3.2.
- Distribution et nettoyage :85contrôles ciblés réussis, dont les deux issues
  TERMINÉ/BLOQUÉ et l’effacement des statistiques avec pair préservé.
- Douze blocs communs de prompts identiques : suivi dès l’amorçage, deux rôles,
  preuves stdin, delta séparé et nettoyage sessions/CAB vérifiés par script.
- OpenSpec strict : CAB22éléments et prompts6éléments contrôlés avec succès,
  avant les derniers amendements de clôture ; recontrôle final prévu.

Les premières campagnes Node incluent une exécution interrompue et une exécution
complète avec deux délais de démarrage et une assertion documentaire devenue
inexacte. Les deux cas de démarrage ont réussi en reprise isolée. L’assertion
est réalignée sans assouplir une garde. La campagne globale finale couvre1319cas :1287réussis,31ignorés et une
assertion de fixture en échec. Cette assertion exigeait un seul motif de rejet
alors que la permission native peut déjà être observée par SSE comme effet
local : run-not-quiescent et native-session-not-quiescent sont deux rejets
409 valides. La fixture vérifie désormais ces deux motifs et conserve les
contrôles de refus, d’absence de once et de décision durable. Aucun code de
protection n’est assoupli. La reprise ciblée a réussi après cette correction.
Les1288cas exécutés ont donc chacun un verdict final réussi ; le code1 de
l’exécution globale initiale est conservé et n’est pas présenté comme code0.
Voir output/sgs-fixes-2.3.2/qualification-campaign.json dans CAB.

## Contrats fonctionnels vérifiés

CHANGE produit le rapport sans récupérer ou verrouiller le global. Le delta
optionnel dispose de sa protection propre et de son statut distinct. Les
preuves peuvent être transmises sur stdin sans fichier commun. Le rapport
historique reste dans son chemin identifié et sa structure avec annexe ; une
variante ne crée pas de doublon canonique et reste exclue du global.

La session initialise le contexte statistique dès l’amorçage après les sources
requises et avant l’exploration métier. Elle rattache la cible à sa sélection
autorisée ; les rôles codeur/orchestrateur sont distincts. Les mesures absentes
restent inconnues et les explorations communes ne sont pas réparties arbitrairement.
La brique ne collecte pas seule la télémétrie de tout agent ; elle consomme les
preuves natives exposées, conservées dans les sources autorisées de la session.

Après rapport vérifié, le nettoyage suit la clôture sûre, les sessions natives,
puis l’effacement des briques CAB, statistiques comprises. Les segments et
imports mixtes conservent les pairs et un format restaurable. Une empreinte
d’import initialement invalide reste refusée. Les preuves métier et le rapport
sont conservés ; BLOQUÉ garde sa session métier de reprise selon le protocole.
Aucune purge de rétention générale ne se substitue à l’effacement ciblé.

## Matrice documentaire

| Document | État et preuve |
|---|---|
| Projet réel | Contrats et cas ciblés ci-dessus, campagne finale à compléter |
| AGENTS.md | Cadre applicable relu ; pas d’assouplissement des protections par ce correctif |
| PROJECT.md | Capacité et clôture statistique décrites |
| TECHNICAL.md | Isolation et responsabilités précisées, formats persistants conservés |
| BUILD.md | Distribution et version de livraison précisées |
| DEVOPS.md | Document généré relu pour prompts, index et OpenSpec ; pas d’édition manuelle |
| DEVELOPMENT_MAP.md | Entrée ciblée à amender sur les preuves du présent change |
| openspec/BATCH_CODES.md | Même entrée provisoire sans code inventé |
| README.md | Comportement réutilisable et cycle de nettoyage décrits |
| CHANGELOG.md | Entrée 2.3.2 et impacts ajoutés |
| OpenSpec | Change ciblé valide ; canon à synchroniser par archivage normal après qualification |

## Limites et livraison

Aucun pilotage OpenCode/CAB réel n’est lancé par cette session SCM directe.
Le nettoyage est qualifié sur des stores synthétiques ; aucun état privé de
production n’est lu ou supprimé. Aucun RUN CAB propre à ce mandat n’est créé.
Le rapport de chaque change sera produit par le moteur, puis son seul DELTA
sera tenté. L’échec du global sera signalé sans reconstruction et sans bloquer
la clôture, conformément à SCM. Les fichiers temporaires préexistants d’une
autre session ne sont ni repris comme preuves ni supprimés.

La livraison utilise exclusivement `sudo -n /usr/local/bin/diu projects cicd cab 2.3.2`,
après archivage normal et rapport vérifié. Le contrôle sudo exact est réussi.
Le résultat par forge sera vérifié ; aucune réussite distante n’est anticipée.
Aucun CABU, activation de runtime, ou cycle Git parallèle n’est engagé.


## Cohérence finale vérifiée avant archivage

Les corrections ciblées et la campagne finale ne laissent aucun cas fonctionnel
non réconcilié dans leur périmètre. Les contrôles UTF-8/LF et git diff --check
réussissent dans les deux projets. Les nouvelles versions sont CAB2.3.2,
plugins CAB/CABU2.3.2 avec cachebuster neuf, commandes et composants2.3.2,
SGS1.20 et livraison du corpus prompts1.0.3. Les versions des anciens rapports,
contrats ou archives ne sont pas réécrites. Le code de génération reste dans
CAB ; les prompts et leur index restent dans le projet prompts.

Le registre de validation courant est rafraîchi ; les empreintes historiques
restent inchangées. Les nouveaux REPORT ont deux ressources exactes ; les
anciennes réservations à un fichier sont lisibles puis réancrées explicitement.
Un ancien runtime ne doit pas être mélangé aux composants2.3.2.


## Archivage et rapport vérifiés — 6 novembre 2026

OpenSpec archive --yes --json a réussi :2026-11-06-fix-sgs-report-isolation-and-compatibility,
specsUpdated=true,6exigences ajoutées et2modifiées. Les sept tâches
sont validées. Le même moteur CAB a produit le rapport du projet cab
avec --evidence - ; ses six sections UTF-8/LF sont vérifiées, son candidat
est absent après publication. CHANGE n’a modifié aucun des deux fichiers globaux.

Le DELTA a été tenté une fois : code1, « Couple ou contrat incompatible :
SGS manuel requis ; aucune reconstruction automatique ». Les empreintes du
couple global sont identiques avant le rapport et après cette tentative.
Aucune transaction ne reste en attente. Le global est donc préservé et sa
maintenance n’est pas déclarée réussie ; mandater SGS pour sa régénération.
Cette limite ne bloque pas la clôture. Aucun bilan de blocage n’a été nécessaire
pour ce change ; les rapports et bilans d’autres changes restent intacts.

Les preuves stdin ont été consommées et le candidat technique a été nettoyé.
Aucun RUN CAB n’a été créé par ce mandat direct ; aucune suppression de sessions
ou de stockage privé de production n’est revendiquée. Le nettoyage terminal
futur est qualifié synthétiquement avec les deux issues et des pairs conservés.


Contrôle final du canon après archivage :21éléments validés par
la commande OpenSpec globale stricte, code0. Le paragraphe de conservation des
rapports CAB a été raccourci pour respecter le seuil documentaire du validateur,
sans changer ses obligations. Aucune réouverture ou nouvelle archive.
