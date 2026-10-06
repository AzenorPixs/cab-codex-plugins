## 1. Spécification et protocole

- [x] 1.1 Faire valider le périmètre SCM, le change supplémentaire et 0.86.5.
- [x] 1.2 Valider les deltas de persistance et de démarrage d'une nouvelle session.
- [x] 1.3 Aligner AGENTS, la skill du plugin et la commande /cab.

## 2. Purge et distribution

- [x] 2.1 Finaliser l'outil distribué et ses protections de périmètre/verrou.
- [x] 2.2 Valider les tests isolés et la préservation des données extérieures.
- [x] 2.3 Aligner les six briques versionnées et leurs attentes de tests sur 0.86.5.
- [x] 2.4 Actualiser les cadrages, README et l'entrée Unreleased du changelog.

## 3. Validation et clôture

- [x] 3.1 Exécuter les suites CAB, la syntaxe, la validation du skill et UTF-8/LF.
- [x] 3.2 Vérifier les versions, la cohérence documentaire et les limites de l'intégration réelle.
- [x] 3.3 Vérifier les préconditions de synchronisation et d'archivage de ce seul change.

## Clôture après archivage

Après les preuves ci-dessus, synchroniser et archiver uniquement ce change,
puis publier et vérifier STATISTIQUES.md dans son archive avant la clôture.
Cette obligation postérieure ne constitue pas une tâche cochée avant sa preuve.

## Décisions et état initial

Le développeur a validé la proposition SCM, la création de ce change malgré
les trois autres changes actifs, la purge historique sans sauvegarde et
l'incrément 0.86.4 → 0.86.5. Aucun commit, push ou publication n'est autorisé.
Deux fichiers de purge/tests ont été préparés avant l'invocation SCM : leur
présence ne vaut aucune preuve de validation. Ils sont à relire et finaliser.
Les quatre conflits Syncthing et l'ancien runtime CAB du profil OpenCode et de
Pixs ont déjà été supprimés sous autorisation distincte du développeur, sans
lecture de leur contenu. Le développeur a confirmé que SCM est autonome, et non piloté : la session
est exécutée directement par Codex, sans agent OpenCode ni mandat CAB.
L'intégration réelle /cab start/test reste à vérifier dans un OpenCode ouvert.

## Preuves de validation

- Change ciblé : validation OpenSpec stricte réussie après chaque révision.
- Spécifications de référence avant synchronisation : 7/7 valides en strict.
- Python : 37 tests réussis ; 10 tests ciblés de purge réussis. Le premier
  lancement ciblé a trouvé une erreur du client de test (EOF avant réponse
  MCP), corrigée par l'attente bornée des réponses avant fermeture du processus.
- Node : 23 tests réussis, dont corrélation, supervision, distribution et
  cohérence des six versions 0.86.5.
- py_compile : serveur, outil de purge et deux fichiers de tests Python réussis.
- node --check : contrôleur, superviseur et test de distribution réussis.
- Skill : quick_validate.py réussi avec /usr/bin/python3. L'interpréteur
  du projet ne fournit pas PyYAML pour ce validateur ; aucune dépendance ajoutée.
- Manifeste JSON, chemins distribués et cachebuster 0.86.5 vérifiés ; le CLI
  Codex installé ne propose pas de sous-commande de validation de plugin.
- UTF-8/LF : 24 fichiers contrôlés avant synchronisation ; aucune fin CRLF.
- Outil de purge réellement exécuté sur les espaces CAB autorisés : succès,
  zéro ancien contenu restant, verrous vides, aucune lecture d'historique.
- Matrice documentaire : AGENTS (§7), PROJECT (§3.5/5.5), TECHNICAL (§4.4/16),
  BUILD (§3/6/7), README (commande/distribution) et CHANGELOG (Unreleased)
  mis à jour ; DEVOPS inchangé, outils déclarés réutilisés sans dépendance.
- Le contrôle réel /cab start/test est non exécuté : OpenCode est fermé.
  Les tests isolés couvrent la purge, le démarrage MCP neuf, la corrélation et
  la supervision ; aucune réussite d'intégration réelle n'est déclarée.
- Aucun Git inspecté, commit, push, déploiement de plugin ou publication.
  Les trois changes antérieurs restent ouverts et inchangés.
- Archivage et statistiques sont les obligations de clôture qui suivent ces
  preuves ; leur succès sera vérifié séparément, sans coche anticipée.
