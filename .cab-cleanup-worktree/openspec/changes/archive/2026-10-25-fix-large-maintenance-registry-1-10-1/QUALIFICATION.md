# Qualification SCM — CAB 1.10.1

Périmètre explicitement validé : 16 Mio pour les seules lectures du registre de maintenance, tests des bornes, banc deux UID, archivage, mise à jour de toutes les briques locales et reprise des mêmes CISMP sans fermer OpenCode. Incrément 0.0.1 explicitement demandé depuis 1.10.0. Le source et le déploiement réel restent distincts.

## Résultats source

- GET exact /runs : 16 Mio, compteur des octets reçus avant JSON.parse ; autres réponses : 2 Mio.
- controller-runs.json : 16 Mio sous le lecteur régulier existant ; autres fichiers : 4 Mio. Aucune troncature ou purge, contrôles de propriétaire, groupe, schéma, générations et HELD conservés.
- Liste broker fermée conservant 1.10.0, sources et métadonnées alignées à 1.10.1.
- Tests Node : 371 réussis, 0 échoué, 25 non exécutés (banc historique exigeant CAB_TEST_ORIGINAL_PLUGIN 1.7.1 absent). Python : 73 réussis. Syntaxe : 43 fichiers vérifiés. Copies broker : 3/3 identiques.
- Les 23 tests de maintenance comprennent un échange HTTP complet >2 Mio, le refus de /runs >16 Mio et l'attente conservatoire sans arrêt pour /status >2 Mio. Le premier test /status attendait une exception ; son attente a été corrigée conformément au contrat documenté de résultat waiting sous DRAINING, sans modifier le lecteur ni affaiblir les gardes.
- Banc deux UID : deux scénarios succès/réponse perdue, 40 RUN et 256 ressources par RUN ; HTTP 5 218 572 octets et fichier privé 5 657 012 octets. Quatre versions 1.10.1, UID 1000/1002, refus kernel d'écriture, OpenCode simulé, fichiers broker, PAUSE et idempotence préservés.
- Test OpenCode natif réel isolé exécuté et réussi dans la suite Node. Aucun modèle fournisseur réel ou compte hôte n'est modifié par ces qualifications.

## Matrice documentaire

| Document | État et justification |
| --- | --- |
| Projet réel | Source 1.10.1 qualifiée ; runtime initial 1.9.0 encore sous PAUSE avant la maintenance distincte. |
| AGENTS.md | Inchangé, empreinte conservée ; autorisations, sécurité, secrets et règles Git applicables. |
| PROJECT.md | Version et cadrage courants alignés 1.10.1 ; architecture inchangée. |
| TECHNICAL.md | Version et exception bornée du registre documentées. |
| BUILD.md | Version, grand registre et provenance d'installation locale documentés. |
| DEVOPS.md | Inchangé, outils et Docker de qualification conservés. |
| README.md | Version et maintenance des registres volumineux exposées. |
| CHANGELOG.md | Entrée 1.10.1 distincte, historique 1.10.0 conservé. |
| ORCHESTRATED_CODING.md | Versions courantes alignées ; référence de coordination embarquée cohérente. |
| OpenSpec | Deltas de bornes et distribution, scénarios historiques conservés ; contrôle final strict requis avant archive. |
| Commande/skills/références | Alignés 1.10.1 ; doctrine de provenance locale et anciennes releases conservées. |

Les fichiers modifiés et les empreintes sont dans PREUVES-SCM.json. Aucun Git inspecté ou modifié, aucun commit/push. Les archives antérieures, caches Codex et anciennes releases ne sont pas édités. Aucun réglage fournisseur ou modèle des jobs historiques ne change. Le plugin local s'installe par le mécanisme pris en charge ; la publication distante, si antérieure, reste distinguée sans downgrade implicite.

## Clôture source et maintenance

Les critères d'implémentation sont prouvés. Archivage unique réussi : 2 exigences ajoutées et 23 modifiées ; contrôle strict final 14/14. STATISTIQUES.md produit et vérifié, six sections UTF-8/LF et totaux cohérents. La mise à jour réelle doit recontrôler les PAUSE, le broker et les identités vivantes, utiliser une preuve fraîche et son journal récupérable, puis vérifier quatre versions 1.10.1 et la libération du gel avant reprise des CISMP.
