# Qualification source CAB2.4.5

Code non attribué. Mandat développeur : suppression des états CAB hors des huit contextes explicitement conservés, dont Z27. Aucun effacement réel n’est déclaré par cet archivage source.

## Périmètre observé

Prévol contrôleur2.4.4 :51RUN, dont8conservés,43fermés sélectionnés,88aliases de change.57aliases refusaient le nettoyage unitaire parce que le même RUN avait servi à plusieurs cadrages. Tous les jobs des cibles observés sont désarmés et possèdent un gate terminal validé ; un contexte fermé437, absent du registre historique, est néanmoins présent dans son dossier de RUN. Il est couvert par le RUN explicitement sélectionné et sa preuve de gate.

La portée vérifie l’état fermé, le projet, les ressources soldées, toutes les générations et les gates. Les empreintes des jobs sont revérifiées à seal et lors de recover-preparation. Les aliases/SID partagés ne deviennent pas des identités effaçables ; les RUN protégés sont exclus. Aucun ancien contexte n’est réouvert ou renommé pour permettre l’entretien.

## Tests vitaux

81tests Node ciblés : portée fermée/aliases et pairs, refus RESERVED/protégé/bail actif/source étrangère, reprise et effacement unitaires existants, intégration complète du lot avec gates mixtes, contexte hors registre, refus d’un job modifié après préparation, une seule bascule, certificat/finalize/verify, propriétaires/deuxUID et distribution. Un test SGS supplémentaire vérifie l’entretien sans télémétrie native, la conservation du pair vivant et le refus d’effacer une liaison native sans snapshot durable.

Les archives métier sont conservées pour leurs vrais changes/RUN ; les contextes techniques sans données natives n’obtiennent pas de statistiques fictives. Les ateliers retirés sont seulement ceux des couples change/RUN choisis. Le journal natif est réancré avec le même canal authentifié et les producteurs du propriétaire ; OpenCode ne redémarre pas.

## Audit SGS de SCM244

Un nouveau relevé cumulatif ajoute la trace native de la fenêtre initiale exclue dans le rapport existant, sans effacer son historique. La contribution quantitative reste identique à celle de la seule fenêtre bornée07:10UTC ; les compteurs de la fenêtre erronée sont expressément exclus des agrégats. Cela permet la réconciliation par les gardes de purge normales, sans édition privée ni contournement.

## Livraison et opération réelles

La publication DIU/GitHub, l’activation par CABU puis l’effacement effectif et les certificats sont suivis séparément dans output/scm-cab-245/activation et output/cab-cleanup-20261107. Le dossier de suivi contient la liste explicite du développeur, les aperçus sans écriture et les empreintes de préservation des huit contextes. La confirmation attendue est PURGED, et non un simple certificat en attente de finalisation.
