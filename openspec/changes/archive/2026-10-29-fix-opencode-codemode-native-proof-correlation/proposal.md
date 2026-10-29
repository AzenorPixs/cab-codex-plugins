# Raccord des preuves Code Mode — CAB 2.1.8

## Why

OpenCode 2.2 expose les appels MCP via une partie native execute. Les appels imbriqués figurent dans metadata.toolCalls, alors que CAB attend des parties directes. Le prévol CISMP7 a été refusé sans commande : la corrélation d'admission et les preuves de récupération doivent reconnaître ce format sans accepter une affirmation libre du modèle.

## What Changes

Projeter les enveloppes strictes de Code Mode en opérations internes corrélées, préserver leur provenance native et refuser toute ambiguïté. Qualifier les permissions et les résultats sur un serveur OpenCode 2.2 isolé. Conserver les formats directs existants et les frontières historiques des recoveries. Distribuer 2.1.8, archiver et publier, puis CABU avant reprise PA01.

## Périmètre autorisé

Extension SCM validée par le développeur le 29 octobre 2026 : client V2, contrôleur et recovery, tests et qualification native, documentation, distribution, archive et activation CABU. Aucun code fonctionnel Pixs. Aucun secret réel dans les bancs isolés.
