# Qualification CAB2.2.8

Le reçu CABU2.2.7 update-2b367e99-0b24-4d4c-a634-85c4db3ada06 s’est arrêté
PREPARATION_FAILED/update-unsafe-file avant coupure ;pas de migration/activation.
La cause est la lecture générique4Mio appliquée au registre réel20581389octets.
Le lecteur JSON runtime64Mio existant remplace cette lecture, sans changement
HTTP, droits, mandats ou dépendances. La régression emploie un JSON disque
valide de plus de16Mio dont la représentation API est compacte ;les octets
historiques et leur mode0775 sont conservés.

145tests paquet/updater/continuité/distribution,8HTTP admission/migration,
94Python et1OpenCode réel :248réussites,0échec. La suite globale inchangée
hors correctif n’est pas répétée ;sa qualification et ses timeouts de fixtures
restent dans l’archive2.2.7 et ne sont pas effacés. Fournisseur natif synthétique.
Syntaxe des sources modifiées et empreintes :qualification.json.
Publication et activation par CABU suivent l’archive ;aucune preuve source
ne vaut succès de déploiement ou reprise métier des sessions propriétaires.
