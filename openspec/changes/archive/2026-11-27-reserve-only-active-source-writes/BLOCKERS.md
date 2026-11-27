# Dépendances non satisfaites

RUN : CAB-WRITE-ONLY-FILE-LEASES-20261127

- CAB 3.48.0 ne peut produire la preuve de qualification sans réserver les fichiers lus. Le correctif dans les sources doit être exécuté par un moteur de qualification respectant le verrouillage limité aux écritures.
- Les 82 tests PostgreSQL et le contrôle Bubblewrap ont réussi hors du démon installé. Le contrat exige un reçu CAB sur la révision du RUN pour sceller la clôture réussie.
