# MAI08 — CAB 1.10.7 — propriétaires et demande orpheline en pause

## Why
La maintenance 1.10.6 refuse une installation dont les trois modules broker appartiennent à l'acteur ADE tandis que leur répertoire et le processus OpenCode/broker appartiennent à devops. Une notification enregistrée par le broker mais refusée avant admission laisse aussi une demande PENDING sans propriétaire contrôleur, impossible à rejeter par la route corrélée.

## What Changes
- Lier séparément dans la preuve privée les UID des artefacts, du répertoire et des processus, sans mutation de propriétaire ni de droits.
- Réconcilier une demande orpheline du job courant sous PAUSE, avec preuve native complète d'absence d'effet, uniquement pour rejet.
- Conserver le profil historique de récupération, les refus d'approbation, ask/once, les identités et la persistance atomique.
- Distribuer et qualifier CAB 1.10.7, puis migrer les briques actives sous l'autorisation humaine déjà donnée.

## Impact
Code : preuve broker, contexte de job, registre et contrôleur ; tests unitaires/intégration et banc à deux UID ; distribution, documentation et version commune. Aucun secret, configuration fournisseur, changement de droits, migration métier, reprise de permission consommée ou modification Pixs n'est inclus.

## Autorité
Le développeur a validé explicitement les deux correctifs, leurs modifications OpenSpec, SCM, les tests, l'incrément de version, la migration et la reprise CISMP après vérification. Le périmètre autonome reprend ces seuls objectifs.
