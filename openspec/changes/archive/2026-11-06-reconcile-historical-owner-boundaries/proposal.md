# Réconciliation des frontières propriétaires historiques

Code non attribué ; convergence ACL ultérieure. Périmètre validé explicitement
par le développeur le 6 novembre 2026, après présentation des trois voies.

## Why
Les retraits sans émission échouent après extension de génération ou lorsque
des mandats indépendants suivent dans le transcript. Une ancienne opération
de port timeout reste protégée après reboot faute d’identité native historique.

## What Changes
- Retraite propriétaire non exécutable de PREPARED/REJECTED d’une génération
  antérieure, sous identité persistée exacte et génération courante d’autorité.
- Corrélation du call refusé et exclusion de mandats indépendants prouvés,
  sans tronquer les preuves ni modifier les once ou protections de pairs.
- Qualification de la frontière de reboot noyau postérieure à l’appel,
  complétée par les deux sondes natives et la revue locale existantes.
- Contrat distribué et version 2.3.3 ; tests, SGS, CI/CD puis CABU.

Aucun résultat historique inventé, aucun rejeu, aucune libération automatique
sur timeout ou simple changement de PID. PA01 utilise la libération existante.
Le DEVOPS local est conservé et ne constitue pas un cadrage portable.
