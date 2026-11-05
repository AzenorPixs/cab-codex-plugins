# Broker PENDING après retrait local — CAB 2.2.40

## Identifier la dette de communication

Le contrôleur, le broker, la permission native et l’accès sont des registres
distincts. Une décision locale APPROVED ne prouve pas que le broker l’a reçue.
Après retrait qualifié, l’opération peut être CANCELLED et l’accès RELEASED,
alors que la demande broker reste PENDING/DELIVERED. Ce pending peut maintenir
DECISION_WAIT_WITHOUT_PROGRESS. Une livraison passée n’est pas une décision
terminale ; ne pas créer de stage/mandat supplémentaire pour la masquer.

Lire list_pending filtré par RUN/SID, puis lookup_validation sur les cinq
champs d’origine. Conserver les identités, les reçus et les états exacts. Le
texte assistant ou un compteur global ne suffit pas à identifier la demande.

## Choisir la voie propriétaire

- Si une réponse de décision existe encore : get_approval/poll ou la
  réconciliation contrôlée prévue peut appliquer cette réponse déjà corrélée.
  Vérifier résultat structuré et état persistant ; aucune once ne se rejoue.
- Si la réponse exécutable a été retirée (GET décision404), ne pas reconstruire
  un APPROVED à partir d’un récit ou d’un champ historique.
- Pour la SEULE demande encore PENDING, si les reçus exacts confirment retrait
  local CANCELLED et accès RELEASED, SID quiescent, zéro permission et aucun
  native/nativeResult/once de cette unité, le propriétaire peut décider une
  unique cancel_approval de cette demande dans son mandat. Utiliser le gabarit
  natif canonique et approval_id exact. Un broker déjà APPROVED n’est pas
  annulable par cette voie ; une preuve absente ou un effet incertain l’exclut.

Cette clôture communicationnelle conserve l’APPROVED historique du contrôleur
et les reçus de retrait/libération ; elle ne falsifie pas une ancienne décision
broker et n’autorise aucun effet métier. Si l’envoi ou sa réponse est incertain,
relire le même reçu et l’état, sans répéter le cancel. Exiger le CANCELLED MCP
exact, cancelled_by=OC et disparition du pending, puis readiness fraîche du RUN.
Si le broker est déjà terminal, conserver son état et ne pas inventer d’annulation.

## Poursuivre

Après solde des registres, préparer l’unité neuve avec révisions effectives
fraîches et, pour un script composé, [carrier scellé](exact-shell-carrier.md).
Pendant le parcours ordinaire, réobserver la réception de la décision broker
avant GO pour éviter cette dette. Une nouvelle unité conserve son propre cycle
validation/décision/acquisition/once/résultat/libération ; aucun ancien ID ou
accord consommé n’est transféré. Le [retour propriétaire](owner-diagnostics.md)
ne remplace pas les gardes de l’action choisie.
