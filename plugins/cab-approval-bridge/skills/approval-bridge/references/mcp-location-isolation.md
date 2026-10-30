# Isolation des locations MCP — CAB 2.1.24

## Contrat

Un seul broker partagé appartient à la location serveur OpenCode, découverte
par GET /api/location sans en-tête ni paramètre directory. Les sessions de
codage gardent leur propre workspace. Ne pas confondre le répertoire client,
le workspace des services et la location du broker. Les chemins d’exemple
/workspace/main et /workspace/technical sont fictifs et configurables.

GET /api/info est global. sharedMcpDirectory() découvre et revérifie la
location, liée au PID. Une dérive de location au même PID bloque le contrôle.
mcp(), connectMcp(serverId), disconnectMcp(serverId) ne prennent aucun
workspace implicite. Un argument explicite égal à la location serveur reste
compatible ; un argument divergent produit
opencode-mcp-location-override-refused avant toute requête MCP. Il n’est plus
silencieusement ignoré. Le client request reste une interface bas niveau :
un appel ciblé peut initialiser un contexte natif, même avec GET. Ne pas
sonder arbitrairement des répertoires à la recherche d’un broker.

## Sondes temporaires sans contexte concurrent

Utiliser createProbeSession({title,model}) du client CAB courant. model est
obligatoire : reprendre exactement providerID, modelID et reasoning du codeur
lorsqu’il est défini. Le helper exige cgpt-validation connected, crée la
session dans sharedMcpDirectory et impose l’unique règle * / * / deny.
Aucun remplacement de directory, agent ou permissions n’est accepté. Un
changement de serveur pendant la préparation refuse la création de sonde. Le
workspace par défaut du client ne doit jamais devenir celui de cette sonde.
Une session jetable ne nécessite pas un workspace temporaire distinct.

Le retour expose id et directory. Fournir ensuite directory explicitement
aux appels prompt, messages, activeSessions et à la suppression. Exemple :

```javascript
const probe = await client.createProbeSession({ title: 'Sonde texte', model: codingModel });
await client.prompt(probe.id, 'Répondre brièvement sans outil.', { directory: probe.directory });
// Attendre sa fin native, examiner ses messages et refuser toute partie tool.
const rows = await client.messages(probe.id, probe.directory);
// Après examen et fin certaine, supprimer uniquement cette session technique.
await client.request('/api/session/' + encodeURIComponent(probe.id), {
  method: 'DELETE', query: { directory: probe.directory }
});
```

Vérifier la suppression, le maintien du broker connected et l’identité du
serveur. Ne pas conclure sur une session de codage active à partir du seul
état de la sonde. Une sonde incomplète est INCOMPLETE ; préserver la cadence,
les relèves manquées et la limite de retry du protocole applicable. Elle ne
déclenche aucune reconnexion, aucun benchmark PLLM ni changement de modèle.
Le deny des outils n’autorise pas une lecture de fichiers par le modèle ;
le prompt reste textuel et ne contient pas de contexte de travail ni secret.

## Récupération explicite d’un contexte concurrent

Ce parcours n’est jamais exécuté automatiquement par une sonde, un moniteur
ou l’updater. À une frontière autorisée, identifier le seul contexte
concurrent par les preuves déjà observées, et non par une exploration
créatrice de nouveaux contextes. Vérifier sessions concernées inactives,
permissions absentes, effets connus et aucun mandat en cours. Préserver les
RUN, réservations et once consommées.

Sous l’autorisation explicite de l’opérateur, utiliser les routes natives V2
avec client.request et query.directory exact :

1. POST /api/experimental/mcp/cgpt-validation/disconnect pour le seul contexte
   concurrent identifié ; contrôler la réponse et son statut disabled.
2. POST /api/experimental/mcp/cgpt-validation/connect pour sharedMcpDirectory ;
   vérifier la réponse, le broker connected et une readiness fraîche.
3. Vérifier le même PID serveur, l’absence de permissions parasites, la
   location concurrente toujours disabled et les identités du RUN conservées.

Les méthodes ordinaires connectMcp/disconnectMcp ne servent pas à forcer une
location étrangère. Ne pas supprimer de verrou, tuer de broker, disposer
l’instance ou redémarrer OpenCode. Une déconnexion réussie suivie d’un échec
de connexion reste une réparation partielle : conserver les preuves et
signaler l’échec sans annoncer READY ni rejouer une autorisation. Un effet
inconnu interdit ce parcours jusqu’à sa réconciliation.

## Qualification et activation

Les fixtures vérifient les requêtes réellement émises et l’absence de POST
sur erreur. Le banc natif privé crée et supprime une sonde au workspace
partagé depuis un client technique, sans outil ni remplacement du broker.
Il ne démontre pas la totalité du mécanisme interne de disposition après
longue inactivité sur toutes les versions OpenCode. La prévention est
qualifiée par l’absence de ciblage du workspace technique. Aucun scénario
nommant un projet consommateur n’est nécessaire.

La publication de 2.1.24 précède CABU. Les versions actives et la readiness
réelle sont vérifiées avant l’information des sessions ; aucune réparation
d’un RUN actif n’est déduite des tests ou de la mise à jour.
