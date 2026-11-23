# Protocole de vérification

Rattacher le propriétaire non administrateur au RUN direct de test. Vérifier
que le chemin témoin est initialement absent et hors cadrage. Enregistrer la
demande d’extension, puis l’autorisation du développeur pour ce seul chemin
depuis le connecteur rattaché. Vérifier l’événement CAB et l’absence du chemin,
puis clôturer sans livraison et conserver les reçus avec le dossier archivé.

## Résultat du nouveau passage

Le RUN `SCM-DCAB-VERIFY-DIRECT-AUTHORITY-20261121-01`, génération 1, est
rattaché au connecteur du propriétaire direct `codex-1000-orchestrator`.
L’événement CAB 6050 approuve uniquement le chemin témoin
`docs/dcab-direct-framing-verification-retest-20261121.md`, qui ne figurait
pas dans le cadrage précédent. Le contrôle local exécuté dans CAB a réussi
et confirme que ce chemin et tout lien symbolique sont absents
(opération 887, `dcab-retest-path-absent-before-archive`).
