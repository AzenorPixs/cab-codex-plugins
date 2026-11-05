# Confirmer un contrôleur arrêté sans attendre un état systemd unique

Code de lot : code non attribué ; attribution ACL ultérieure.

## Why

CABU 2.2.2 a corrigé la perte du helper : le transfert réel est SEALED.
L’ancien contrôleur termine toutefois avec le code 78 (arrêt déclaré
incomplet) ; MainPID=0 et ActiveState=failed. L’attente exclusive de inactive
fait expirer le certificat et produit update-controller-shutdown-unconfirmed.

## What Changes

- Reconnaître la fin réelle avec MainPID=0 et état inactive ou failed.
- Garder le stop du groupe, l’adoption obligatoire et le repli existants.
- Tester cette frontière et distribuer 2.2.3 sous SCM, publication et CABU.

## Capabilities

### Modified Capabilities
- `codex-integration-distribution`: confirmation de la fin du principal.

## Impact

Predicate d’attente CABU, fixture de service, versions et documentation.
Aucun RUN ou bail Pixs modifié ; aucun état terminal métier inventé.
