# Qualification source2.4.2

Code non attribué. Mandat permanent SCM/CI-CD pour remédiation C12/PA01 ; même transaction, protections conservées, incrément puis publication/CABU.

## Tests et observation

81cas ciblés réussis, aucun skip :54unitaires,16intégrations,3propriétaire dont deuxUID réels avec le broker publié2.4.0,5gros reçu/marqueur,3listes historiques. Preuve output/scm-cab-242/vital-final.tap.84fichiers syntaxiquement vérifiés dont17Python compilés (syntax.json). Pas de campagne générale.

Les tests couvrent : suppression exacte dans onceAcknowledged/restoredAccesses, conservation de l’ordre des pairs et des booléens, rejet d’une simple référence par préfixe, digest de transfert réancré, récupération STOPPING sans projection ni rollback, refus après application et contrôle uniforme des versions/PID.

Qualification réelle en lecture seule : signature/liaisons/clôture C12 valides, owner APPLIED, même transaction erasure-8bf1e6c3-15cc-48ae-8c2a-a501f4bec290. L’inventaire global avec le codec corrigé produit47candidats sans référence non classée. Les deux copies d’inventaire de migration portent chacune75requestIds C12 ; l’ancien transfert porte1accessId. Aucune donnée réelle n’a été modifiée par la qualification.

## Continuité et limites

Après le refus précédent avant projection, les services2.4.0 ont été rétablis (controller794817, supervisor795307, monitor795308) et le broker reconnecté, OpenCode10912 inchangé. Le reçu reste STOPPING sans entries/expectedPeers ; le codec2.4.2 ne transforme pas ce constat en PURGED. recover-preparation doit vérifier les identités et recapturer les PID avant reprise, avec runtime2.4.0 déclaré. Les points d’entrée compatibles sont conservés depuis le paquet publié et vérifié ; aucun ancien état métier n’est restauré.

Le transfert SEALED peut rester non adopté jusqu’à l’application du plan et la vérification finale. Le bail PA01 reste détenu avec sa réconciliation explicite nécessaire après redémarrage ; aucune commande LXC n’est rejouée. L’atelier Node est opérationnel ; le runtime Python/Cython non exposé est une autre entrée CCAB, hors de ce correctif.

Le rapport SGS utilise le service permanent et la vraie session Codex. Sa borne précède publication/activation. Les reçus opérationnels prouveront séparément recovery, certificat/PURGED, CABU global et résolutions CCAB.
