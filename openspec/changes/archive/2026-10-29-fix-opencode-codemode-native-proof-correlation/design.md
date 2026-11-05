# Conception

## Projection strictement bornée

Le client V2 conserve les parties directes déjà prises en charge à l'identique. Pour execute, il reconnaît seulement un programme retournant directement l'attente d'un appel d'outil nommé, avec un unique objet de données littérales JSON. Les clés non citées sont admises uniquement comme identifiants statiques ; aucune variable n'est acceptée comme valeur. La découverte search est purement diagnostique ; ses formes reconnues et ses arguments doivent correspondre aux appels natifs. Aucune évaluation JavaScript, interpolation, propriété calculée, boucle, transformation de sortie ou appel caché n'est exécuté par CAB.

Pour une enveloppe terminée, la liste native toolCalls complète et non tronquée doit correspondre exactement au programme reconnu et à ses arguments. Une enveloppe en cours d'appel request_validation peut établir une intention d'admission si sa forme unique est reconnue ; cette intention n'est jamais une preuve de fin ni une autorisation. Chaque projection garde l'identité extérieure et une empreinte de l'enveloppe native complète. Une forme inconnue reste visible et bloquante, sans extraction permissive.

## Corrélation et fin

Les appels MCP correspondent aux outils internes existants après vérification structurée. Les permissions natives, leur source, le callID et les états de fin restent nécessaires. La correspondance exacte des commandes et le code de retour sont qualifiés avec OpenCode 2.2 réel ; aucune identité ou issue n'est déduite du texte du modèle. Si une forme native ne fournit pas de preuve suffisante, le contrôle reste fermé.

## Rejet réconcilié et conservation

Les recherches reconnues n'accordent aucune autorité. Une interruption de polling en lecture seule n'atteste aucun refus ; un rejet terminal corrélé ultérieur est obligatoire. Le relais natif de la décision CGPT rejected est admissible uniquement dans la réconciliation explicite, sans approbation ni commande. Les préfixes des anciens outils directs restent inchangés. Les empreintes des enveloppes nouvelles permettent de détecter leur altération. Même RUN/job/candidate ; aucune décision ou permission consommée rejouée.

## Qualification et livraison

Tests de formes valides et refus : code modifié, arguments ou noms divergents, sortie fabriquée, appels multiples, métadonnées absentes ou tronquées, interruption, empreinte altérée et permission non corrélée. Un serveur OpenCode 2.2 isolé, un fournisseur synthétique local et des credentials de test doivent exercer l'admission, la décision humaine simulée, ask/once, /usr/bin/true et le recovery. Les processus et fichiers de test sont nettoyés ; l'instance partagée est préservée pendant la qualification. Après validation finale : distribution 2.1.8, synchronisation, archive, statistiques et publications SCM ; CABU puis reprise opérationnelle réelle.
