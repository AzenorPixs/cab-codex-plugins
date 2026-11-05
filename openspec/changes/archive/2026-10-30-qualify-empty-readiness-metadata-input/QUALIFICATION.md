# Qualification — CAB2.1.23

## Exception et gardes conservées

La comparaison des arguments reste exacte partout. L’exception reconnaît seulement un retour direct broker_readiness({}) à objet littéral vide, sans découverte combinée ni appel ajouté, enveloppe completed/executed=false, truncated=false et error absent/false. L’unique métadonnée doit nommer le même outil completed et ne pas posséder input. Aucun fallback input??{} global.

La projection expose les arguments déjà attestés par le programme, sans mutation des métadonnées. L’empreinte est toujours celle de l’enveloppe brute ; omission et input explicite donnent deux empreintes distinctes. Le texte ne peut créer une décision/permission. Les formes ambiguës restent execute bloquant.

## Tests ciblés et natifs

Tests positifs sur graphie/espaces/quotes compatibles avec la grammaire existante et omission attestée. Négatifs : input:null/tableau/objet divergent, objet non vide, variable, retour transformé, autre méthode, appel ajouté, découverte combinée, erreur/running/état inconnu, executed vrai/absent, truncated vrai/absent, toolCalls absent/null. L’empreinte brute et l’intégrité des métadonnées sont vérifiées. Une fixture initiale avec propriété input:undefined a rappelé que la sérialisation JSON supprime cette propriété ; ce n’est pas un champ présent dans l’enveloppe reçue. Les refus sur les valeurs JSON présentes et le test de propriété propre restent conservés.

Le banc privé exact2.2.0 fait réellement produire broker_readiness({}) par Code Mode et observe input absent dans metadata.toolCalls. La projection est reconnue, arguments{} et enveloppe scellée, zéro permission créée. Les scénarios existants de write/edit, refus avant once pour entrée divergente, recovery et contexte inter-comptes restent couverts dans les trois bancs finaux. Aucune génération réelle payante, credential ou histoire métier inspecté.

## Vérifications globales

Résultats finaux dans STATISTICS.md et PREUVES-SCM.json après réussite. Un premier groupe concurrent a expiré au démarrage de la fixture owner-absent, compté comme échec du sous-test et de son parent ; recontrôle ciblé34/34 puis groupe complet repris, sans code/test/borne relâchés. Les ciblés ne sont pas ajoutés au total final. Syntaxe66JS/16Python, copies broker identiques, UTF-8/LF et empreintes de AGENTS/DEVOPS/ORCHESTRATED_CODING/concurrent-runs préservées. Aucun template modifié.

Le correctif est autorisé explicitement sous SCM avec incrément23, publication puis CABU et information. Sources, archivage, publication et activation réelle sont distingués ; aucun RUN/job/modèle/permission n’est réarmé ou restauré par déduction d’un résultat de test. Code non attribué, allocation ACL ultérieure ; statistiques globales existantes maintenues sans réécriture des rapports historiques.
