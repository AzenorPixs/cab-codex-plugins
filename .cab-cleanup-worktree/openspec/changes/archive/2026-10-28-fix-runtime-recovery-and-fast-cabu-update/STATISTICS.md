# Statistiques SCM — CAB 2.1.0

## 1. Statistiques générales et décisions

Session de codage directe, change unique fix-runtime-recovery-and-fast-cabu-update. Périmètre : corrections registre/MCP, CABU rapide, version 2.1.0, qualification réelle, documentation et archivage. Durée intégrale, tokens, modèle exact et quotas : N/A, aucune mesure initiale de télémétrie. Aucun skill de statistiques pilotées invoqué.

## 2. Types de messages et d'outils

Compteurs exhaustifs de messages, outils et approbations : N/A, non instrumentés. Suite Node finale : 456 déclarés, 430 réussis, 0 échoué, 26 non exécutés (profils historiques gelés sans paquet original et scénario OpenCode isolé optionnel). Python : 73 réussis. Total : 529 déclarés, 503 exécutés et réussis, 26 non exécutés, 100 % de réussite des contrôles exécutés. La qualification réelle avec OpenCode lancé est comptée séparément.

## 3. Fichiers modifiés

Inventaire des 65 sources et supports alignés : PREUVES-SCM.json. Composants concernés : client V2, registre/contrôleur, updater, distribution, tests, commandes et documentation. Les trois copies broker sont identiques aux sources. Fichiers OpenSpec : proposal, design, tasks, trois deltas, preuves et présent rapport dans l'archive ; trois spécifications courantes synchronisées. Nombre exact de lignes ajoutées/supprimées : N/A, aucun diff Git utilisé. Configurations des projets pilotés et états métier préservés.

## 4. Commandes

`node --test tests/*.test.mjs` : 430 succès, 26 scénarios optionnels non exécutés, zéro échec final. `python3 -B -m unittest discover -s tests -p 'test_*.py'` : 73 succès. Contrôles syntaxiques : 25 modules Node et 6 fichiers Python. OpenSpec strict : 16 éléments validés avant archive. Archivage réussi : six exigences ajoutées et une modifiée, aucune supprimée ou renommée. Des échecs intermédiaires de tests et une préparation réelle refusée ont conduit aux corrections du nettoyage des helpers, de la sélection de location MCP et des attentes liées au nouveau contrat strict.

Banc contrôlé final (millisecondes) : `{"cold":{"preparationMs":1606,"unavailableMs":77,"totalMs":1683},"warm":{"preparationMs":153,"unavailableMs":38,"totalMs":191}}`.

Qualification réelle finale : préparation 711 ms, indisponibilité vérifiée 7742 ms, total 8454 ms. Les quatre versions actives sont 2.1.0. Les 50 RUN conservent les mêmes identités, réservations et propriétaires de demandes ; OpenCode garde le même PID, le broker change d'instance et sa readiness porte 2.1.0. Preuves : runtime-evidence.json. La cible inférieure à cinq secondes est atteinte dans le banc contrôlé, pas sur cette instance réelle ; cette limite reste explicite.

## 5. Accès web

Diagnostics HTTP loopback authentifiés de l'API OpenCode 2.2.0 et des services CAB. Nombre exhaustif de requêtes : N/A, non instrumenté. Le MCP partagé est ciblé dans la location serveur et les sessions restent dans leur workspace. Aucune génération de contenu fournisseur sollicitée ; aucun secret, environnement brut ou corps métier restitué. Les accès distants de publication relèvent de la clôture Git conditionnelle suivante.

## 6. Synthèse globale

La livraison 2.1.0 impose le redémarrage des trois services et, si OpenCode est actif, le rechargement natif du broker avec preuve fraîche de version. CABU prépare les fichiers avant coupure, réutilise les validations syntaxiques par empreinte, regroupe les opérations systemd et vérifie les versions en parallèle. Les RUN ne sont ni avertis ni modifiés ; aucune permission consommée n'est rejouée. Les tests couvrent la conservation des preuves et la récupération transactionnelle. Le bilan documentaire par fichier figure dans PREUVES-SCM.json. Les mesures indisponibles restent N/A. Les six sections, UTF-8/LF et totaux sont vérifiés.
