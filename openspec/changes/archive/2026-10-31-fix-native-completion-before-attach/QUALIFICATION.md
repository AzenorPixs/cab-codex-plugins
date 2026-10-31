# Qualification — CAB 2.1.31

31 octobre 2026. Preuves locales isolées :

- Rattachement : fin native corrélée, sortie non nulle, contrôle de jeton, preuve absente ou divergente, protection conservée.
- Reprise après redémarrage : réponse native MCP approuvée, `executed: false`, identités, commande, fichiers, ressources et révisions corrélés ; aucune décision exécutable reconstruite. Refus des statuts, empreintes, accès et ressources divergents, horodatage absent, doublon, permission native en attente ou historique changeant. Rattachement puis libération réconciliée annulent l’opération préparée sans nouvelle permission.
- Course : libération concurrente refusée pendant la transition du même RUN.
- Node global final : 656 réussis, 0 échec, 31 ignorés ; Python global : 81 réussis ; OpenCode privé exact 2.2.0 : 4 réussis. Total disjoint exécuté : 741 réussis, 0 échec.
- OpenSpec cible, global standard et global strict : 17 éléments valides avant archivage. Syntaxe du contrôleur et 32 scripts JavaScript vérifiée.

Une première suite parallèle a expiré sur une fixture et révélé des attentes de version ; la version des attentes et la documentation ont été corrigées. La suite finale séquentielle a réussi. Le contrôle de restauration est limité à l’annulation ; la compatibilité avec un RUN réel et l’activation exigent leurs propres preuves après CABU.
