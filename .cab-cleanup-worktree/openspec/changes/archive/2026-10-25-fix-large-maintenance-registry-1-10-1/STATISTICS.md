# Statistiques SCM — CAB 1.10.1

## 1. Statistiques générales et décisions

Session directe Codex. Autorisations humaines : borne 16 Mio pour les seules lectures du registre, tests, qualification deux UID et archivage ; puis incrément 0.0.1, SCM, mise à jour de toutes les briques locales et reprise CISMP sans fermer OpenCode. Modèle exact, tokens, quotas et durée intégrale : N/A, non relevés. Aucun skill de statistiques pilotées invoqué.

## 2. Types de messages et d'outils

Compteurs exhaustifs de messages et outils : N/A, pas de mesure initiale. Lectures ciblées, édition, tests, Docker et OpenSpec observés. Node : 396 déclarés, 371 réussis, 0 échoué final, 25 non exécutés faute du paquet historique1.7.1. Python : 73 réussis. Total exécuté : 444, 100 % de réussite finale. Les deux scénarios Docker sont comptés séparément. Un test /status initial attendait une exception ; son attente a été corrigée selon le contrat waiting/DRAINING, sans changer ni affaiblir le lecteur.

## 3. Fichiers modifiés

64 fichiers source/supports relevés avant synchronisation, plus deltas OpenSpec et rapports. L'incrément est aligné sur 1.10.1 ; archives et releases antérieures conservées. La liste et les empreintes figurent dans PREUVES-SCM.json. Aucune suppression source ni Git inspecté. Lignes ajoutées/supprimées et statistiques de toute la conversation : N/A, aucun diff Git ou journal privé analysé. Les artefacts temporaires des tests restent hors inventaire source.

## 4. Commandes

Suites Node par fichier, unittest Python et syntaxe de 43 fichiers réussies. Le test OpenCode natif réel isolé est inclus dans Node. Le banc grand registre à deux UID réels est réussi pour succès et réponse de déconnexion perdue : 40 RUN, HTTP 5 218 572 octets, registre privé 5 657 012 octets, quatre briques 1.10.1, PAUSE et identités préservées, refus kernel d'écriture dans le broker et aucun compte/droit hôte modifié. Registre réel observé avant maintenance : HTTP 9 602 547 octets et fichier privé 13 321 688 octets, sous la borne validée. Les tests HTTP refusent /runs >16 Mio et conservent 2 Mio pour /status sans arrêt de service. Copies broker 3/3 identiques. OpenSpec strict : 15/15 avant archive et 14/14 après. Archive unique réussie : 2 exigences ajoutées, 23 modifiées, 0 supprimée ou renommée. Aucune validation ignorée.

## 5. Accès web

Pas de nouvelle recherche documentaire dans ce lot. Métadonnées publiques de version et API loopback de maintenance/qualification consultées ; nombre exhaustif HTTP : N/A, non mesuré. Aucun appel de génération fournisseur réel. Docker utilise network=none et le loopback de son banc. Aucune variable secrète, authentification privée ou environnement brut transmis au modèle.

## 6. Synthèse globale

La source 1.10.1 est qualifiée pour le registre de maintenance jusqu'à 16 Mio, avec autres bornes et gardes conservées, et versions broker antérieures qualifiées maintenues. Les sources ne prouvent pas le déploiement réel : celui-ci exige le journal, le recontrôle des pauses et processus, quatre versions chargées, gel libéré puis reprise CISMP. Les mesures absentes restent N/A. Ce rapport contient six sections UTF-8/LF et ses totaux sont vérifiés ; aucune réussite opérationnelle n'est déduite de ces seuls tests.
