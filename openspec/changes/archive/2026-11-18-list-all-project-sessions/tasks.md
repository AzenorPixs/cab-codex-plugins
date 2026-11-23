## Réalisation
- [x] Ajouter la route et le menu Sessions global.
- [x] Partager le tableau existant et ajouter Projets avec lien vers l'accueil.
- [x] Exposer un flux Electric global authentifié et limité aux projets autorisés.
- [x] Permettre la reprise sûre des snapshots libérés de la même session native.
## Vérifications hôte et report
- [x] Cinq contrôles ciblés : admin, projets autorisés, aucun projet, absence d'authentification et snapshot libéré inchangé.
- [x] Build TypeScript/Vite et contrôle Django sur l'hôte.
- [x] Chromium : sept sessions sur quatre projets, liens projet/RUN et mise à jour réelle d'une étape via Electric sans rechargement.
- [x] Vérifier les largeurs 390, 1920, 3840 et le maintien du tableau par projet.
- [x] Reporter les fichiers validés et préparer indexation/libération CAB sans CI/CD.

Preuves observées le 18 novembre 2026. La libération finale est attestée par
son reçu CAB ; le build et les contrôles ne valent ni publication ni installation.
