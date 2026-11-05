# Conception

Le contrôleur vérifie d'abord les parties `request_validation` déjà
normalisées. En complément, il peut examiner une partie `execute` native V2
conservée brute par le client. Le repli exige `executed=false`, un état terminal
d'erreur, `metadata.error=true`, `metadata.truncated=false` et un tableau
complet de un ou deux appels. Le dernier doit être l'unique
`cgpt-validation.request_validation`, avec une entrée identique à l'identité
native attendue. Si un appel précède, il doit s'agir uniquement de `search`
terminé. Aucun autre appel ni appel répété n'est accepté.

Cette vérification ne modifie aucun état de décision ou de permission. Tous les
contrôles existants de RUN, session, admission et identité demeurent actifs.
