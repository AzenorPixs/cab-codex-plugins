# Conception et garanties

L’autorité est toujours le RUN/propriétaire/contexte courant. L’identité et
la génération de la cible historique restent immuables. La dérogation de
retraite ne permet ni création d’opération ni émission et n’assouplit pas
owned()/scope() pour les opérations exécutables. Les ressources restent dans
le périmètre courant ; les accès/once/résultats interdisent la retraite historique.

La preuve de retrait conserve le transcript complet et exige un unique call
cible refusé avec ACK204 exact. Les appels étrangers ne sont écartés que par
corrélation persistée d’une autre opération et preuve native terminale. Les
appels ambigus ou sans rattachement ne sont pas ignorés. Les deux lectures
stables et reçus idempotents restent obligatoires.

Pour le port, le reboot n’est pas une ancienne identité de PID reconstituée.
Le contrôleur expose une preuve additive d’époque noyau si bootTime est
strictement postérieur au début et à la fin du call historique timeout. Les
sondes natives recapturent cette frontière, l’identité courante et les espaces
cgroup/netns, puis les contrôles de port/processus existants. Les deux preuves
restent fraîches et identiques entre elles et au contrôleur. Aucun vieux
processus du même noyau ne peut traverser un reboot ; les nouveaux processus
et listeners restent examinés. Le résultat explicite reste
HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT, sans exit historique.

La nouvelle voie ne déclenche pas seule les sondes, le nettoyage ou la purge.
Les effets réels sont pilotés par le propriétaire après activation CABU.
Le retour de code conserve les états métier et refuse les preuves du nouveau
mode qu’un ancien lecteur ne saurait qualifier ; aucun rollback de registre.
