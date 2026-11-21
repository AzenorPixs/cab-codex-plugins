# Conception

## Piste vérifiée sur hvp1

L’app-server Codex installé expose le réglage expérimental `mcp_connection_sharing`. Un essai avec deux sessions éphémères dans le même dossier observe deux relais sans le réglage, un seul avec lui. Dans deux dossiers distincts, le partage seul laisse deux relais. Associer le partage à un dossier de lancement MCP fixe a donné un seul canal pour ces deux dossiers.

Deux appels en lecture sur un canal de test ont chacun reçu le `threadId` natif correspondant dans les métadonnées MCP. La tentative de substitution depuis les métadonnées de l’appel a été écartée par l’app-server testé. Ce contrôle n’est pas étendu aux autres clients sans examen de leur transport.

## Routage à réaliser

CAB rattache actuellement un relais à un seul RUN. Le partage exige un rattachement indexé par liaison et session native vérifiée, sans choisir un RUN par ordre de création ou par dossier. Vérifier l’identité du pair, la provenance du contexte et le rattachement natif avant chaque opération. Ne jamais transformer une valeur fournie dans les arguments utilisateur en identité attestée. Préserver les reçus, réservations et index de chaque session.

Le déploiement doit être progressif par client et compte. Garder les profils réels inchangés tant que deux RUN simultanés ne sont pas isolés par un contrôle positif et un refus croisé. Évaluer séparément Codex Desktop, Codex CLI et OpenCode. Un client sans contexte natif qualifié conserve sa configuration existante jusqu’à une voie validée.

## Surveillance

L’unicité s’apprécie sur les canaux stdio réellement détenus par l’agent, et non sur le nombre de processus annoncé par une interface. Conserver un reçu d’écart si un second canal apparaît ou si le moteur ou le catalogue n’est plus à la version de CAB. Notifier le début, réessayer sur frontière sûre et notifier le retour après une observation indépendante. Un effet incertain reste protégé.
