# Conception

Les clés existantes privées restent lisibles. Un fichier régulier unique de 32 octets appartenant au processus ne peut accorder aucun droit aux autres comptes. Si des droits de groupe existent, le groupe doit être celui du répertoire parent appartenant au même utilisateur et auquel le processus appartient. Les liens symboliques restent interdits. Les clés nouvelles sont créées en 0770 indépendamment du umask, avec synchronisation et sans divulgation.

DIU normalise uniquement les fichiers HMAC du répertoire de journal CAB en 0770 ; les autres chemins conservent leurs règles. Une normalisation antérieure en 0775 reste refusée tant que DIU n'a pas appliqué la correction.
