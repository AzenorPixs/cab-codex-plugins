# Conception

## Diagnostic broker

Lire au plus1025 octets pour admettre un corps de1024 maximum. Reconnaître seulement des codes énumérés pour leur statut HTTP ; préserver la reconstruction existante command-too-long. Les champs supplémentaires sont ignorés, aucun message distant n’est recopié. Persister le dernier diagnostic HTTP/code (code null si inconnu) seulement sous la lease de notification courante ; une ancienne lease ne modifie rien. L’historique des tentatives reste distinct du statut métier. Les anciennes approbations restent lisibles sans ce champ optionnel.

## Refus corrélé au RUN

Un observateur de refus attaché à la requête alimente le compteur HTTP existant du RUN connu. Le contexte le prévient sur les refus locaux de validation et le contrôleur sur ses propres refus. Une garde par requête interdit leur double comptage. Le compteur représente des tentatives HTTP, pas des demandes uniques ni des décisions REJECTED ; les autres compteurs et schémas statistiques restent conservés. Les erreurs non attribuables restent sans propriétaire inventé.

## Validation et livraison

Positifs : stale structuré, persistance/relecture, reprise après redémarrage, compteurs par RUN et tentatives répétées. Négatifs : corps trop grand/invalide, code inconnu, mauvais statut, données arbitraires, lease périmée, autre RUN, absence d’admission/décision/once. Préserver command-too-long et les garde-fous actuels. Tests isolés avant suite globale, synchronisation/archivage/statistiques, publications SCM, puis activation CABU unique coordonnée avec les sessions.

Le champ retourné est notification_diagnostic : {http_status, error_code}. error_code vaut null si aucun code fermé n’est reconnu. Le champ est absent pour une ancienne approbation sans diagnostic, une tentative sans statut HTTP ou une livraison réussie. Il décrit le dernier résultat de notification, jamais une décision. Les compteurs httpFailures existants représentent des tentatives HTTP, pas des demandes uniques ; le schéma statistique n’est pas modifié.

## Cohérence de la documentation régénérée

Le protocole consommateur0.5 préexistant ajoute deux clarifications au bloc concurrent (priorité resource-scoped et condition d’archivage avant REPORT) et reformule la section PLLM. La référence CAB est alignée sur ces clarifications sans modifier template/copie. Le test d’embarquement intégral est conservé ; le test PLLM exige les mêmes invariants sur les trois supports avec formulations équivalentes et garde l’identité entre skill/commande. La concordance textuelle entière avec l’ancien titre du protocole n’est plus une attente correcte de ce test. Aucun contrôle de fraîcheur, conservation, attente humaine, prévol ou absence de rejeu n’est retiré.
