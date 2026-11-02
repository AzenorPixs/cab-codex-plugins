# Conception

Le tour NO_EFFECT est déjà lié à un unique message utilisateur, son wrapper
`request_validation` et le message assistant final `finish=stop`. L’inspection
des tool parts doit s’arrêter à la fin de ce tour. Les événements du journal
restent liés par messageId ; ceux dont la séquence dépasse le watermark
enregistré au classement UNKNOWN sont postérieurs à la frontière. Ils ne
prouvent et n’invalident aucun effet du tour précédent. Tout événement non
corrélé à la frontière, sans séquence postérieure ou associé aux messages du
tour reste refusé.

Les deux lectures transcript/journal, l’idle, l’absence de permission et
d’opération sœur active, les identités et révisions restent obligatoires.
