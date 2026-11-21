# Effets de session autorisés et reprise après commit

## Why

La livraison213 a publié son commit3.9.4 avant de constater que les versions publiques du paquet restaient3.9.3. La reprise existante ne couvre que les échecs avant commit. Le développeur autorise un correctif du moteur et des interfaces distribuées puis une reprise CICDF de213 jusqu'à CABU, clôture et archivage sans réservation.

## What Changes

Vérifier les versions publiques CAB avant toute publication Git et fournir une préparation réservée. Permettre aux sessions des commits, constructions et publications ponctuels ou de reprise, avec autorité du RUN et nouvelle tentative identifiée. Une validation explicite couvre un effet ponctuel ; un échec connu du parcours couvre sa reprise correspondante. En piloté, l'orchestrateur porte la validation ponctuelle.

La reprise après commit conserve RUN, livraison et version. Une autorisation explicite ouvre une fenêtre d'édition, puis un CAS fige le périmètre CICDF, les sources, l'index et les références. Un commit supplémentaire avance la branche et déplace le tag avec leases exactes. Les reçus originaux sont conservés dans les événements immuables ; seuls les nouveaux effets admis et les étapes aval nécessaires s'exécutent. UNKNOWN, concurrence et divergences restent protégés.
