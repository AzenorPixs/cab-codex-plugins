## Reprise de déploiement

- [x] Reconnaître uniquement le reçu exact `ROLLBACK_FAILED` dû à `update-controller-start-unconfirmed`.
- [x] Vérifier identité, version publiée et empreintes avant de sceller ce reçu comme superseded et d’ouvrir la reprise liée.
- [x] Garantir l’absence de rechargement global OpenCode et de lecture/écriture des RUN lors de la reprise.

## Compatibilité du registre

- [x] Normaliser les reçus de rejet 2.1.67 vers les champs compatibles antérieurs, sans perdre l’empreinte.
- [x] Écrire les nouveaux rejets dans le schéma déjà accepté par la brique de rollback.

## Qualification

- [x] Ajouter les tests positifs, négatifs, d’idempotence et de redémarrage.
- [x] Mettre à jour OpenSpec, le protocole CAB, le changelog et les versions communes.
- [x] Exécuter les suites complètes et les validations OpenSpec strictes.
