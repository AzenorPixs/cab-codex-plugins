# Cadrage et récupération de prévol CAB

## Contester une réussite non probante

Une réussite courante reste protégée contre `finalization.revise_check` ordinaire.
Si elle ne mesure pas le critère (par exemple zéro test découvert), seule une
contestation administrative explicite est admise :
`cab call finalization.contest_check --admin`, avec `project_id`, `run_id`,
`request_id`, `expected_policy_digest`, `check_id`, `operation_id`, `evidence_id`,
`expected_evidence_digest`, `expected_receipt_digest`, `argv`, `reason` et
`authorization`. Utiliser les identités et empreintes des preuves réelles.
Le pair administrateur est authentifié ; le codeur ne se substitue pas à lui.

CAB conserve la preuve et le reçu d'origine, journalise leur exclusion et ne
change que l'argv et la révision du contrôle. Aucun test n'est lancé. Une preuve
nouvelle à cette révision est obligatoire. Conserver le même request_id pour
consulter le même résultat après réponse perdue ; un conflit ou une empreinte
périmée impose de relire l'état, jamais de contourner la protection. Effets
indécis, baux, gel, import, revue et clôture restent bloquants. Une source périmée
est refusée : ne jamais modifier la source pour rendre une ancienne preuve fraîche.

`native.bind` distingue `bound` (journal natif) et `connector_bound` (worker réel).
Seul le second, suivi d'un contexte Git effectif, prouve le rattachement Git.
Le service peut récupérer automatiquement un couple kernel authentifié sans
heartbeat : son état OBSERVED conserve versions/catalogue inconnus et ne prouve
pas une reconnexion complète après CABU. Un heartbeat réel adopte la liaison
en conservant son historique ; le LLM n'inscrit aucun processus fictif.

Avant toute opération ou preuve, `run.reframe_prequalification` peut corriger
administrativement `nature=delivery` si l'admission était `development` et une
publication déjà cadrée. Les critères transmis restent strictement identiques ;
checks, producteurs et revue sont conservés. Les empreintes de politique et de
cadrage attendues et l'autorisation explicite sont requises. Aucune transition
inverse ni correction après preuve n'est admise. Une erreur de nature ne justifie
ni un nouveau RUN de contournement ni une réécriture de source_revision.

Dans une livraison regroupée autorisée, CAB inclut lui-même les rapports générés
vérifiés des archives validées de la même session dont proposal.md et tasks.md
sont réservés et indexés dans le lot. Ne pas réserver ou éditer ces rapports.
Après `run.reconcile_archive`, les fichiers déjà réservés de ce même RUN sont
reconnus sous leur chemin relatif dans l'archive vérifiée. Les réserver à ce
nouveau chemin avant toute édition ; CAB refuse les sources encore présentes,
les archives ambiguës, les liens et les propriétaires concurrents.

## Contrat admis

`finalization` est un objet strict. Champs admis : nature, checks, requirements,
review_required, update_request_id et target_version. nature vaut development,
delivery, activation ou service ; un intitulé libre n'est pas une nature.

Chaque check admet seulement id, argv, criteria, executor (local/external) et
adapter_id (pour external). Chaque requirement admet seulement id, kind, producer,
criteria et artifact_group optionnel. Kinds : verification, publication,
installation, availability et service_end. Les champs evidence_expected et
reserved_review ne sont pas admis. Les criteria reprennent exactement les
chaînes du cadrage du RUN ; leur union doit couvrir tous ses critères.

Exemple pour un projet utilisant réellement unittest selon son DEVOPS.md :

```json
{
  "nature": "development",
  "checks": [{
    "id": "tests",
    "argv": ["/usr/bin/python3.13", "-m", "unittest", "discover", "-s", "tests"],
    "criteria": ["Les tests unitaires sont réussis."]
  }],
  "review_required": false
}
```

Le RUN de cet exemple doit contenir le critère exact « Les tests unitaires sont
réussis. ». Adapter les commandes aux outils réellement prescrits et présents ;
ne pas inventer pytest, manual-review ou une commande de publication comme test.
Le schéma accepté ne garantit ni l'exécutabilité des argv ni leurs autorisations.
En direct, pas d'orchestrateur fictif. En piloté, review_required reste true.

## Validation sans effet

Appeler finalization_validate(policy, criteria, mode) avant admission.
Il retourne valid, le contrat normalisé ou un code précis et les champs admis,
sans créer de RUN ni exécuter de commande. cab_contract expose le même schéma.
Si ce catalogue ancien ne fournit pas encore cet outil, le validateur installé est pur :

```python
from cab_platform.finalization_contract import validate
validated = validate(policy, criteria, "direct")
```

Utiliser le Python du paquet avec son PYTHONPATH installé. Cette validation ne
crée ni projet, ni RUN, ni preuve, et ne lance aucune commande. Les chemins cadrés
portent les sources nécessaires, sans node_modules, venv, secrets ni dépendances
générées. Conserver les objets d'identité retournés par project_register et
run_begin ; ne pas recopier les ID à la main.

## Refus et reprise

Un refus explicite finalization-fields-invalid, finalization-nature-invalid ou
finalization-criterion-invalid signifie que l'admission a été refusée. Vérifier
le projet canonique et l'absence du RUN, corriger le payload, puis admettre le
même RUN. Ce n'est pas un rejeu de travail. Une réponse perdue ou UNKNOWN exige
la lecture de l'état et interdit toute nouvelle émission indécise.

run_status not-found signifie qu'aucun RUN correspondant à ces ID n'est trouvé ;
ce n'est pas une panne générale du service READY. Vérifier aussi l'ID du projet.
Les refus ClientError sont exposés par les outils MCP sans erreur générique.

finalization_configure peut corriger un contrat au prévol sous son autorité,
avant toute opération, preuve, modification des sources, revue, gel ou import.
Les critères métier et la nature restent fixes ; une revue réservée ne peut pas
être supprimée. CAB conserve contrat et empreinte initiaux dans son événement.
Après cette frontière, finalization_revise_check ne corrige que argv, selon le
contrat en vigueur. Ne pas modifier SQL, créer un autre RUN pour contourner une
protection, ni exécuter un contrôle qui ne correspond pas au cadrage.

## Publication native

L'atelier local est isolé : il ne reçoit pas implicitement root, les profils de
forges, les sockets ou le réseau de l'hôte. Une CI/CD native n'est pas un check
local à exécuter dans cet atelier. Déclarer une requirement de kind publication,
avec un producer collector authentifié et autorisé pour ce projet.

L'administrateur prépare le producteur via actor.enroll et
evidence.producer.register ; son secret reste dans son profil local. Le codeur
reste autonome. Un programme natif de collecte exécute la publication autorisée
une seule fois, conserve intention et reçu, puis appelle evidence.attest avec
identité complète, artifact_sha256, référence du reçu et révision source réelle.
Le LLM n'atteste pas un succès à partir d'un ancien journal ou d'un simple récit.
Le codeur ne remplace pas une CI/CD manquante par un audit local de texte.
CAB reste agnostique de l'outil de publication. Un producteur absent bloque la
publication correspondante, pas la réalisation indépendante déjà cadrée.

### Identité du producteur et point d'entrée réel

Un producer_id enregistré est une identité habilitée, pas une commande installée,
un hook automatique ou un reçu de publication. L'enregistrement seul n'atteste
rien. Le point d'entrée commun est `evidence.attest`, appelé par le programme
natif sous son compte collector avec son propre profil CAB. Ne pas utiliser
--admin pour se substituer au producteur. Ne transmettre ni lire ses secrets
avec le modèle ; le Client installé les traite localement.

Le programme transmet l'identité exacte projet/RUN/SID/change/génération,
producer_id, evidence_id stable pour cette observation, rule_id, kind, result,
source_revision et reference opaque du reçu natif. passed pour une publication
exige artifact_sha256 réel et vérifié de l'artefact publié. Une réponse perdue
se réconcilie en lisant les preuves du même RUN ; un nouvel état observé utilise
une autre evidence_id et ne remplace jamais un reçu précédent.

Un programme de vérification peut constater l'état réel des forges et artefacts
à l'instant courant après une publication. Il ne doit pas prétendre avoir capturé
une ancienne commande non supervisée. Un build échoué après push du commit/tag
reste une livraison partielle ; la preuve de publication complète reste absente.
La reprise des étapes échouées appartient à l'outil de livraison et à son état
réel, sans déplacement d'un tag publié ni répétition aveugle d'effets acquis.
