## Pourquoi

Un échec du prévol de l’état privé peut survenir après l’enregistrement de l’intention côté contrôleur et avant tout reçu local ou transport. Le RUN conserve alors une intention bloquante sans voie de réconciliation propriétaire.

La recette native historique vérifie en outre un ancien registre d’usage que
le contrôleur n’alimente plus depuis la collecte SGS, ce qui masque la
qualification de la continuité des mesures après handoff.

## Changement

Prévoir une réconciliation limitée aux échecs de prévol natifs strictement corrélés et démontrés antérieurs à l’envoi, ainsi qu’une protection contre la reproduction de cet état. Les autres intentions incertaines restent protégées ; aucun test, reçu d’exécution ou résultat distant ne doit être inventé.

Qualifier le parcours quantitatif courant sur OpenCode, collecteur et SGS
réels isolés avant et après handoff, avec déduplication et couverture explicite.
