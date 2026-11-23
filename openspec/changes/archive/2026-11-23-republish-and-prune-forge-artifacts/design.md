# Conception de la republication et de la rétention Docker

## Docker

Le tag Git attendu reste un prérequis de publication. CAB pousse les tags Docker versionné et `latest`, puis confirme le manifeste de chacun avant tout nettoyage. Il parcourt toutes les pages de l’inventaire de l’image ciblée et vérifie le résultat du nettoyage.

GitLab et Forgejo suppriment les tags ou versions par nom. GitHub supprime une version entière du paquet. CAB protège donc la version portant un tag conservé et les manifestes dont dépend la nouvelle image. Si un ancien alias est indissociable d’une version conservée par l’API GitHub, le reçu signale la limite. Une réponse de suppression incertaine reste protégée par le parcours de publication existant.

## Debian

Sur Forgejo et GitHub, CAB remplace uniquement la pièce jointe homonyme identifiée sur la release. Si GitHub atteste déjà son empreinte exacte, CAB conserve la pièce jointe. Sur GitLab, CAB transfère d’abord le nouveau fichier puis remplace la cible du lien existant. CAB relit la release après modification.

Après confirmation, CAB garde la version publiée et les six publications précédentes du même paquet et de la même architecture. Il utilise la date de publication de la release et départage par numéro de version. En l’absence de date, il classe les releases concernées par numéro. Le nettoyage supprime les pièces jointes ou liens Debian en excédent et vérifie le résultat.
