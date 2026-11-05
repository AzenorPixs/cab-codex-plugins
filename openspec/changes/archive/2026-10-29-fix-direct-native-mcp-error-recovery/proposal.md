# Récupération des erreurs MCP natives directes — CAB 2.1.11

## Why

C10 conserve deux appels MCP natifs directs en erreur tool.execution, avec native.itemId et temps complets. Le correctif 2.1.10 qualifie seulement les enveloppes Code Mode pour le refus access_id vide ; son refus actuel est donc attendu. La couverture directe manque pour cette récupération historique.

## What Changes

Dériver une provenance d’erreur directe depuis la partie tool native, sans faire confiance aux métadonnées libres. Réutiliser les gardes de retry existantes : refus déterministe access_id vide avant enregistrement, identités exactes, lookup inconnu natif corrélé, quiescence et prévol neuf. Qualifier positifs/négatifs, documenter les limites, aligner les sources 2.1.11 puis archiver et publier selon SCM.

## Autorité et limites

Le développeur a explicitement validé ce périmètre 2.1.11 dans ce chat. Aucun transcript, RUN, candidate ou service actif modifié. Aucun -32602 fabriqué, réarmement, nouvelle session métier ou once rejoué. CABU ultérieur distinct et coordonné. Les lectures réelles sont filtrées aux parties tool utiles ; aucun raisonnement opaque n’est affiché.

## Extension de pagination validée

Le développeur valide l’extension au même change : pages adaptatives sous le plafond existant de 2 Mio, sans troncature ni relèvement global, avec refus du message unique trop volumineux et gardes de curseur/intégrité conservées. Le signalement PA01 confirme une page de cinq messages lisible alors que 200 dépasse la limite. Aucun transcript ni runtime actif modifié.

## Cohérence documentaire dans le périmètre acquis

L’autorisation humaine inclut la documentation CAB nécessaire. Deux phrases de references/concurrent-runs.md sont alignées sur les règles déjà applicables : ordre AGENTS/Development Map et suppression de CAISM non répertorié. Le test de concordance est conservé. Aucune décision fonctionnelle nouvelle, écriture du template ou de sa copie. L’attente d’une validation intermédiaire supplémentaire est levée après réexamen de cette autorité existante, sans attribuer une nouvelle validation humaine au chat parent.
