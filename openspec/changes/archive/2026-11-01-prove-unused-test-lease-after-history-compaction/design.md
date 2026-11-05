# Design

La preuve de transcript complet reste prioritaire en l’absence de compaction.
Lorsqu’une compaction survient après `grantedAt`, le contrôleur sélectionne un
mode ledger-only seulement si le registre de coordination fournit chaque
opération pertinente depuis le bail, chaque opération est terminale sans
`native`, les validations sont rejetées ou annulées avec une preuve corrélée,
et aucun accès n’est actif. L’état global des permissions et de la session est
relu à la frontière.

Le digest de frontière existant lie le bail restauré, le RUN, toutes les
opérations, les accès et les propriétaires de requêtes. Le reçu de libération
indique `operation-ledger-after-compaction`; il conserve aussi le hash du
transcript observé. La route POST recalcule le mode, les classifications et le
digest avant toute mutation. Tout `nativeStart`, état non terminal ou donnée
absente fait échouer ce mode, sans repli implicite vers une attestation
manuelle.
