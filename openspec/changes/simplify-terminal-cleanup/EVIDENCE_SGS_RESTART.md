# Nettoyage SGS après redémarrage OpenCode

Le 8 novembre 2026, CAB 2.4.42 refuse le retrait SGS C97/CISM10 avec
`opencode-restart-reconciliation-required`. Le contrôleur indique la session
native historique PA01 non vérifiée et celle de C10 vérifiée. Le change C97 est
distinct. Le test de redémarrage confirme que la nouvelle garde laisse passer
un change indépendant et refuse un change avec RUN réservé ; aucune donnée PA01
ou C10 n’a été modifiée par ce test.
