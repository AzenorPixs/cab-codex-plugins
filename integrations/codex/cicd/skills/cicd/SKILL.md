---
name: cicd
description: Déclencher la CI/CD autorisée du projet via CAB avec une version, puis suivre le même reçu de livraison.
---

# CICD 3.2.16

Utiliser ce skill pour une demande de livraison CI/CD par CAB, avec la version fournie par le développeur. Si la version manque, demander uniquement cette valeur. Le RUN et le projet proviennent du rattachement natif vérifié de la connexion MCP ; ne pas inventer leur identité.

Vérifier que le catalogue MCP fournit `session_delivery_start` et `session_delivery_status`. Si ces outils manquent, signaler que le moteur ou le connecteur chargé ne propose pas encore ce parcours ; ne pas remplacer leur absence par des commandes Git ou un CI/CD DIU global.

Lancer `session_delivery_start(version)` pour la livraison autorisée. CAB met à jour PROJECT_VERSION, utilise l’index isolé de la session, crée le commit et son tag égal à la version, envoie aux forges et orchestre les builds et releases DIU activés. Le modèle n’exécute aucune opération Git et ne demande pas à DIU de les refaire.

Après admission, consulter `session_delivery_status(version)` jusqu’au résultat connu, en conservant la même version. Une interruption ou une réponse perdue impose cette consultation, sans nouvelle demande destinée à contourner l’incertitude. Les états UNKNOWN, PARTIAL et FAILED exigent de présenter l’étape et le reçu concernés ; ils ne prouvent pas une livraison réussie.

DIU travaille sur le répertoire habituel du projet dans son état au lancement. Les artefacts peuvent inclure des modifications postérieures au commit ; ne pas les présenter comme exclusivement issus de ce commit sans preuve.

Rapporter la version, le commit, les forges et les étapes effectivement confirmées. Distinguer publication et installation sur l’hôte : l’installation nécessite le parcours CABU et le mandat applicable. Ce skill ne crée pas une autorisation de livraison absente.
