## Why

Une session OpenCode peut disposer des méthodes MCP CAB via Code Mode tout en
présentant `execute` comme unique outil hôte appelable. Le préambule actuel
insiste sur les outils natifs sans préciser ce routage, ce qui peut amener le
modèle à invoquer directement la fonction MCP et à perdre sa corrélation Code
Mode.

## What Changes

Le helper `nativeCodingMandate` et la référence de reprise distinguent
explicitement write/edit/shell des méthodes MCP CAB. Une méthode MCP doit être
appelée dans `execute` uniquement après discovery exacte ; si la méthode ou le
wrapper manque, la session signale le blocage sans appel direct ni repli.

## Non-goals

Aucune configuration OpenCode, permission, décision ou appel métier n'est
modifié. Aucun outil natif write/edit/shell n'est redirigé vers Code Mode.
