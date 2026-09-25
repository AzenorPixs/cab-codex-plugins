## Context

`/cab start` doit connaître l'identité réellement sélectionnée de l'agent
OpenCode avant de lui confier le premier prompt. Un état HTTP sain ou un
modèle simplement déclaré ne suffit pas à prouver qu'il peut répondre.

## Decisions

Le prévol utilise uniquement les API locales OpenCode. Il lit la configuration
effective de l'agent de codage ciblé, vérifie que le fournisseur et le modèle
sont publiés par l'API, puis crée une session temporaire sans outil ni accès
au projet. La requête porte explicitement le couple fournisseur/modèle et le
niveau de raisonnement observé dans la configuration.

La réponse et ses métadonnées doivent confirmer le même fournisseur, modèle et
niveau de raisonnement. La session temporaire est clôturée après le contrôle.
En cas d'absence, d'erreur ou de divergence, `/cab start` publie `CAB_INACTIF`
avec les valeurs observées et ne crée ni ne réutilise la session persistante.

## Risks / Trade-offs

- Le prévol consomme une requête LLM supplémentaire par démarrage CAB.
- Les API OpenCode ne doivent jamais fournir de secret au prévol ; seules les
  métadonnées de modèle nécessaires au contrôle sont exploitées.
- Une indisponibilité transitoire bloque explicitement le démarrage au lieu de
  faire tomber CAB sur une configuration différente.
