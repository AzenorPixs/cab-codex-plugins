# Livrer le correctif de récupération statistique local

## Why

La correction qualifiée et appliquée localement reste absente du paquet CAB3.9.3. Le développeur demande sa livraison SCM+CICD puis son activation CABU, avec clôture et archivage sans réservation.

## What Changes

Publier en3.9.4 l'extension déjà spécifiée dans openspec/specs/statistics-retired-report-recovery/spec.md, ses sept tests et ses archives propriétaires. Le mécanisme d'annulation d'une indexation préparée est déjà présent dans HEAD ; ses cinq tests sont conservés comme contrôle de régression. Le RUN attend une publication CAB et le même reçu CABU pour l'installation et la santé du service. Aucun CICDF, aucune nouvelle fonctionnalité ni modification d'un autre RUN.

## Validation et publication

Douze tests ciblés, compilation Python et validation stricte de la spécification canonique. Archiver ce dossier de préparation avant publication pour conserver une révision stable des preuves. La publication et l'activation sont ensuite attestées par les producteurs CAB, sans cases déclarant prématurément leur réussite.
