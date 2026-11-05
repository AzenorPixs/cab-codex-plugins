# MAI06 — Réutiliser le broker externe en lecture seule

## Why

Le broker peut être chargé depuis un jeu source déjà 1.9.0 sous un compte
différent de celui des services. Le mode installation actuel tente de gérer
ces fichiers et déduit sa version antérieure des octets, alors que le
processus encore vivant peut être 1.7.1. Une déconnexion interdit de prétendre
reconstituer ce processus depuis ces seules sources 1.9.0.

Le développeur a explicitement validé le nouveau lot source/tests proposé,
par son message « Je valide » dans le chat propriétaire le 25 octobre 2026
(message 01a171e1-7584-7b60-8c7c-80e7befd9baa), puis confirmé ici SCM CAB.
Le code reste générique ; aucune activation ou réparation vivante n'est incluse.
Le développeur a ensuite demandé ici l'incrément mineur 1.8.0 vers 1.9.0
pour les briques après ce change ; cet alignement source est inclus.

## What Changes

- Ajouter une politique ordinaire explicite reuse-readonly avec preuve privée
  liant autorisation, trois empreintes, propriétaire et processus OpenCode/broker.
- Vérifier les artefacts externes en lecture seule et les exclure totalement
  des destinations, stages d'installation, sauvegardes et retours arrière.
- Distinguer version des fichiers et version du broker réellement chargé.
- Persister l'intention avant déconnexion ; après cette frontière, conserver
  HELD et permettre seulement une récupération vers le jeu autorisé, jamais
  un faux rollback vers le processus antérieur disparu.
- Qualifier le cycle et ses pannes, dont un banc réel à deux UID isolé en
  conteneur de test. Conserver les anciens comportements par défaut.

## Capabilities

### Modified Capabilities

- active-component-update : politique de réutilisation, preuve et récupération.

## Impact

update.mjs, nouveau broker-artifact-proof.mjs, tests active-component-update
et maintenance-bootstrap avec auxiliaires de banc, référence component-update,
PROJECT/TECHNICAL/BUILD/README/CHANGELOG et métadonnée de distribution si nécessaire.
La base reste 1.9.0. Aucun changement des trois sources broker, des gardes
retry/prévol/ASK/once, de dépendance du produit, de MCP/configuration, de droits
ou comptes hôte, de Git, de Pixs ou des archives L1/L2. Les seuls comptes et
droits créés pour le banc sont confinés au conteneur éphémère autorisé par DEVOPS.
Le SCM inclut l'archivage de ce seul change s'il est qualifié et son rapport.
