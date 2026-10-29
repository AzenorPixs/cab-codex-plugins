# Qualification — complément diagnostique 2.1.9

Correction de forme dans le périmètre autonome SCM Code Mode validé le 29 octobre 2026. La forme observée est exactement un appel search suivi d'un retour chaîne littérale. La demande réelle a été rejetée par CGPT avant commande ; le recovery et sa candidate restent conservés.

## Preuves

- Client et banc OpenCode réel : 18/18 ciblés. Le texte APPROVED retourné comme acquittement reste un diagnostic et n'accorde aucun droit. Une variable ou un appel ajouté conserve execute bloquant.
- Global Node : 513 tests, 487 réussis, 26 ignorés, 0 échec ; 85,013 secondes. Empreintes source identiques avant et après. Journal `output/scm-discovery-ack/node-global.log`.
- Les deux bancs natifs sont exécutés avec CAB_TEST_OPENCODE explicite. Le banc Code Mode vérifie le nouvel acquittement, puis MCP, décision, HELD, shell ask/once, exit 0, release, complete et écriture exacte sous once distincte ; nettoyage et disparition du broker vérifiés.
- Python DevOps : 74/74. Les 26 ignorés demandent le paquet historique CAB_TEST_ORIGINAL_PLUGIN non fourni ; aucune qualification réelle de ce profil n'est déduite.
- OpenSpec : change strict valide, global strict 17/17 avant archive. Syntaxe, UTF-8/LF, copies broker et conservation des empreintes contrôlés avant archivage.

## Matrice documentaire

AGENTS.md : inchangé, règles de sécurité conservées. PROJECT.md : référence commune 2.1.9. TECHNICAL.md, BUILD.md, README.md : complément diagnostique sans autorité et limites décrits. CHANGELOG.md : entrée 2.1.9. DEVOPS.md : inchangé, chemins d'outils existants réutilisés ; aucune dépendance ajoutée. ORCHESTRATED_CODING.md : inchangé, protocole partagé conservé ; détail dans les commandes et le skill CAB courant. Commandes, références et manifestes : jeu homogène 2.1.9. Cartographies : entrée provisoire de ce seul correctif, sans attribution de code et sans modification des preuves archivées 2.1.8.

## Suite opérationnelle

Après archive et STATISTICS.md vérifiés : publications SCM, CABU depuis GitHub, versions des quatre processus et commandes vérifiées. Sceller le rejet de la candidate conservée sous autorité existante, réserver un nouveau prévol, exiger décision corrélée, once, exit 0 et READY avant complete. Déclarer ensuite le mandat de lecture courant afin de suspendre les relances génériques pendant les revues. Aucun fichier métier Pixs modifié par ce complément.
