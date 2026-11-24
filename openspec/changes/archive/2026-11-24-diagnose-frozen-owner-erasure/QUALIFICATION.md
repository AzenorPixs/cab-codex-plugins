# Qualification du 24 novembre 2026

Le 8 novembre 2026, le diagnostic a identifié un refus de projection sur le
reçu `erasure-65145989-873a-4b1f-b6ca-fb3be05c645c`. La
[correction de l'interprétation](CORRECTION.md) explique pourquoi un répertoire
relatif ne permet pas d'attribuer l'approbation à un autre projet. Les preuves
originales et leur correction sont conservées.

La preuve historique ultérieure
`openspec/changes/archive/2026-11-08-preserve-retained-approval-journal/EVIDENCE_SENTINEL.md`
atteste que le propriétaire était `APPLIED` pour le même reçu, alors que la
transaction globale restait en `STOPPING`. Aucun reçu de clôture du lot n'a
été retrouvé dans les sources consultées. La consultation courante du chemin
par défaut du compte et des incidents accessibles dans CAB n'a pas fourni
d'état terminal pour ce reçu.

Le diagnostic ouvre le verrou d'autorité existant en lecture seule, en
conservant son exclusion mutuelle avec la mise à jour. Un verrou absent
provoque un refus sans création de fichier. Le canal entre UID distincts
exige un groupe admissible pour les deux comptes et vérifie toujours le PID
et l'UID de l'émetteur auprès du noyau. La socket utilise le chemin sous
`/tmp` qu'attendent le lanceur et le broker, y compris lorsque l'atelier
définit un autre répertoire temporaire.

Sur l'hôte, les suites `owner-cleanup`, `owner-rebind-compat` et
`change-erasure-integration` ont exécuté 51 tests avec succès, dont les
trois essais à deux UID réels. Les fixtures couvrent la lecture seule,
la conservation des références étrangères et la reprise du même reçu.
La syntaxe des modules modifiés, la compilation du script Python et la
validation stricte du delta OpenSpec ont réussi. Le reçu historique a
uniquement fait l'objet d'une consultation d'état.
