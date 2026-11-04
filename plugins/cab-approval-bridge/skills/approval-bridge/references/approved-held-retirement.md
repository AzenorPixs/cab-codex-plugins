# Retirer une unité APPROVED avec accès HELD — CAB 2.2.31

## Décideur et choix de la voie

Dans le change et le mandat déjà autorisés, l’orchestrateur propriétaire
DOIT traiter lui-même le retrait d’une unité devenue obsolète. Il ne sollicite
ni le chat correcteur CAB ni le développeur pour appliquer une procédure
existante à une frontière prouvée. Une extension métier exige son autorité
applicable ; un effet incertain conserve ses protections.

| État observé | Voie applicable |
|---|---|
| Ancien retour PENDING | Relire `/decision/<requestId>/admission`, `/decision/<requestId>` et la corrélation ; conserver les mêmes identifiants. |
| Shell APPROVED refusé avant once, aucun accès lié | [shell approuvé sans accès](approved-shell-retirement.md) ; acquisition/clôture ordinaires conditionnelles. |
| PREPARED/APPROVED, aucun accès lié sans ce refus shell | `withdraw-unissued-validation`, selon [reprise autonome](autonomous-recovery.md). |
| PREPARED/APPROVED, accès HELD, aucune émission native | Clôture ordinaire de cet accès par `/locks/release`, `outcome: RECONCILED`, décrite ici. |
| WAITING ou STALE | `/locks/cancel`, selon ses gardes ; cette route ne retire pas HELD. |
| ISSUING, EXECUTING, UNKNOWN, intention sans ACK ou résultat manquant après émission | Réconciliation native qualifiée ; cette procédure de retrait avant émission est inadmissible. |

Une décision APPROVED est historique et ne devient pas REJECTED. La clôture
annule la coordination non commencée ; elle ne prouve ni une édition réussie
ni NO_EFFECT. Aucun nouveau type d’action recovery/policy ou argument `/CAB`
n’est introduit : `/locks/release` reste sa route ordinaire, soumise à ses gardes.

## Vérifications fraîches avant décision de retrait

1. Lire le job et l’admission ciblée : même propriétaire, RUN, contexte,
   version, job, change et SID. Un compteur actif nul ou READY ne supprime
   pas une approbation durable. Comparer la date du signalement aux preuves
   actuelles ; ne pas déclarer une panne à partir d’un PENDING périmé.
2. Examiner l’unité exacte, son accès et **toutes** les sous-opérations liées.
   Pour le présent cas, elles sont PREPARED/APPROVED, sans entrée native,
   nativeResult, intention ou ACK de once. Une présence native ambiguë ne se
   transforme pas en absence d’effet. Vérifier les ressources, les révisions
   et les preuves natives nécessaires ; ne pas modifier le payload approuvé.
3. Fermer le mandat courant par son compte rendu puis `/job/progress`, avec
   `currentCabMandate: ""`, avant la libération. Vérifier le même SID natif
   idle et zéro permission en attente avec le client CAB authentifié.
   L’absence d’outil MCP CAB dans Codex ne prouve pas une panne : utiliser
   les interfaces disponibles décrites dans [interfaces](protocol-interfaces.md),
   sans exposer de credential. Une capacité réellement absente se rapporte
   précisément ; elle ne justifie aucun contournement.
4. Consigner la décision de retrait, son motif métier et les références de
   preuves dans le checkpoint déjà autorisé. Ne pas recopier de jeton.
   L’orchestrateur reste responsable de la revue ; le contrôleur applique
   les gardes techniques à la réception, sans décision métier automatique.

Si l’accès contient une autre opération exécutée ou incertaine, ne pas le
libérer globalement comme s’il ne concernait que l’unité obsolète. Suivre
sa réconciliation complète, ou conserver la protection et poursuivre un
travail disjoint autorisé. Ne pas déplacer le RUN, la session ou un bail de
test pour contourner cette frontière.

## Clôture de l’accès par son propriétaire

Résoudre `GET /runs/<run>/locks` dans un processus local autorisé. Cette
réponse peut contenir un token : ne jamais afficher sa sortie brute au modèle,
le mettre dans une commande, un journal ou un checkpoint. Ne restituer que
les identités, états, ressources, révisions et fencing utiles. Le processus
local consomme le jeton détenu de **cet accès précis**, sans le transmettre.
Si le token est perdu ou la frontière restaurée/divergente, suivre la voie
applicable dans [concurrence](concurrent-runs.md) ; ne pas fabriquer un token
ni reconstruire une acquisition historique à partir d’un simple GET.
`/locks/reconcile` et `/locks/reconcile-restored` conservent un accès HELD
avec renouvellement de ses preuves/jeton ; ils ne remplacent pas la clôture
RELEASED par `/locks/release` décrite ici.

Le propriétaire émet `POST /runs/<run>/locks/release` avec :

```json
{
  "version": 123,
  "operationId": "accessId-existant",
  "token": "<jeton consommé uniquement par le processus local>",
  "fencing": 456,
  "outcome": "RECONCILED",
  "evidence": ["références réelles du retrait et de la frontière examinée"]
}
```

Ici `operationId` désigne l’**accessId**, pas nécessairement l’operationId de
la validation. Utiliser les valeurs courantes ; ne pas reprendre celles d’un
exemple ou d’un ancien message. Conserver le payload exact uniquement dans
le traitement privé autorisé le temps de sa vérification/reprise.

Le contrôleur refuse un mandat courant non clos, une session non quiescente,
une permission ou des fins natives non prouvées. Il contrôle version, token
et fencing. La clôture interdit ISSUING/EXECUTING/UNKNOWN ; elle passe les
sous-opérations PREPARED à CANCELLED, libère l’accès et invalide les réponses
exécutables locales. APPROVED reste enregistré. Aucun once, prompt, résultat
natif ou résultat métier n’est créé. Les autres accès et baux restent protégés.
Une nouvelle erreur exacte s’instruit ; elle ne se contourne pas en changeant
outcome, SID, identifiants ou état privé.

## Vérification, réponse perdue et reprise du travail

Relire l’opération, l’accès et la décision. Exiger CANCELLED, accès RELEASED
avec outcome RECONCILED, ancienne décision APPROVED conservée, sans nouvelle
entrée native/once/nativeResult. Pour une unité jamais commencée, la clôture
seule n’avance pas la révision du fichier ; observer les révisions fraîches
avant toute nouvelle édition. Ne pas déclarer le retrait réussi sans preuve.

Après réponse perdue, lire les états autoritaires. Un rejeu utilise seulement
le même payload privé et le même fencing ; un état déjà clôturé ne justifie
ni nouveau requestId ni deuxième effet. Si le payload exact n’est plus
accessible, ne pas le réinventer : distinguer l’état observé vérifié d’un ACK
HTTP absent et diagnostiquer la seule preuve manquante.

Une correction documentaire puis la reprise de l’ancien travail utilisent
chacune une **nouvelle unité** : contenu examiné, identifiants neufs,
empreintes et révisions relues, décision, accès et permission propres. Ne
jamais réémettre l’ancien requestId/approvalId pour changer son contenu.
Le retrait ne valide pas une adoption métier ou un nouveau périmètre. Les
instructions développeur actuelles gouvernent la correction documentaire.

## Qualification et limites de diagnostic

La frontière PREPARED/APPROVED + HELD a été qualifiée sur un registre isolé :
RECONCILED produit CANCELLED/RELEASED, conserve APPROVED, sans entrée native,
ni once, ni nativeResult, ni changement de révision. Cette preuve ne remplace
pas la revue du RUN réel. Un registre de décision et son recordedAt ne
permettent pas, seuls, d’attribuer l’approbation à un utilisateur ou un chat.
Ne pas confondre émetteur identifié, décision historique et autorité métier.

Shell refusé avant once attaché à un parent HELD : [retrait ciblé](approved-attached-shell-retirement.md). Conserver le parent et ses autres effets.
