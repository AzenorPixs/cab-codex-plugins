# Contexte portable après changement de PLLM ou de compte — CAB2.1.21

## Règle permanente

Lors d’un changement de PLLM ou de compte, ne plus renvoyer au nouveau contexte fournisseur les anciens blocs de raisonnement chiffrés et les métadonnées fournisseur associées. Préserver les messages enregistrés, textes utiles, contrats d’outils, RUN/job/SID et décisions. Le traitement porte sur la requête projetée ; aucune donnée chiffrée n’est déchiffrée, affichée, analysée ou réécrite. Les réponses nouvelles du compte cible restent intactes.

Le hook natif2.2.0 session.context rend ce traitement possible à chaud. Le module CAB sans dépendance cgpt-approval-bridge-context-portability.mjs fournit validatePortabilityRules et createContextPortabilityPlugin. Les hooks generate et compaction appliquent la même portée aux demandes auxiliaires ; ils ne déclenchent aucune génération, compaction ni tâche. La limite du seul contrat HTTP2.1.20 est conservée dans account-bound-history.md ; cette extension native qualifiée permet désormais la reprise au même modèle.

## Préparation par le propriétaire

1. Confirmer la demande de changement/reprise, le choix exact et la connexion opaque active. En mode2, conserver Muse/medium et le compte2, sans nouvelle PLLM ou choix alternatif implicite.
2. Sous PAUSE et deny, vérifier quiescence, absence d’effet/permission en attente, mandats et checkpoint ; préserver toute ancienne once et écriture acquise. Ne pas recopier la clé : seule integration.connection.active est utilisée par le hook, jamais resolve.
3. Lire le contexte natif avec le processus local et ne restituer que les identifiants assistant, les types et compteurs utiles. Ne pas afficher ni examiner les valeurs native/providerMetadata. Établir la liste fermée des anciens messages à la frontière de transition ; ne jamais y ajouter les réponses nouvelles de la cible.
4. Vérifier la version/PID du serveur et la découverte native des répertoires de plugins du workspace. Préserver les plugins existants. Préparer un répertoire dédié hors de l’arbre découvert, avec les deux fichiers décrits ci-dessous, puis le promouvoir atomiquement dans un répertoire natif plugin/plugins observé. Le module est chargé/rechargé à chaud ; aucun restart/dispose d’OpenCode n’est requis.

## Module installé et règles non secrètes

Le paquet natif dédié contient package.json avec name=cab-context-portability, type=module et exports=./index.js. index.js reprend exactement le module distribué puis ajoute une seule déclaration :

```js
export default createContextPortabilityPlugin({
  schemaVersion: 1,
  expectedPid: /* PID du serveur réellement observé */ 12345,
  rules: [{
    sessionId: 'ses_example',
    providerID: 'provider-example',
    modelID: 'model-example',
    connectionId: 'cred_example',
    staleMessageIds: ['msg_example']
  }]
});
```

Ces valeurs sont des exemples, jamais des cibles par défaut. La préparation locale valide les règles avec validatePortabilityRules avant génération, sans secret. Conserver les empreintes source/module et les permissions de lecture nécessaires au compte du serveur ; aucun droit hôte ou fichier de credential n’est changé. Les règles sont limitées à32 sessions et8192 messages par session, sans doublon. Chaque propriétaire ne prépare que ses identités ; coordonner une éventuelle promotion commune pour ne pas écraser la règle d’un pair.

Le hook ne correspond qu’au SID/fournisseur/modèle ciblés et vérifie la connexion opaque à chaque appel. Une connexion différente bloque la requête ciblée avant appel fournisseur, sans envoi des anciens blocs ni bascule automatique. Une autre session ou un autre modèle reste inchangé. Les anciennes parties reasoning sont omises ; les autres parties conservent leurs champs fonctionnels et perdent seulement providerMetadata dans la projection. Les objets natifs source restent intacts.

## Contrôle avant reprise

Vérifier GET /api/plugin : plugin ciblé réellement actif, sans diagnostic d’échec. Relire modèle, connexion, PID et frontière. Dans le SID historique, envoyer un échange texte seul sous deny qui reprend le checkpoint exact et interdit tout outil. Observer une nouvelle réponse assistant achevée sans erreur, modèle/medium exacts et zéro nouvel outil ; un ancien dernier message ne prouve pas cette réussite. Comparer les enregistrements historiques et contrats utiles sans exposer les métadonnées opaques.

Seulement après cette preuve, conduire le prévol CAB neuf puis RESUME et les unités déjà autorisées. L’installation du plugin, CABU et une sonde neuve ne suffisent pas. Si la connexion ou le processus change, préparer une règle fraîche à la frontière correspondante ; ne pas élargir aveuglément la liste. Un échec conserve PAUSE et preuves, sans retry aveugle. Un retrait ciblé du plugin ne modifie pas l’histoire mais peut rétablir le refus si l’ancien contexte est encore utilisé.

Le banc privé2.2.0 qualifie même modèle/compte cible/SID/PID, ancien historique conservé, suite d’échanges et isolation du pair. Les outils restent soumis à CAB et ask/once ; aucun hook de permission ou d’exécution n’est enregistré par cette extension.
