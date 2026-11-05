# Décisions de pilotage et soumission sans ambiguïté — CAB 2.2.21

## Why
PA01 a confondu l’acquisition portée par le contrôleur avec une acquisition automatique après APPROVED. Une soumission Code Mode calculant ses identifiants a aussi retardé l’admission jusqu’à la fin du wrapper. Les références actuelles décrivent ces contraintes mais leur dispersion favorise relectures du code, fausses alertes et attentes inutiles.

## What Changes
Ajouter une grille d’états et de décisions pointant vers les voies existantes, un parcours de soumission/action concret, et un traitement borné des cas inconnus. Clarifier acteur versus automatisme de l’acquisition, projections versus registre, preuve fraîche versus historique, retrait/fin/libération. Charger uniquement la branche utile et préparer les valeurs avant les lectures natives fraîches. Répercuter les liens dans skill, commande et cadrages, version2.2.21.

## Scope
Documentation distribuée, OpenSpec, cadrages, preuves et versions uniquement. Aucun nouveau endpoint, comportement moteur, autorisation métier, cadence, dépendance ou mutation du RUN Pixs. Les états incertains et mandats restent protégés. Code non attribué ; ACL ultérieure.
