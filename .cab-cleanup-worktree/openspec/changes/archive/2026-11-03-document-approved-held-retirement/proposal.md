# Retrait autonome APPROVED avec accès HELD — CAB 2.2.15

Code non attribué ; attribution ACL ultérieure.

## Why
L’orchestrateur a confondu le retrait sans accès et la clôture d’un accès
HELD avant émission, puis sollicité le correcteur pour une voie déjà supportée.
Un ancien PENDING avait aussi masqué une décision APPROVED déjà enregistrée.

## What Changes
Référence canonique conditionnelle, routage skill/commande/plugin et cadrages :
le propriétaire examine sa frontière et emploie locks/release RECONCILED,
sans escalade dans son mandat. La documentation distingue les gardes,
l’absence d’effet d’une absence de preuve, les jetons privés, le rejeu et
les nouvelles unités. Aucun changement de route, de garde ou d’effet natif.
Version homogène 2.2.15, publication puis CABU et information des pilotes.
