# Qualification SCM — diagnostics de décision CAB2.1.16

## Mandat et comportement

Le développeur demande explicitement le correctif SCM des400vides lors des décisions, incrément, puis CABU et information des sessions. Un seul change explain-decision-http-refusals. La garde d’admission commune conserve ses usages booléens ; le canal interne inspectOperationAdmission transmet les causes typées pour les décisions. Les conditions ne changent pas et restent vérifiées avant/après contrôle natif asynchrone.

Les refus400 rendent {error,message,decision_recorded}. Codes et messages français fixes sont issus d’une table fermée ; exception, commande, chemin, ressource, révision brute et secret ne sont pas recopiés. Les409 de gardes et201 de succès restent identiques. Les rejets explicites restent possibles après refus d’une approbation. GETdecision404 et indécis1 restent compatibles. decision_recorded est la présence dans la table LOCALE, pas une décision native appliquée ni une persistance après redémarrage ; une erreur après enregistrement rend true et impose une relecture, pas un rejeu.

## Vérifications exécutées

- Composant direct7/7 : valeurs/JSON invalides, validation inconnue, codes typés, exceptions et codes arbitraires filtrés, callback booléen conservé, invalidation/fermeture, doublon, erreur après enregistrement, rejet seul pour une validation réconciliée.
- HTTP réel4/4 : trois ressources avec révision périmée, succès/duplicate/native409, mutation de révision pendant contrôle natif et transition tardive de reminder ; aucune décision ni once implicite.
- Direct+distribution39/39 ; global Node588 :560 réussis,28 ignorés conditionnels,0 échec,84,857s de processus.
- Python80/80 ; banc natif OpenCode2.2.1 privé1/1 avec raccord, sonde, récupération et once existants.
- Syntaxe57JavaScript et16Python, UTF-8/LF et copies broker identiques.
- OpenSpec17/17 standard et strict avant archive.

Le premier cas rejet-seul du nouveau banc devait armer son job avant installation de l’inspection ; fixture corrigée, aucun contrôle production retiré. Un passage ciblé complet a connu deux timeouts de démarrage de fixtures ; les cas inchangés ont réussi isolément puis tous dans le global final, sans changer leurs bornes. Aucun test désactivé ou relâché.

Preuves ignorées par Git : output/scm-decision-diagnostics/{unit-targeted.log,http-targeted.log,concurrent-targeted.log,startup-isolated.log,distribution-targeted.log,node-global.log,python-global.log,native-global.log,source-verification.json,openspec-before-standard.log,openspec-before-strict.log}.

## Matrice documentaire

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé : autorités, sécurité, tests et Git appliqués. |
| PROJECT.md | Version2.1.16 et section Diagnostics des décisions. |
| TECHNICAL.md | Même section, corps filtré et portée locale du champ documentés. |
| BUILD.md | Jeu courant et distinction source/activation documentés. |
| DEVOPS.md | Régénération DIU concurrente conservée dans le commit complet ; relue, chemins Node/Python/OpenSpec et référentiel de prompts confirmés. Aucune édition manuelle par ce correctif. |
| DEVELOPMENT_MAP.md | Seul change et état ajoutés sans code ; liens d’archive ajustés après archivage. |
| openspec/BATCH_CODES.md | Même entrée ciblée, attribution ACL ultérieure. |
| README.md | Version courante et référence publique des diagnostics. |
| CHANGELOG.md | Entrée2.1.16 sans réécriture de l’historique. |
| openspec/config.yaml | Inchangé, schéma spec-driven adapté. |
| openspec/specs/ | Transport/distribution couverts par trois exigences ADDED. |
| Skill/commande CAB | Référence decision-http-diagnostics.md avec codes, reprise du pilote et limites. |
| ORCHESTRATED_CODING.md/template/concurrent-runs.md | Aucune écriture ; protocole embarqué et ses contrôles de concordance conservés. |

Protocole SHA256 inchangé :962ced4a2ded1bdb4d57c90b61ac41f28d7cb1f603ae9a82ac2dfd15cf1277d4. Aucun projet consommateur nommé dans les exemples. Aucune reconstruction de statistiques ou décision historique, aucun nouveau réglage ou dépendance.

## Clôture et activation

Éligibilité établie sur les vérifications ci-dessus. Archive/statistiques/publications et activation CABU sont vérifiées séparément. Aucun refus de test n’est provoqué sur un RUN réel. Les sessions actives sont coordonnées à une frontière naturelle ; aucun job désarmé/réarmé ou effet inconnu libéré pour la maintenance. Les sources ne prouvent ni versions chargées ni readiness ; les preuves d’activation sont produites après publication.
