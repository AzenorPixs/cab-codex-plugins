# Séparer autorisation, portée effective et candidats

Code non attribué. Correctif SCM2.4.3 sous le mandat permanent C12/PA01,
publication CI/CD puis CABU. Même transaction C12 et protections inchangées.

## Why
Le prévol global réel représente166Mo de candidats et98identifiants
supplémentaires authentifiés par le broker. Le reçu de contrôle ne doit pas
embarquer tous les payloads, ni changer son scope d’autorisation signé.

## What Changes
Stocker les candidats après projection dans des fichiers privés hachés ; le
reçu porte leurs références et refuse une lecture ancienne avant toute écriture.
Conserver l’autorisation d’origine et porter séparément le scope effectif,
limité aux mêmes projet/change/RUN et enrichi par le reçu propriétaire.
Après application/vérification, compacter le reçu avant redémarrage et retirer
les candidats temporaires. Aucun ancien état métier n’est sauvegardé ou restauré.
