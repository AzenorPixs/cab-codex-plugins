# MAI11 — Qualifier le banc historique CAB 1.7.1 vers 2.1.5

## Pourquoi

Les 25 tests historiques sont désactivés sans le paquet 1.7.1 épinglé. La transition courante vise 2.1.5, mais les contrats de transition mixte et une assertion de release portent encore des versions anciennes. Le développeur autorise la recherche du paquet authentique, l’alignement OpenSpec/tests et leur exécution isolée.

## Changements

- Restaurer depuis Git les seules sources publiques du paquet 1.7.1 dont le contrôleur correspond au SHA-256 épinglé ; conserver les empreintes et le commit de provenance.
- Aligner la transition mixte, la frontière métier et son scénario d’artefacts sur la cible explicite 2.1.5, sans changer les garanties de PAUSE, de preuve et de refus.
- Actualiser le banc et corriger les incompatibilités de fixtures révélées par les essais sans affaiblir les assertions de sécurité.
- Exécuter les 25 cas de premier niveau et leurs sous-tests avec des répertoires, processus et transports synthétiques dédiés.

## Capacités

### Capacités modifiées

- active-component-update : qualification de la transition historique vers 2.1.5.

## Limites

Aucun déploiement, activation, publication, modification de service réel, secret ou historique utilisateur. Aucun archivage demandé. Aucun code de lot nouveau attribué à ce change.

## Compatibilité de preuve révélée par le banc

Le premier essai refuse correctement l’adoption parce que l’annonce publique testResourceProtocol ajoutée par le lecteur récent change l’empreinte globale. Le correctif de maintenance-proof exclut cette seule annonce après validation stricte de sa valeur, sans exclure les réservations ni aucune donnée métier. Le banc couvre équivalence, annonce inconnue et divergence métier.
