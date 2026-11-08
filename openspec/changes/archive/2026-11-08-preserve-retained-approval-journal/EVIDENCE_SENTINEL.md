# Reprise C08 — portée et sentinelle

Le reçu `erasure-65145989-873a-4b1f-b6ca-fb3be05c645c` est resté en
`STOPPING` après un refus `erasure-owner-effective-scope-divergent`. La lecture
vérifiée du reçu montre un propriétaire `APPLIED`, le même workspace, le même
change et les mêmes RUN. L’unique identité absente de la portée effective est
la chaîne sentinelle `null`, qui ne désigne pas une identité.

Le test d’intégration synthétique de la reprise sur le même reçu vérifie que
cette sentinelle est ignorée et qu’un RUN pair reste conservé. La correction
n’est pas encore publiée ni activée ; la reprise réelle reste à vérifier.
