# Reprendre les reçus propriétaires volumineux

Code non attribué. Correctif SCM2.4.1 sous le mandat permanent du développeur
pour les incidents CAB, avec incrément, CI/CD, publication puis CABU.

C12 a appliqué ses quatre candidats, mais son reçu signé de76Mo dépasse le
lecteur64Mio. La vérification d’absence actuelle prend environ58s, près de la
limite du worker. Le coordinateur reste FREEZING sans reçu APPLIED.

Aligner la lecture/écriture du reçu sur la borne128Mio déjà utilisée pour le
transport propriétaire, accélérer la recherche littérale des identifiants sans
réduire sa couverture, puis reprendre le même reçu authentifié. Ne modifier
ni scope, ni journal métier, ni clé pour contourner une garde. Qualifier la
reprise après fichiers déjà appliqués et conserver les pairs.

Les incidents PA01 sont triés dans CCAB : sa barrière de transport dépend du
nettoyage C12 ; sa forme d’appel d’atelier est qualifiée avant de décider d’un
correctif documentaire. L’isolation globale du processus OpenCode n’est pas
annoncée comme une propriété de ce correctif.
