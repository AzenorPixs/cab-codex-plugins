# Conception

Le parcours administratif conserve le même reçu et le verrou Git. Le nouveau
cas est limité à un CICDF dont le commit a échoué avant l’émission des
références avec un conflit d’index partagé. Les gardes portant sur le RUN,
les opérations, la branche, la version et l’index isolé restent applicables.

L’inspection valide l’arbre Git figé, contrôle les fichiers de code et vérifie
pour chaque entrée modifiée de l’index partagé un reçu d’indexation de
statistiques conforme au SHA-256 du blob. Elle produit un candidat local
qui conserve l’arbre, en ne rafraîchissant que l’empreinte de comparaison de
l’index partagé. La reprise revérifie ces témoins sous verrou. Les règles
existantes d’inclusion et de retrait des rapports restent appliquées par
la préparation du commit.

Le worker transmet ce candidat au moteur de commit, préserve le plan durable
original et poursuit les étapes aval sur le même reçu. Aucun changement de
schéma ni de format de commande. Un échec sans effet demeure distinct d’un
effet incertain. Le reçu historique 209 ne participe qu’à la motivation.
