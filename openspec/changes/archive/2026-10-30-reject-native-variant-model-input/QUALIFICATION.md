# Qualification SCM — entrées modèle CAB2.1.18

## Mandat et résultat

Le développeur autorise SCM avec incrément pour le piège variant/reasoning signalé par une session de codage. Un seul change reject-native-variant-model-input, code non attribué ; première partie ACL0.8 consultée sans allocation ni lancement ACL. Le client refuse le champ propre model.variant avant tout HTTP dans createSession, createProbeSession, prompt et switchModel avec opencode-model-variant-unsupported et message français fixe indiquant model.reasoning. Même nul, indéfini ou accompagné de reasoning, variant est refusé sans recopier de valeur. Les appels valides, le mapping reasoning vers variant natif, le défaut intentionnel sans niveau et la forme de lecture native sont conservés.

## Vérifications réellement exécutées

- Client ciblé41/41, comprenant les quatre méthodes sans aucun fetch sur refus, formes ambiguës/nulle/indéfinie, message fixe sans valeurs, mappings medium/high, lecture puis conversion explicite et omission intentionnelle.
- Client+distribution73/73. L’attente textuelle de l’ancien protocole0.5 a été actualisée pour les formulations normatives du protocole0.6 préexistant : mandat unitaire distinct, rapport limité au change et absence de réarchivage restent vérifiés. Aucun protocole/template réécrit et aucun contrôle supprimé.
- Global final en deux groupes disjoints couvrant les596cas : concurrent-controller130/130 et autres438réussis/28ignorés sur466. Total unique568réussis,28ignorés,0échec dans les groupes finaux ; pas d’addition des répétitions aux effectifs.
- Deux commandes monolithiques précédentes ont échoué :3cas puis1cas. Démarrages de fixtures/attentes réseau et garde plus précoce lors d’une course ; les trois premiers ont passé isolément3/3, puis tous les cas ont passé dans les groupes finaux sans changement de leurs bornes ni assertions. Instabilité des fixtures consignée ; aucun passage monolithique annoncé réussi.
- Python80/80 ; banc OpenCode natif privé2.2.2 :1/1, couvrant catalogue, sonde, édition partielle ask/once, refus et recovery. Aucun fournisseur ni RUN réel employé par ce banc.
- Syntaxe59JavaScript et16Python ; copies broker identiques, UTF-8/LF.36fichiers exécutables ne changent plus que de version après le patch client. Empreintes AGENTS/DEVOPS/ORCHESTRATED/concurrent-runs inchangées pendant ce mandat.
- OpenSpec17/17 standard et strict avant archive, deux exigences ADDED. Les anciens libellés historiques de version de spécifications hors du delta ne sont pas réécrits.

Preuves ignorées : output/scm-model-input/{client-targeted.log,client-distribution.log,client-distribution-final.log,node-global.log,node-global-final.log,regressions-isolated.log,concurrent-global-final.log,other-global-final.log,python-global.log,native-global.log,source-verification.json,qualification-results.json,runtime-observation.json,openspec-before-standard.log,openspec-before-strict.log}.

## Matrice documentaire

| Élément | État et preuve |
| --- | --- |
| AGENTS.md | Version locale préexistante conservée sans édition ; empreinte identique au début du mandat. Les éventuelles différences antérieures au dernier commit ne sont pas produites par ce correctif. |
| PROJECT.md | Version2.1.18 et contrat d’entrée modèle avec lien de référence. |
| TECHNICAL.md | Version courante, erreur avant HTTP et distinction lecture/écriture documentées. |
| BUILD.md | Jeu commun2.1.18 ; préparation source séparée de l’activation. |
| DEVOPS.md | Généré et inchangé pendant ce mandat ; chemins Node/Python/OpenSpec et prompts relus. |
| DEVELOPMENT_MAP.md | Seule entrée provisoire concernée, sans code ni reconstruction ; liens/état actualisés après archive. |
| openspec/BATCH_CODES.md | Entrée provisoire distincte, mêmes identités ; attribution ACL ultérieure. |
| README.md | Version et référence du contrat modèle. |
| CHANGELOG.md | Entrée2.1.18 ; refus désormais explicite des anciens appels incorrects, historique conservé. |
| openspec/config.yaml | Inchangé, schéma spec-driven. |
| openspec/specs/ | Transport et distribution couverts par deux exigences ; autres comportements conservés. |
| Plugin/skill/commande | model-policy.md contient le contrat et la conversion explicite ; skill/commande renvoient à cette référence. Alias CABU/cab inchangés hors version. |
| ORCHESTRATED_CODING.md/template/concurrent-runs.md | Aucune écriture par ce mandat ; protocole local0.6 préexistant conservé et contrôles adaptés à ses garanties actuelles. |

## Livraison et limites

La publication SCM ne constitue pas une activation. Observation publique pendant ce mandat : contrôleur, superviseur, broker et Web2.1.17, broker READYpending0 ; aucun CABU, redémarrage, changement de modèle actif ou suppression native effectué. Le mandat présent porte sur SCM et l’incrément ; une maintenance réelle reste une étape distincte. Aucun helper OpenAPI ni qualification de cascade ajouté. Les contributions préexistantes sont préservées et distinguées dans le commit complet SCM.
