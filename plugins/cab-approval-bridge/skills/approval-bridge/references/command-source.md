# Lecture source — CAB 2.2.9

## `/CAB source`

Utiliser ce sous-ensemble uniquement pour un mandat de lecture explicite du
RUN existant. Le script distribué
`~/.local/share/cab-approval-bridge/cgpt-approval-bridge-source-read.mjs`
appelle le contrôleur local, qui dérive la session et la location du job armé,
puis lit par les routes filesystem natives OpenCode V2. La session doit être
idle, sans permission native, mandat, opération ou effet en cours.

La commande accepte une seule opération parmi `read`, `list` ou `find` et
transmet l’identifiant exact du RUN. `read` exige un chemin relatif exact ;
`list` et `find` ne retournent que des chemins relatifs. Les chemins absolus,
traversées, sources protégées/exclues, sessions divergentes et réponses
excessives sont refusés. La lecture de fichier est limitée à 1 Mio par défaut,
2 Mio au maximum ; le résultat inclut sa taille et son SHA-256. Ce mécanisme
n’exécute aucune commande dans le projet, ne crée pas de permission et ne
modifie ni le RUN ni ses sources. Ne l’emploie pas pour contourner un refus de
lecture ou pour lire un fichier exclu ; une API native absente garde le RUN en
attente et sa cause est rapportée.

Invocations du helper pour le RUN ciblé :

```text
node ~/.local/share/cab-approval-bridge/cgpt-approval-bridge-source-read.mjs --run-id <run_id> --operation read --path <relative_file>
node ~/.local/share/cab-approval-bridge/cgpt-approval-bridge-source-read.mjs --run-id <run_id> --operation list [--path <relative_directory>]
node ~/.local/share/cab-approval-bridge/cgpt-approval-bridge-source-read.mjs --run-id <run_id> --operation find --query <text> [--type file|directory] [--limit <1..200>]
```

Le helper affiche un JSON filtré. Pour `read`, le champ `content` est le
contenu obtenu par OpenCode V2 ; conserve son `path`, son `sha256` et le RUN
corrélé comme preuve de lecture. Ne transforme pas ce résultat en commande,
permission ou modification sans mandat séparé.
