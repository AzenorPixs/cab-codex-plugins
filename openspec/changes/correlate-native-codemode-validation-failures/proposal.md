## Why

Le normaliseur V2 marque `nativeMcpError` lorsqu'un wrapper CodeMode contient
un unique `request_validation` littéral exact dont l'appel MCP a échoué. Le
contrôleur `verifyNativeValidation` n'accepte ensuite que les parties `running`
ou `completed`, et refuse cette preuve exacte comme `native-validation-not-correlated`.
Le broker garde alors une demande `PENDING` avec notification en échec et la
clôture ultérieure en `NOT_ADMITTED`, sans permission native.

## What Changes

Permettre au contrôleur de corréler uniquement une partie CodeMode normalisée
portant le marqueur interne `nativeMcpError`, dont `request_validation` et
l'identité complète correspondent exactement à la notification reçue. Cette
correlation ne vaut ni décision, ni permission, ni once, ni rejeu ; les autres
erreurs ou divergences restent refusées. Une approbation déjà `NOT_ADMITTED`
reste terminale ; une reprise métier exige un nouvel identifiant.
