# Reprise des transitions brèves du RUN — CAB 2.2.22

## Why
PA01 a reçu un refus run-transition-in-flight après une admission STABLE,
puis a repris avec succès la même décision et la même acquisition sans effet
métier réémis. Le comportement est prévu et testé ; son routage documentaire
reste trop discret pour une gestion autonome immédiate.

## What Changes
Relier grille, skill, commande, index et soumission à admission-state ; expliciter
la décision non enregistrée, poll_approval et acquisition sur les mêmes IDs,
le contrôle des identités entre unités successives, la relecture autoritaire après réponse perdue et l’arrêt borné des reprises.
Incrémenter en2.2.22, qualifier, archiver, committer, publier puis CABU.

## Scope
Documentation et versions seulement ; aucun nouveau endpoint, retry moteur,
autorisation, cadence, dépendance ou mutation des RUN métier. Protections et
once inchangées. Code non attribué ; attribution ultérieure par ACL.
