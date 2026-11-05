## Restauration

- [x] Charger le registre malgré plusieurs accès actifs, sans libérer ni fusionner les leases.
- [x] Marquer chaque accès actif restauré comme protégé contre la réutilisation de `once`.
- [x] Conserver les conflits nouveaux en `WAITING` et permettre les accès disjoints.

## Qualification et documentation

- [x] Ajouter les tests positifs, négatifs et de redémarrage.
- [x] Mettre à jour OpenSpec, le protocole CAB, le changelog et les versions communes.
- [x] Exécuter les suites complètes et les validations OpenSpec strictes.
