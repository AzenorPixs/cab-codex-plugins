# Preuves diagnostiques — 8 novembre 2026

- Reçu ciblé : `erasure-65145989-873a-4b1f-b6ca-fb3be05c645c` ;
  phase publique `FREEZING`, propriétaire `PREPARED`.
- La passerelle de diagnostic utilise une socket isolée, l’identité PID/UID
  du noyau et une commande signée portant ce même reçu. Le diagnostic ne
  reconnecte pas le MCP et ne transmet aucune commande de commit.
- Sur les chemins broker par défaut, le refus provient de l’extension du
  périmètre : une approbation porte un identifiant ajouté après le reçu initial
  et apparaît aussi dans un répertoire d’un autre projet. L’identifiant est
  du même type que celui ajouté. Les contenus et chemins privés ne sont pas
  reproduits ici.
- L’API de configuration OpenCode montre une commande MCP locale pointant sur
  le script broker attendu, sans bloc d’environnement spécifique ; le
  gestionnaire d’environnement utilisateur ne présente pas les variables de
  chemins broker examinées. Les variables héritées du processus OpenCode et
  les chemins effectivement utilisés ne sont pas établis par ces preuves.
- Le test synthétique d’une même identité d’approbation entre projets exige
  le refus et la conservation des deux objets. Une autre identité étrangère
  portant le même nom de change reste conservée.
- Aucun reçu APPLIED ou purge C97 n’a été attesté par ce diagnostic.
