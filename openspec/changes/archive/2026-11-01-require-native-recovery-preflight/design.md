# Conception

La découverte Code Mode reste une observation non autorisante. Le normaliseur
accepte un unique `search` retourné directement, sous entrée littérale et
métadonnées natives concordantes. Avant le gel, le contrôleur vérifie que le
résultat expose `request_validation` et scelle le préfixe complet dans
`preparationHistory`.

La récupération exige les permissions candidates shell/edit ask, après
vérification V2, et avant toute mutation du job. Une permission manquante
refuse `prepare`; l’orchestrateur peut corriger uniquement la politique de la
candidate avant de retenter, en préservant les autres règles.

Après `prepare`, l’admission de `request_validation` relit le transcript natif
et compare le préfixe scellé. Une découverte ou un wrapper non corrélé est
refusé avant validation, notification et once. `complete` répète cette garde.
Pour compatibilité, un recovery déjà préparé avant l’ajout de la preuve de
signature peut être clôturé si et seulement si son unique découverte
normalisée est une recherche read-only exacte en fin de transcript, après la
commande, la readiness finale et une exécution prouvée ; aucune nouvelle
opération n’est admise dans cette exception.

`request_validation` utilise un timeout fini par défaut et refuse zéro. À
timeout, le broker rend `validation_timeout`, `retry_required` et le même
approval ID ; seul `poll_approval` de cette identité peut poursuivre l’attente.
Notification livrée, réponse terminale, décision CAB, once native, shell
terminé et readiness restent des preuves distinctes.
