# Statistiques CAB — contrat3.1.0

## Autorité
Les STATISTICS.md locaux de chaque change sont les seuls maîtres. Les tables PG
sont des projections révisables et historisées. Les sources actives, archivées,
reprises et amendées restent liées à un seul projet logique ; plusieurs chemins
historiques d’un même change sont conservés sans fabriquer de RUN ou de session.
Le texte complet est conservé, même si un ancien format est partiellement compris.
La divergence d’un tableau visible avec un ancien registre embarqué est signalée,
jamais résolue par une valeur cachée choisie arbitrairement.

## Cycle et synchronisation
Le codeur déclare ses périodes en autonomie. La collecte native et les reçus sont
les preuves de génération, pas une autre source statistique officielle du change.
CAB génère la source locale puis la projette en base. Les modifications locales
OpenSpec et statistiques sont surveillées par inotify ; les sources inactives sont
réexaminées dans un délai aléatoire de12à24heures, planifié durablement en PG.
Un change ouvert sans session de codage reste not-started : aucun rapport requis.
Les autres absences, fichiers illisibles et mesures manquantes restent explicites.

Après archive, le service produit ou amende le rapport et le global. run.close
attend cette production et enregistre l’empreinte du rapport sans demander son
contenu, son calcul ou sa rédaction au LLM. Les blocs manuels restent maîtres ;
une modification d’une zone CAB est conservée et n’est pas écrasée silencieusement.
Les versions par empreinte, tableaux, coûts, rôles, modèles et couvertures sont
accessibles dans les projections statistiques du change.

## Global
Le STATISTICS.md racine concatène les rapports locaux disponibles, avec chemins
sources et statut de chaque change. Il inclut changes ouverts et archivés ;
l’inventaire distingue les changes non commencés des rapports réellement manquants.
Le global est créé automatiquement après inventaire complet, sans registre JSON
STATISTICS_CONTRIBUTIONS.json ni contrat de prompt externe. La concaténation
n’additionne pas des compteurs partagés ou des versions historiques d’un change.

## Protection
Toute publication est une opération CAB sous réservation PG durable. La connexion
ou le client disparu ne libère pas une écriture inconnue. Les PID/starttimes,
empreintes attendues et reçus permettent une reprise vérifiée sans réémission
aveugle. Le fichier local est publié atomiquement sous UID légitime, avec contrôle
de la source attendue. Aucun .STATISTICS.lock nouveau n’est créé.

## Interfaces
cab statistics sync --project-root /chemin demande le rattrapage.
cab statistics generate --project-root /chemin --change identifiant demande au
service de produire la source. status/change/project consultent les projections.
Les anciens appels cab sgs passent aussi par CAB ; leurs preuves LLM ne servent
pas de données mesurées et leurs anciens contrats externes ne sont plus résolus.
MCP : statistics_sync, statistics_change, statistics_project. Les appels de périodes
statistics_begin/end restent communs aux sessions directes et pilotées.

## Champs structurés
Les tableaux, headings, agents, performances, coûts, ventilations, identités de
provenance et texte intégral complètent la table normalisée des métriques suivantes.
Une mesure absente/contradictoire ne devient jamais zéro. Les cache/raisonnement
ne sont pas additionnés au total natif qui les contient déjà. Les durées actives
restent des unions de périodes, pas une somme de temps simultanés.

| Clé | Mesure | Unité |
| --- | --- | --- |
| duration | Durée globale | s |
| net_duration | Durée hors pauses et attentes | s |
| tokens_input | Tokens d’entrée | tokens |
| tokens_output | Tokens de sortie | tokens |
| tokens_reasoning | Tokens de raisonnement | tokens |
| tokens_cache_read | Tokens de cache lus | tokens |
| tokens_cache_write | Tokens de cache écrits | tokens |
| tokens_total | Total natif des tokens | tokens |
| compactions | Compactions achevées | count |
| messages | Messages des codeurs | count |
| messages_user | Messages utilisateur | count |
| messages_assistant | Messages assistant | count |
| tools | Appels d’outils des codeurs | count |
| tools_completed | Appels terminés | count |
| tools_error | Erreurs techniques | count |
| tools_running | Appels en cours | count |
| permissions | Demandes d’autorisation distinctes | count |
| permissions_approved | Demandes approuvées | count |
| permissions_rejected | Demandes refusées | count |
| permissions_expired | Demandes expirées | count |
| permissions_cancelled | Demandes annulées | count |
| writes | Écritures effectivement exécutées | count |
| files_touched | Fichiers distincts touchés par change | count |
| commands | Commandes exécutées | count |
| commands_success | Commandes réussies | count |
| commands_failure | Commandes en échec | count |
| web | Appels aux outils web | count |
| web_success | Appels web réussis | count |
| web_search | Recherches web | count |
| web_open | Consultations web | count |
| tests | Tests exécutés dans le bilan final | count |
| tests_success | Tests finaux réussis | count |
| tests_failure | Tests finaux échoués | count |
| syntax_files | Fichiers ayant passé un contrôle syntaxique | count |
| openspec_standard_success | Validations OpenSpec standard réussies | count |
| openspec_standard_failure | Validations OpenSpec standard échouées | count |
| openspec_strict_success | Validations OpenSpec strictes réussies | count |
| openspec_strict_failure | Validations OpenSpec strictes échouées | count |
| tasks | Tâches OpenSpec prouvées et terminées | count |
| domain_write | Écritures de fichiers | count |
| domain_command | Commandes | count |
| domain_web | Web | count |
| domain_other | Autres outils | count |
| domain_total | Total | count |

## Marqueurs et contrôle de synchronisation
Les publications CAB contiennent CAB_STATISTICS_DOCUMENT_V1 : scope change ou
project, revision (empreinte de contenu), generated_at UTC, content_sha256 hors
marqueur. Les marqueurs des changes restent inclus dans la concaténation globale ;
seul le marqueur propre du global est exclu de son empreinte de contenu.
PG conserve le SHA256 intégral du fichier, son mtime_ns, imported_at et les révisions.
statistics_change retourne actual_sha256 et in_sync pour chaque source locale ;
statistics_project retourne actual_global_sha256, global_in_sync et la validité des
sources du manifeste global (global_sources_current). Les marqueurs réels et ceux
en base sont distingués. Un fichier manuel ou ancien sans marqueur reste vérifiable
par ses octets ; aucun marqueur n’est inventé ni inséré pour une simple lecture.
