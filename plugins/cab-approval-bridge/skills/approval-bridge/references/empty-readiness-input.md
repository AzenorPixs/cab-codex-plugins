# broker_readiness vide et input omis — CAB2.1.23

Le Code Mode natif2.2.0 peut omettre input dans metadata.toolCalls pour broker_readiness({}). CAB reconnaît uniquement un retour direct de l’appel à objet littéral vide, unique, sans découverte combinée : même outil observé, status completed, enveloppe completed/executed=false, truncated=false et absence d’erreur. La propriété input doit être absente ; null, tableau, objet divergent ou arguments non vides ne sont pas assimilés à{}.

La projection expose cgpt-validation_broker_readiness avec arguments{}, déjà attestés par le programme littéral. Elle ne modifie pas les métadonnées ; cabCodeMode.envelopeHash reste le SHA256 de l’enveloppe brute et distingue une omission d’un input explicite. Le texte du résultat ne fournit aucune décision ou permission ; ce diagnostic ne remplace ni approbation corrélée, ni accès HELD, ni once, ni preuve de fin native.

La règle ne s’applique pas à request_validation, get_approval, poll_approval, reject, search, aux appels multiples, variables, expressions, sorties transformées, états incomplets ou provenance divergente. Les autres comparaisons d’arguments restent exactes. Une source ambiguë conserve execute bloquant ; aucune valeur par défaut globale n’est ajoutée.

Qualification : cas natif2.2.0 avec omission réellement observée, un seul appel/readiness vide reconnu, métadonnées intactes et aucune permission créée ; tests positifs et adversariaux. Après SCM/publication/CABU vérifiés, les propriétaires peuvent relire leur diagnostic réel et poursuivre leurs mandats déjà autorisés sans rejouer une commande ou once, sans changer modèle/SID/PID.
