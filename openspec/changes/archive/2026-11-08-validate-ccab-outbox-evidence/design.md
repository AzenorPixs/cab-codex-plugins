## Conception

Le broker vérifie le même schéma de preuves que CCAB : liste bornée d’objets `{reference,sha256}`, référence non vide et SHA-256 hexadécimal de 64 caractères. Il refuse avant création de fichier une nouvelle preuve invalide.

Pour une entrée existante uniquement, une nouvelle soumission de même incident, session, projet, change, RUN, catégorie et résumé peut remplacer une liste de preuves invalide par une liste valide. La date initiale est conservée ; tout autre changement ou une tentative d’altérer des preuves déjà valides est refusé. L’écriture est atomique et le paquet reste en place en cas d’échec du relais. Les chemins et autres entrées ne sont pas accessibles par cette opération.
