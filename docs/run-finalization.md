# Finalisation autonome sur preuves

## Cadrage

Chaque nouveau RUN reçoit un emplacement de contrat. Transmettre `finalization`
à `run.begin` / MCP run_begin. Sans contrat complet, CAB expose le manque et ne
transforme pas une archive en validation. `finalization.configure` autorise une
adoption explicite unique avant opération, revue ou gel ; les imports sont exclus.
Le contrat reste ensuite immutable. Les anciens RUN gardent leur protocole.

Exemple de contrat initial direct, pour le critère exact « Tests unitaires » :

```json
{
  "nature": "development",
  "checks": [{
    "id": "unit",
    "argv": ["/usr/bin/python3.13", "-B", "-m", "unittest", "discover", "-s", "tests"],
    "criteria": ["Tests unitaires"]
  }]
}
```

Les checks cadrés sont un minimum ; le codeur reste autonome pour les autres
essais dans son mandat. Ils déclarent argv exact, executor local/external et,
en externe, adapter_id approuvé. Les chemins sources cadrés ne doivent pas
inclure les dépendances régénérables et leurs liens. Toute modification de
source après un test rend sa preuve non suffisante pour la clôture.

## Provenance

Le moteur capture la fin réelle des opérations CAB dont argv et exécuteur
correspondent au contrat, avec reçu original, empreintes avant/après et portée
projet/RUN/SID/change/génération. Un départ refusé, UNKNOWN, échec ou source
modifiée reste non satisfait. Aucun parsing de texte LLM ni total de tokens ne
fabrique de résultat d'exécution. Un journal natif seul ne prouve pas une
commande qualifiée ; utiliser l'exécuteur CAB ou un producteur autorisé.

L'administrateur déclare un compte collector authentifié par
`evidence.producer.register` : producer_id, actor_id, project_id et kinds autorisés.
`evidence.producer.disable` révoque ce producteur. Le codeur ordinaire ne peut
pas attester. Les références sont des identifiants opaques, jamais des secrets.

Le contrat peut attendre des requirements : id, kind, producer, criteria et
artifact_group optionnel. Types : verification, publication, installation,
availability, service_end. `evidence.attest` exige producteur habilité, identité
complète, rule_id, evidence_id stable, résultat, source_revision et référence.
Une vérification réussie exige exit_code0 ; publication/installation/disponibilité
réussies exigent artifact_sha256. Les groupes d'artefacts doivent concorder. Un doublon
identique est idempotent, un contenu différent pour la même identité est refusé.
Une preuve commune peut garder la même référence sur plusieurs RUN explicitement
couverts ; aucune Operation ni statistique d'exécution n'est dupliquée.

Cette API ne dépend d'aucun outil de publication. Aucun adaptateur DIU n'est
ajouté ; les futurs composants Git/forges/CI utilisent le même protocole.

## Natures et décisions

- development : checks/preuves et archive unique complète du change requis.
- delivery : publication authentifiée requise, sans test de développement inventé.
- activation : installation et availability corrélées au même artefact.
- service : preuve explicite service_end ; inactivité et absence de tâches ne
  prouvent pas sa fin.

Le producteur interne cab-update accepte installation/availability d'un
SystemUpdate réellement OK, verified et corrélé à l'autorité du RUN. Déclarer
update_request_id et target_version dans le contrat initial. Le paquet/hash
vérifié vient du reçu système ; aucun nouvel installateur n'est lancé pour
qualifier ce fait. La révision contextuelle est conservée ; elle ne constitue
pas une attestation du commit ayant construit l'artefact.

En direct, les critères mécaniques sont validés selon la politique autorisée.
En piloté, review_required reste obligatoire. CAB assemble la soumission et
notifie le parent, qui décide la revue ; un dossier périmé n'est pas accepté.
Un rejet ne provoque pas de soumission répétée tant que les preuves restent
identiques. Ni submit ni une acceptation LLM simulée ne sont créés en direct.

## Automate et reprise

Le worker réévalue les dossiers au fil des reçus et au redémarrage.
FINALIZATION_PENDING expose les preuves manquantes ; FINALIZING bloque les
nouvelles opérations pendant les écritures finales. Maintenance, effets inconnus,
baux, exceptions ou suspensions restent protégés. Une fois le contrat satisfait,
CAB ferme la période du seul RUN sur un snapshot réel au temps de finalisation,
sans rétrodatation, puis génère/amende les statistiques locales maîtres et leurs
projections. Un composant sans change local ne reçoit pas de faux rapport local.

Le reçu kind=policy distingue cette validation mécanique d'une revue humaine ou
LLM. Il cite politique, preuves et artefact, puis conduit à CLOSED11/11 sans
commande finale du codeur. L'intention et le reçu survivent au redémarrage ;
une écriture statistique incertaine garde ses protections, sans rejeu d'exécution.

GET /finalization (project_id/run_id) et finalization_status exposent contrat,
preuves et manques. La page du RUN et l'icône Réévaluer consultent le même moteur.
Les STATISTICS.md restent produits et contrôlés par CAB, jamais par le LLM.
