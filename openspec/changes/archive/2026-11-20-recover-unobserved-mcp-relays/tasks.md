# Tâches
- [x] Implémenter le marqueur stable et préserver toutes les autres données TOML.
- [x] Relier intégration et réconciliation à la même génération du paquet.
- [x] Qualifier changement de version, idempotence, préservation et refus.
- [x] Ajouter la reprise autonome sous le compte graphique et tester l’escalade des signaux.
- [x] Vérifier la reconnexion et le catalogue sur une session d’origine.
- [x] Livrer via SCM/CICD puis activer par CABU et vérifier les observations.

## Vérification sur l’hôte

Le contrôle hôte 760 a réussi. Le commit 3.2.27 et le tag ont été publiés et
vérifiés sur Forgejo et GitHub. Le paquet Debian a été construit et installé
via CABU. Le reçu `CABU-3.2.27-MCP-RELAIS-HOTE` confirme la version
installée et conserve les quatre relais de bureau en `RELOAD_REQUIRED`.
Le frontend n’a pas été identifié dans ce reçu, donc aucune relance n’y est
attestée.

La 3.2.28 a identifié puis relancé cette même instance sous le compte
d’origine. Sur le frontend ainsi relancé, le reçu
`CABU-3.2.29-MCP-RELAIS-HOTE` est passé à `OK`. Il confirme deux
remplacements distincts pour les cibles 114865 et 121458, chacun en `READY`
avec moteur et catalogue 3.2.29. Un appel de lecture depuis la session
d’origine répond sur l’hôte actuel en 3.2.31. Les 15 tests ciblés ont été
revérifiés le 20 novembre 2026.

Ces preuves qualifient les fonctions de mise à jour et de reprise sur les
versions successives. Elles ne prouvent pas une correspondance individuelle
entre les deux relais du test 3.2.29 et les quatre relais du reçu 3.2.27.
