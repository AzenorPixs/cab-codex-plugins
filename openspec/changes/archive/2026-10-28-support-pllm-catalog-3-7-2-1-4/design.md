# Conception

Déduire le nombre attendu par égalité stricte du schema_version : 2 implique 6, 3 implique 7 ; tout autre format échoue. Les priorités doivent couvrir 1..N une seule fois et garder modeN. Les gardes temporelles, sélection unique Valide évaluée dans la publication, fournisseur, medium et preuve native restent inchangées. Le catalogue est uniquement lu.

La mise à jour des versions est limitée aux sources courantes et tests ; les archives, preuves runtime historiques et project.env restent inchangés. Le raccord au catalogue actif est vérifié à l’activation sans affichage de secret ni modification de choix des jobs déjà armés. La transaction d’activation sauvegarde les artefacts et conserve les données métier ; OpenCode reste le même processus.

La phase source SCM et la phase opérationnelle CAB test sont distinctes. L’archive prouve la qualification du code. L’activation et le test produisent ensuite leur preuve technique dédiée, sans transformer une fixture en preuve live.
