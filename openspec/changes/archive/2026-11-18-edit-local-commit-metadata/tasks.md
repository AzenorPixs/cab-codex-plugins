## Réalisation
- [x] Ajouter le moteur d'édition et ses gardes de concurrence et signatures.
- [x] Exposer lecture et validation authentifiées via CAB.
- [x] Ajouter l'éditeur en overview, puis rafraîchir l'historique parent.
- [x] Réutiliser l'éditeur depuis la ligne Tag et depuis un second overview du dernier commit.
- [x] Afficher Tag à éditer même sans tag existant et préremplir le tag cliqué.
- [x] Réutiliser les mêmes champs pour le futur commit avec auteur, courriel, date et description du tag indépendants.
- [x] Ajouter une libération CAB des réservations après validation et indexation hors CI/CD, avec conservation de l'index et des objets.
## Validation hôte
- [x] Vérifications ciblées du moteur sur dépôt temporaire de l'hôte.
- [x] Build frontend et vérification Chromium des overviews imbriqués.
- [x] Reporter les fichiers validés dans le projet, sans CI/CD ni versionnement.

Preuves du 18 novembre 2026 : contrôles ciblés du moteur ; build TypeScript/Vite
réussi ; Chromium valide les six champs, le placement d'Éditer, Annuler,
l'enregistrement HTTP sans changement et la conservation de l'historique parent
après Fermer et Échap. Formulaire contrôlé en 390 et 1920 pixels sans débordement.
Le reçu réel d'enregistrement sans changement confirme zéro réécriture de commit
et zéro tag modifié. Aucune CI/CD, publication, modification de version ni
réécriture de l'historique du projet CAB n'a été réalisée pour ce développement.

Vérifications complémentaires : accès par Tag avec présélection ; second
overview depuis Dernier commit avec conservation du parent ; sélecteur visible
sans tag ; futur commit avec identité et date préremplies, formulaire responsive
et annulation sans effet. Les tests Git réels sur dépôt temporaire confirment
l'auteur, les deux dates de création, la description distincte (y compris vide),
le flux console et la confirmation d'un tag existant avant indexation.

Correction du verrouillage final : `session_git_release` exige un contrôle
réussi sur la révision courante et vérifie tous les fichiers réservés contre
l'index isolé. Un fichier nouveau non indexé ou modifié après indexation interdit
la libération. Seules les réservations du RUN sont libérées ; l'index passe à
RELEASED et reste protégé, sans commit ni push. Le protocole CAB demande cette
étape avant restitution d'un travail validé sans livraison.
