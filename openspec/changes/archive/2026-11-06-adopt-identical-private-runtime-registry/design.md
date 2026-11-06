# Adoption par preuve de source, jamais par existence

L’initialiseur garde son refus de collision par défaut. Un appel contrôlé
peut fournir l’inventaire name/SHA256 validé du reçu ; il doit couvrir exactement
les sources actuelles, dont le registre. Un registre préexistant sans manifeste
n’est adopté que byte-identique. Tous les fichiers runtime connus présents en
cible doivent être présents dans l’inventaire et identiques avant toute mutation.
Le manifeste note l’adoption. Les fichiers absents sont copiés normalement et
les identiques restent intacts. Les sources sont revérifiées après copie.
L’updater relie l’inventaire au même reçu/projet, conserve les anciennes preuves
capturées et prend l’autorité du registre privé avant la copie. Le contrôleur
normal ne reçoit aucun droit d’adoption implicite. Divergence : refus explicite,
aucun écrasement, aucune purge, aucune nouvelle transaction aveugle.
