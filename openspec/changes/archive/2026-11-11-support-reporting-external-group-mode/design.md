## Frontières

Le reporting et les états locaux et distants acceptent les permissions de
groupe sans accès pour les autres comptes. Les fichiers d'hôtes connus
acceptent l'écriture par le groupe mais pas par les autres. Les contrôles
d'identité, de type, d'intégrité, de liens et de non-rejeu restent applicables.
Les fichiers existants ne sont pas normalisés ; les nouveaux fichiers et
répertoires créés dans ces périmètres sont en 0770 malgré l'umask.
