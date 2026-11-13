# Validation SCM CAB3.0.5

## Mandat
Le développeur a demandé dans DDIU la production du correctif puis un retour
après livraison/activation. Demande observée via read_thread,13novembre2026.
Incident NATIVE-SOURCE-LOCATE-305 ; claim SCM-native-source-305. RUN direct du
même nom, SID01a1c9e3-bed3-7a52-abca-0ea08eaa71d9, lié à sa source réelle avant
implémentation. Aucun RUN ni test métier DIU n’a été créé ou rejoué.

## Résultats source observés
-15tests PostgreSQL de fixture réussis :5sur les sources synthétiques,2sur la
 liaison transactionnelle et8sur la réconciliation/diagnostics MCP existants.
-Détection du seul fichier exact, racine du compte et personnalisée, absence,
 ambiguïté, propriétaire/SID/cwd divergents, symlink/hardlink/FIFO, en-tête invalide
 et parent symlink vérifiés. Le fichier étranger de fixture n’est jamais ouvert.
-native.locate ne crée ni RUN ni événement ; la liaison explicite puis sa
 répétition automatique conservent l’identité et ne produisent qu’un événement.
 Une source distincte reste refusée. Les contrôles de périmètre restent actifs.
-Résolution source réelle du SID DDIU réussie, compte et cwd vérifiés localement ;
 seul le résultat booléen a été restitué, aucun contenu de conversation.
-py_compile réussi sur12fichiers Python modifiés/nouveaux ; TypeScript/Vite
 réussi ; Django check sans anomalie.27spécifications canoniques strictes et
 delta courant strict validés avant archivage.

Le premier lancement groupé incluait test_platform_domain depuis un emplacement
qui ne satisfaisait pas son garde de fixture : refus avant exécution. Aucun
résultat de ce lancement n’est compté. La suite ciblée15tests a ensuite réussi
sur la base PostgreSQL du conteneur cab-300-package-test explicitement réservé.

## Limites et cohérence
Le JSONL reste celui d’une session native ; il peut alimenter plusieurs RUN et
changes. Le collecteur lit des totaux de session, sans ventilation prouvée entre
ces unités : aucune attribution ni addition arbitraire n’est présentée ici.
Le correctif porte le rattachement et ne change pas le collecteur.

La résolution automatique attend le stockage sessions/YYYY/MM/DD et un SID
UUIDv7 canonique ; sinon le chemin explicite reste disponible. Aucun parcours
récursif, scan de contenu des autres conversations, remplacement d’identité,
rejeu d’effet, arrêt de client ou dépendance supplémentaire.

Contrats CLI/MCP et documentation opérationnelle actualisés ; versions runtime,
frontend, intégrations et recette alignées3.0.5. Documents de tête actualisés,
cartographie/registre limités à ce change. AGENT_INTEGRATIONS.md reste absent,
sans règle inventée ; mandat explicite et contrat CAB distribués appliqués.

## Contrôles de livraison distincts
Archivage, rapport individuel SGS/DELTA conditionnel, DIU, paquet final,
préservation des RUN, activation et vérification du déclarant sont contrôlés
séparément. Une qualification source ne prouve pas ces effets ultérieurs.
Les journaux techniques non versionnés sont sous output/scm/cab-3.0.0/*305*.

Rapport individuel SGS vérifié (six sections) ; tokens volontairement N/A car
totaux partagés sans ventilation. DELTA global refusé pour contrat historique
incompatible : agrégat préservé sans reconstruction.
