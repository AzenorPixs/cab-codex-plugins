# Diagnostics propriétaires autonomes — CAB 2.2.38

## Why
Le développeur demande explicitement de documenter au maximum skill,plugin et
commande afin de réduire les sollicitations. PA01 a rencontré des confusions
sur états historiques,couverture de policy,formes de checkpoint et empreintes,
puis un brokerPENDING après retrait local. Les voies existantes restent sûres.

## What Changes
Index par cas et références ciblées : sources courantes,policy,préparation,
clôture broker exacte. Clarifier le gate terminal selon la spécification déjà
validée. Aucune nouvelle garde ni logique runtime. Préserver preuves,mandats,
identités et décisions ; humain seulement pour une décision hors change.

## Scope
Contrat distribué,skill/commande,cadrages,spécification documentaire et version.
SCM puis tests ciblés,commit,publication et CABU ; code non attribué,ACL ultérieure.
La documentation décrit les cas connus, sans promettre couvrir tout incident
futur ni autoriser un effet incertain. Reprise métier vérifiée séparément.
