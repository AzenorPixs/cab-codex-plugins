# Conception

Le parseur Code Mode reste une grammaire de données, jamais un interpréteur
JavaScript. Il décode les templates sans interpolation et peut lier une seule
déclaration `const` à une valeur string littérale si cette variable apparaît
exactement une fois comme élément unique de `commands`. L'appel terminal
`request_validation` reste l'unique effet du wrapper.

La grammaire refuse les substitutions `${...}`, les autres déclarations,
expressions, suffixes ou appels. Les métadonnées natives doivent contenir
exactement un `cgpt-validation.request_validation` complet et identique à
l'objet reconstruit. L'empreinte du wrapper et les gardes du contrôleur restent
inchangées.
