## Why

Le contrôleur refuse encore une notification valide lorsque le transcript
contient un wrapper CodeMode dynamique non normalisé et que son appel natif
unique `request_validation` s'est terminé normalement. L'erreur de notification
peut ensuite devenir un refus `NOT_ADMITTED` malgré l'entrée exacte présente
dans les métadonnées natives.

## What Changes

Corréler ce transcript brut terminé sous les mêmes gardes d'identité que la
forme normalisée, uniquement lorsque l'enveloppe est complète et que son
unique appel final `request_validation` porte l'entrée native exacte.
Clarifier aussi que Code Mode utilise `execute` comme outil hôte et que seul
le nom MCP renvoyé par la discovery peut y être appelé.

## Non-goals

Aucun état `NOT_ADMITTED` existant n'est rouvert ou rejoué. La corrélation
n'ajoute ni décision, permission ni `once`, et n'assouplit aucun garde de RUN.
