# Migration CABU depuis un contrôleur ancien indisponible

Code non attribué ; convergence ACL ultérieure. Correctif demandé explicitement
le6novembre2026, sous SCM et cycle version/tests/commit/CI-CD/CABU.

## Why
Un registre valide pour le lecteur cible peut être refusé par des fichiers
anciens. CABU ne prépare actuellement la migration qu’avec un contrôleur2.2.6
répondant ; le démarrage cible échoue runtime-migration-required, puis le repli
peut démarrer des services initialement arrêtés et échouer à relire le registre.

## What Changes
- Valider avant coupure la copie isolée avec les lecteurs réellement ciblés.
- Détecter la migration sur état disque connu quand l’ancien contrôleur ne
  répond pas ; préserver les sources et toute incertitude métier.
- Reprendre le reçu non terminal existant, son stage signé par empreintes,
  ses sauvegardes et son état natif, sans identifiant codé en dur.
- Achever d’abord sa cible historique vérifiée ; si elle diffère du paquet
  courant, rapporter explicitement qu’une mise à jour normale reste nécessaire.
  Aucune nouvelle transaction pendant le reçu non terminal.
- Restaurer exactement les états initiaux des services lors d’un repli.
- Conserver les deux parcours, documenter le diagnostic filtré, tester et
  livrer2.3.5 via DIU puis CABU ; la reprise de l’autre instance reste à vérifier
  sur place par son opérateur/session, sans accès distant implicite.

Fichiers : update.mjs et runtime-migration.mjs, tests associés, références
component-update/command-update du skill, versions couplées, cadrages,
README/CHANGELOG/cartographie et OpenSpec. Aucun changement de configuration,
projet, credentials ou processus hors des briques gérées. Après copie validée,
reprise en avant uniquement ; jamais de restauration d’un état métier ancien.

## Complément nécessaire à la reprise C12
La première sonde2.3.4 signale infrastructure-identity-changed. Un test Linux
réel reproduit ce refus par créations de sockets API tiers alors qu’une paire
attestée reste stable. La même livraison2.3.5 borne ce sceau à ses identités,
exécutable, terminal et une connexion réciproque persistante, sans sceller les
autres sockets. Fichiers port-recovery.mjs et tests/port-recovery.test.mjs inclus
dans ce correctif de reprise protégée après CABU. La première capture reste
non qualifiée ; deux nouvelles sondes resteront nécessaires après activation.
