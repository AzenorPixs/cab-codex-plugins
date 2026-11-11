# Coordination autonome entre codeurs — code non attribué

## Why
Le relais systématique de l’orchestrateur pour les dépendances ralentit les missions.
Le développeur valide la délégation des échanges courants aux codeurs et CAB 2.7.0.

## What Changes
Déclarations, avis sourcés, réception, vérification et acquittements autonomes.
Routage natif vers les codeurs, y compris via broker sous un autre UID.
Transfert explicite des propriétaires historiques sans changer SID/RUN ni perdre les avis.
Accès partagés sérialisés par opération, attentes mécaniques et détection des cycles.
L’orchestrateur arbitre les seules exceptions et conserve la revue finale.
Le référentiel prompts est aligné dans son propre change et livré séparément.

## Extension validée
Le développeur a explicitement inclus dans 2.7.0 un exécuteur externe générique
SSH pour banc conteneur déclaré et réservé, le 11 novembre 2026. Le codeur doit
pouvoir poursuivre seul après cadrage initial ou exception approuvée.

## Impact
CAB : spécifications, broker, contrôleur, boîte, concurrence, supervision,
contrat distribué, tests et documentation. Prompts : SESSION_COORDINATION,
SCMP/CISMP/ISMP/ACSP et cadrages concernés. CI/CD CAB 2.7.0 puis CABU.
Les amendements de skills préparés par CCAB sont conservés et inclus dans le commit complet.
