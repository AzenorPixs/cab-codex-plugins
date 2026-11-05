# Permissions natives après revue ou maintenance — CAB2.1.29

## Origine et responsabilité

Une revue peut légitimement laisser shell/edit deny dans la session historique. CABU ne modifie ni ne restaure ces règles. Un contrôle d’inactivité, de modèle, de requests ou de ressources ne prouve pas que les règles nécessaires sont ask. Le refus native-permission-ask-required est une garde correcte, pas une permission manquante à contourner. Distinguer freeze de revue, arrêt explicite, récupération et politique restrictive d’origine inconnue.

Le propriétaire consigne chaque PATCH de politique : raison/mandat, RUN/job/SID/répertoire, PID, empreinte avant/après, seuls droits changés et fin de revue prouvée. Les règles natives et le checkpoint doivent être relus avant la reprise. Ne pas réécrire l’historique ni déduire la cause d’un ancien booléen de gel ou d’un redémarrage proche. Les traces de commandes et empreintes avant/après départagent l’origine.

## Contrôle avant l’envoi

Le client installé fournit nativePermissionPolicy(sessionId,{directory,requiredNativeAsk:['shell']}) en lecture seule. Son résultat contient snapshot_only:true, l’empreinte de politique, les actions effectives/indices/portées universelles pour les exigences et missing/ready ; aucun corps ou règle brute. ready est seulement l’observation des exigences nommées, sans qualification des autres règles ni autorisation. Le PID/modèle/job et les demandes/accès restent contrôlés séparément.

Tous les nouveaux prompts qui vont soumettre un prévol ou un mandat permissionné doivent porter l’exigence structurée :

```javascript
await client.prompt(sessionId, mandatCompletRevu, {
  directory: repertoireDuJob,
  requiredNativeAsk: ['shell'],
});
```

Pour write/edit, utiliser ['edit'] ; seulement si les deux sont nécessaires au mandat, ['shell','edit']. Ne pas inférer ces droits du texte du prompt. Les seuls noms admis sont shell/edit, sans doublon ni liste vide. Une ancienne règle bash ask seule ne suffit pas pour le shell natif V2. La commande /usr/bin/true exige shell ask ; elle n’exige pas d’ouvrir edit. Le POST vise le même SID/répertoire que le contrôle. Un modèle explicitement changé dans ce même appel reste soumis à une nouvelle vérification de politique avant prompt.

En cas de deny, allow, absence, portée insuffisante ou contexte divergent, le client refuse AVANT prompt/MCP, sans PATCH, once ou restauration implicite. opencode-native-permission-ask-required comporte la politique filtrée observée pour le diagnostic. Une option invalide produit opencode-native-ask-requirement-invalid. Le contrôleur conserve indépendamment sa garde à l’admission, à la décision et à once : une modification après l’observation ne devient jamais un droit.

Les prompts sans requiredNativeAsk gardent leur compatibilité pour revue/proposition sans outil ou diagnostic. Cette omission ne doit pas être utilisée pour contourner le contrôle avant une demande permissionnée. nativeCodingMandate ne remplace pas cette option structurée : il prépare du texte, pas une preuve de permissions.

## Sortie du gel de revue

Un refus client sans envoi ne crée aucune demande à annuler. Ne pas resoumettre sous un autre outil ou lever automatiquement deny. Si une demande avait déjà été envoyée, son propriétaire réconcilie la même approval et les effets réels avant nouvelle identité, sans replay.

Pour sortir d’un gel de revue identifié, vérifier son achèvement, l’inactivité du seul SID, l’absence de permission/action/accès non réconcilié et le mandat de poursuite. Le propriétaire prépare puis applique explicitement le seul changement nécessaire avec l’API native existante. Exemple de portée : shell passe de deny à ask pour un prévol ; edit/subagent/skill restent deny. Ce n’est pas un profil universel à recopier : conserver les autres règles et leur ordre, et faire arbitrer les restrictions spécifiques/contradictoires ou une origine inconnue. Ne jamais transformer un refus de sécurité, une révocation ou une pause en autorisation automatique.

Relire la politique et son empreinte, vérifier les autres protections et le modèle inchangés, puis appeler prompt avec requiredNativeAsk. Une écriture ultérieure exige son propre contrôle edit ask et son mandat distinct. Les décisions CAB, ressources/révisions, accès, empreinte d’entrée, once et fin native restent obligatoires. Aucun helper nouveau n’accorde allow, ne modifie une autre session ou ne donne un GO métier.

## Après CABU

Le reçu d’activation prouve les briques, pas le mode de permissions de la session. Chaque propriétaire effectue ses réconciliations/prévols et ce contrôle avant nouveau mandat. Ne pas imputer un deny à CABU sans traces ; ne pas restaurer une politique ancienne pour faire passer le prévol.
