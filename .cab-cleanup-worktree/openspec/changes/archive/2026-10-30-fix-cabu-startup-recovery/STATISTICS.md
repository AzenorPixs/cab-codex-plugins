# Statistiques — fix-cabu-startup-recovery

## 1. Statistiques générales et décisions

SCM direct, un agent Codex et un change ciblé2.1.15. Mandat humain explicite de retrouver un état de développement normal et d’appliquer un nouveau correctif si nécessaire. Archivage réussi le30octobre2026. Tokens, coût et durée totale de session : N/A, aucune collecte exhaustive ni compétence statistique de pilotage invoquée.

## 2. Types de messages et d’outils

Lectures ciblées, éditions locales, exécutions Node/Python/OpenSpec et coordination explicitement autorisée avec les propriétaires de sessions. Aucun codeur produit délégué ; le serveur natif est une fixture privée. Nombre complet de messages/outils : N/A, non instrumenté. Aucun état métier ni décision/once réécrit par l’updater.

## 3. Fichiers modifiés

Updater et ses tests ciblés ; spécifications de maintenance et distribution ; cadrages, README/CHANGELOG, référence et consignes CABU ; versions communes des modules, broker, unités, commandes et attentes de tests. Cartographie et registre : seule entrée de ce change sans code attribué. Les archives précédentes et le journal réel2.1.14 sont conservés, sans restauration de données métier. Nombre final de chemins : vérifié et communiqué au commit, sans anticipation ici.

## 4. Commandes et vérifications

Updater45/45 : contrôleur prêt après15s dans le budget20s, dépassement500ms, deux reprises toujours échouées sans changer de journal, puis rollback réel du banc vérifié sur le même id. Global Node573 tests :545 réussis,28 ignorés,0 échec,84,110s de processus. Python80/80 ; banc natif OpenCode privé1/1. Les répétitions ciblées ne s’ajoutent pas au global. Syntaxe56JavaScript et16Python, UTF-8/LF, copies broker identiques. OpenSpec17/17 standard et strict avant archive ; +3 exigences synchronisées. Contrôles après archive enregistrés séparément après exécution. Build frontend non pertinent pour ce changement.

## 5. Accès web

Aucune recherche web pour le correctif. Tests sur fixtures et serveurs privés loopback uniquement. Publications Git conditionnelles et vérification GitHub CABU sont des étapes distinctes dont les résultats sont consignés après réalisation. Nombre de requêtes : N/A, pas de collecte exhaustive.

## 6. Synthèse globale

Sources2.1.15 qualifiées et archivées, sans relâchement des critères de versions/readiness. Le budget existant remplace une attente fixe10s ; le rollback échoué reste non terminal. Le journal réel antérieur, déjà classé à tort par l’ancien code, n’est pas édité manuellement : restauration observée séparément, activation suivante vérifiée réellement. Une demande interrompue est encore à réconcilier par son propriétaire après alignement ; la source ne prouve pas un retour normal du runtime. CABU et information des sessions suivent la publication sous mandat humain.
