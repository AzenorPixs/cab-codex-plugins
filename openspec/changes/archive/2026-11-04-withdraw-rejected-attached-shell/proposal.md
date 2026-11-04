# Retrait ciblé du shell refusé attaché — CAB 2.2.19

## Why
C12 conserve une sous-opération PREPARED/APPROVED refusée avant once, attachée à un accès HELD protégeant un effet antérieur. Le retrait sans accès est refusé et libérer le parent serait incorrect. Le staging suivant est bloqué par cette validation non consommée.

## What Changes
Étendre withdraw-unissued-validation aux shells avortés avec reçu reject ACK204 corrélé. Autoriser uniquement le retrait de la sous-opération attachée à un unique parent HELD du même RUN/contexte/version/SID, sans modifier le parent ni ses autres opérations. Conserver APPROVED, preuve et liens historiques. Double frontière stable, garde native tardive et reçu durable existants. Documentation ciblée et distribution 2.2.19.

## Scope
Contrôleur, preuves recovery, registre, offres recovery, tests et contrat distribué. Aucun changement métier Pixs, protection, once, critère produit ou permission native depuis ce chat. Aucun nouveau protocole ni dépendance. Code non attribué ; attribution ACL ultérieure.
