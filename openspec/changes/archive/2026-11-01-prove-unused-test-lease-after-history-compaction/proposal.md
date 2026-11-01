# Preuve durable de l’absence d’effet après compaction native

## Why

La récupération tokenless 2.1.41 vérifie l’historique OpenCode complet et refuse
un bail si une compaction native est survenue après son acquisition. La
compaction seule ne constitue pas un effet sur l’environnement, mais elle peut
rendre l’historique textuel incomplet alors que le registre CAB conserve chaque
opération, son état, son éventuel démarrage natif, ses accès et sa décision
corrélée. Le refus aveugle empêche alors de restituer un bail inutilisé pourtant
prouvable par les reçus durables.

## What Changes

- Autoriser une couverture par registre durable uniquement après compaction,
  lorsque toutes les opérations depuis l’acquisition sont identifiées,
  rejetées/annulées sans démarrage natif, sans accès actif ni permission.
- Lier cette preuve au digest de frontière courant, à l’identité de session et
  au transcript natif relu deux fois ; enregistrer le mode de couverture dans
  le reçu de restitution.
- Continuer à refuser une opération démarrée, un état inconnu, un accès ou une
  permission en attente, une méthode native non autorisée, une frontière
  divergente ou un registre qui ne couvre pas toutes les opérations.

## Out of Scope

Aucune commande de test, commande shell, permission, validation ni décision
n’est créée ou rejouée. La voie ne réconcilie pas un bail utilisé et ne
remplace pas le jeton requis pour une opération avec effet natif.

## Acceptance Criteria

1. Sans compaction, la preuve complète native existante garde son comportement.
2. Après compaction, un bail restauré inutilisé peut être restitué sans jeton
   seulement si toutes les opérations CAB postérieures sont durablement
   classées rejetées/annulées sans `nativeStart`, aucun accès/permission n’est
   actif et la frontière reste stable.
3. Une opération native commencée, une opération inconnue, un accès/permission,
   une méthode inconnue ou une divergence conserve HELD.
4. Le mode de couverture est durable et contrôlé au replay ; aucun GET ne révèle
   le jeton bearer.
