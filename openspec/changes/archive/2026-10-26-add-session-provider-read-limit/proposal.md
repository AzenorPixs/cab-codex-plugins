# MOD02 — Budget de lecture fournisseur défini par la session

## Why
Le catalogue natif /provider dépasse 2 Mio et bloque la résolution du modèle. Le développeur exige que la session de pilotage définisse ce budget, puis CAB applique la valeur fournie, plutôt qu'un nouveau plafond fixe de 16 Mio.

## What Changes
- Ajouter providerMaxBytes optionnel à /model-policy/resolve et modelSelection pour l'armement négocié. Entier positif représentable exactement, en octets ; refus avant observation s'il est invalide. La session choisit sa valeur, sans plafond fixe ajouté par CAB.
- Appliquer le budget au seul /provider de cet appel ; conserver 2 Mio par défaut pour compatibilité et pour toutes les autres observations, ainsi que la borne distincte du catalogue PLLM.
- Garder le choix du modèle, prévol, confidentialité et jobs historiques inchangés.
- Incrémenter toutes les briques et supports CAB de 1.10.1 à 1.10.2, qualifier la mise à jour depuis 1.10.1 puis mettre à jour les briques locales sans fermer OpenCode.

## Capabilities
### Modified Capabilities
- coding-model-policy : budget explicite de lecture du fournisseur par la session de pilotage.

## Impact
controller.mjs, tests HTTP, référence model-policy.md, commande /cab, protocole et cadrages concernés ; incrément commun des modules Python/Node/plugin/supports/tests courants. Aucune archive historique, DEVOPS.md, configuration fournisseur ou secret modifié. Aucun Git. Tests synthétiques seulement, sans sauvegarder le /provider réel. Installation par CLI et maintenance sous quiescence avec conservation des jobs, pauses, preuves et releases.

La demande humaine directe autorise SCM, limite configurable, incrément commun, tests et installation locale sans fermer OpenCode. L'archivage OpenSpec et son rapport sont inclus dans SCM. PA02 conserve sa pause humaine sans reprise automatique ; ses réglages catalogue/provider ne sont pas modifiés ici.

Instruction humaine ultérieure : terminer uniquement l'archivage ; l'application des mises à jour locales revient à la session qui les demande. Aucun déploiement, gel ou redémarrage de service n'est réalisé dans ce change. Les sources et preuves de préparation restent distinctes des versions chargées.
