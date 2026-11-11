# Administration CAB 3

Le service système unique `cab.service` utilise les droits root et démarre avec
la machine. PostgreSQL reste indépendant. L’installation neuve expose uniquement
le parcours Web d’initialisation sur le port 8790 ; le démarrage du service ne
crée pas la base CAB. La configuration privée est `/etc/cab/cab.json` (root, 0600,
répertoire 0700). Les configurations existantes doivent être conservées.

## Journal système

Les composants API, superviseur, workers et Electric émettent dans journald.
Les entrées structurées portent le composant, le niveau et, lorsqu’ils sont
disponibles, `project_id`, `run_id`, `request_id` et un code de diagnostic.
Les priorités journald correspondent aux niveaux de CAB. Les sorties de tests,
corps de requêtes et prompts ne sont pas des messages du journal système.

Dans la configuration existante, ajouter ou modifier seulement la propriété :

```json
{"logging": {"level": "INFO"}}
```

Niveaux acceptés : `DEBUG`, `INFO` (défaut), `WARNING`, `ERROR`, `CRITICAL`.
Après modification atomique du fichier, appliquer avec :

```sh
sudo systemctl reload cab.service
sudo journalctl -u cab.service -b --since '10 minutes ago'
sudo journalctl -u cab.service -f
sudo journalctl -u cab.service -p warning
```

Le rechargement par SIGHUP applique le niveau au superviseur et à l’API sans
redémarrer les processus, RUN ou connexions Electric. Une valeur invalide est
refusée et conserve le niveau précédent. Les secrets configurés, en-têtes
d’authentification et URI avec mot de passe sont expurgés. Même en DEBUG, les
traces SQL et les journaux HTTP contenant les corps ou chaînes de requête restent
désactivés. Les erreurs incluent classe et positions de pile sans variables ni
message SQL. Le stockage et la rétention des journaux suivent la politique
`journald` de la machine ; les reçus durables des opérations restent en base.

## Comptes et reprise historique

Les profils des clients sont séparés par agent dans ~/.config/cab/codex.json
et opencode.json, privés0600. Le compte est résolu par UID, y compris root ;
les identités d’agents ne donnent pas de privilège système. Les intégrations
préparées par CABU sont enrôlées lors du premier parcours Web, après migration,
sans collecte ou RUN avant cette validation. Les intégrations natives se
configurent avec `sudo cab integrate codex --user <compte>` ou opencode.

L’import garde les fichiers historiques intacts et leurs empreintes. Les
registres et snapshots SQLite SGS/CCAB sont conservés chiffrés ; les flux
quantitatifs SGS sont projetés sans addition de snapshots cumulatifs. Les RUN
importés restent IMPORT_PROTECTED avec leurs SID/générations et les baux
incertains. La commande run.adopt permet une reprise explicitement cadrée,
avec empreinte d’import et identités identiques, seulement sans effet ou bail
non résolu. Aucun import ne réarme une ancienne session.

Le superviseur attend mécaniquement les événements. Le parent peut utiliser
wait_for_handoff : le service ne sollicite le LLM que pour exception ou revue
finale. Codex reçoit un délai MCP de86430s pour les attentes jusqu’à24heures.

La sauvegarde administrative `sudo cab backup --destination /chemin/privé`
produit dump logique, configuration et état privé avec empreintes. La restauration
ne se lance jamais implicitement après un effet. Aucun envoi hors machine ni
objectif PITR/RPO/RTO n’est réputé activé sans configuration et qualification
opérationnelles de sa destination ; ces mesures ne sont pas déduites des essais
minimaux de livraison.
