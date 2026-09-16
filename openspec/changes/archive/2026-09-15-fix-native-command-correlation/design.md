## Context

Le contrôleur conserve le texte exact de la commande dans l'opération approuvée
et compare cette valeur à `permission.metadata.command`. OpenCode peut ajouter
une instrumentation de sortie déterministe pour restituer le code de retour,
ce qui rend une permission légitime non corrélable malgré une décision CAB
approuvée.

## Goals / Non-Goals

**Goals:**

- Reconnaître l'enveloppe d'instrumentation produite par OpenCode sans perdre
  l'intégrité de la commande métier approuvée.
- Préserver l'unicité de la permission et le refus de toute divergence.

**Non-Goals:**

- Normaliser arbitrairement la syntaxe shell.
- Autoriser des commandes composées, des préfixes ou des opérations implicites.
- Modifier le protocole MCP, le magasin ou les décisions du broker.

## Decisions

- Ajouter une fonction pure qui reconnaît uniquement la forme d'instrumentation
  observée, après comparaison exacte du préfixe avec la commande approuvée.
  Cette limite évite une équivalence shell trop permissive.
- Réutiliser cette fonction dans la détection des permissions corrélées et dans
  la transmission de la réponse `once`, afin que les deux chemins appliquent
  exactement la même règle.
- Couvrir les trois formes : exacte, instrumentée admise et divergente refusée.
  Une analyse ou une exécution shell serait plus large, non déterministe et
  incompatible avec le principe de moindre privilège.

## Risks / Trade-offs

- [Évolution de l'instrumentation OpenCode] → La règle reste volontairement
  fermée ; une nouvelle forme ne sera pas approuvée silencieusement et devra
  être explicitement spécifiée.
- [Faux positif] → Le suffixe admis est vérifié intégralement et le préfixe
  métier est comparé à l'identique.

## Migration Plan

Le changement est rétrocompatible : les commandes exactement égales continuent
d'être corrélées. En cas de régression, restaurer la comparaison stricte retire
l'acceptation du seul suffixe instrumenté sans modifier les données persistées.
