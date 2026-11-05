## Context

OpenSpec 1.14.1 passe les dix éléments existants en validation standard, mais
signale deux collisions d'archivage. Il échoue en strict sur quinze longueurs
d'exigences. Ce change traite les collisions et le désalignement de version ;
les longueurs relèvent de `clarify-cab-specification-consistency`.

## Décision validée et alternative

Décision validée : rapprocher les deltas des références avant une éventuelle
clôture. Alternative : laisser les changes ouverts, en conservant les
collisions visibles. Aucun archivage n'est lancé pour tester ces options.
Le choix appartient au développeur.

## Rapprochement minimal proposé

1. Dans le delta controller-transport de `add-terminal-gate`, convertir
   ADDED en MODIFIED et reprendre intégralement les deux exigences courantes,
   notamment le scénario de validation manuelle avec ancien compteur nul.
2. Dans le delta archive-session-statistics de `add-cab-archive-statistics`,
   convertir les trois blocs déjà présents en MODIFIED sans changer leur texte.
3. Dans son delta codex-integration-distribution, convertir le bloc intégré
   en MODIFIED et reprendre la référence complète en 0.87.2.
4. Ajouter une note de rapprochement datée dans design et tasks. Garder les
   versions et validations historiques clairement attribuées à leurs dates.
5. Vérifier que le delta de `add-opencode-model-preflight` reste identique
   à la référence de son exigence. Ne pas modifier ses tâches ni son état.

## Critères d'acceptation

- Chaque exigence rapprochée existe une seule fois dans son delta et correspond
  exactement à la référence à la date du rapprochement.
- Aucune protection du gate, scénario, règle de statistiques ou version
  normative courante n'est perdue.
- Les validations standard des trois changes ne signalent plus de collision
  ADDED ; les avertissements de longueur restent attribués séparément tant
  que la proposition éditoriale n'est pas appliquée.
- Aucun change n'est déplacé dans archive et aucune ancienne preuve n'est
  présentée comme une validation actuelle.

## Dépendances et ordre

Appliquer ce rapprochement avant la proposition éditoriale, qui actualisera
ensuite les textes concernés et leurs deltas actifs ensemble. Les correctifs
de restauration et d'observabilité sont indépendants de ce rapprochement.
Les références restent l'autorité ; réexaminer leur contenu si un autre
change est intégré avant celui-ci.

## Risques et réversibilité

Un remplacement mécanique ADDED vers MODIFIED avec l'ancien texte pourrait
supprimer les renforcements récents. La comparaison exigence par exigence est
donc obligatoire. Les modifications documentaires sont réversibles tant
qu'aucun archivage n'est effectué. Ne pas utiliser un archivage réel comme
simulation et ne pas choisir implicitement une clôture avec saut de spécifications.
