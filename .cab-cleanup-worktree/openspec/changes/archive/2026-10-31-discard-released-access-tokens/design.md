# Conception

L’accès actif garde son jeton UUID jusqu’à ce que `finishAccess` termine la
transition. La transition supprime alors la propriété `token` avant persistance
ou retour HTTP. `releaseDigest` reste l’empreinte de la requête complète,
incluant le jeton soumis ; elle permet de reconnaître uniquement le rejeu exact.

Le lecteur du registre accepte déjà l’absence de jeton pour un accès inactif.
Les accès HELD/EXECUTING/UNKNOWN continuent d’exiger un jeton valide. La
publication partage `finishAccess` et reçoit la même suppression.

Les tests couvrent l’accès actif, sa libération, la réponse et le registre
après persistance/reprise, le rejeu exact, un rejeu divergent et la publication.
Ils utilisent uniquement des jetons synthétiques dans un registre temporaire.
