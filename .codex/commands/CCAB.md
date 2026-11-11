---
description: Consulter, déclarer ou traiter les incidents CAB
version: 2.7.0
---

Charger le skill CCAB du plugin CCAB de même version que CAB.
Argument : `$ARGUMENTS`. Sans précision, consulter la file ; ne pas inférer
un mandat de correction. Lorsque le développeur désigne cette session pour
traiter CCAB, réserver par FIFO ou lot justifié, coordonner les déclarants
autorisés et suivre SCM/version/CI-CD/CABU pour tout correctif.
La coordination utile entre déclarant et correcteur CCAB désigné est
autorisée par le développeur même entre projets, sans redemande par échange ;
vérifier les identités et les permissions techniques, sans transmettre de secret.
Conserver les reçus et les protections des RUN ; aucune relance d’effet incertain.
Pour une ancienne outbox aux preuves invalides, suivre la correction ciblée du
skill CCAB et vérifier l’acquittement avant de purger l’entrée centrale.
Une entrée traitée sans correctif se solde en `no-fix` avec justification et
limites ; cette clôture ne signifie pas que les données concernées sont réparées.
Après réponse vérifiée et clôture, nettoyer l'entrée traitée sans attendre
les autres ; CCAB n'est pas une archive.
Sur demande explicite, la purge globale atomique est refusée si une entrée
reste non traitée ; elle ne modifie pas les RUN ou leurs accès.
