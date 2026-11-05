État réalisé le 2 novembre 2026 : les deux réponses explicites du développeur
ont autorisé cette extension. Les 18 fichiers ont été adaptés et validés ;
voir prompts-reference-update.json et prompts-reference-update.diff. Aucune
opération Git dans prompts, aucune autre propagation AGENTS. La proposition
ci-dessous est conservée comme trace de la décision.

# Compatibilité des prompts — proposition d'extension bornée

État du 2 novembre 2026 : aucune écriture dans le projet prompts.
L'accord template puis propagation CAB est appliqué à AGENTS.md 0.6,
sans modifier un autre consommateur. Le programme CAB 2.2.0 est qualifié
localement ; le retrait final du fichier local est différé pour éviter de
laisser les prompts ci-dessous pointer vers un fichier supprimé.

## Action proposée

Résoudre le protocole par AGENTS.md du projet cible, au lieu d'imposer le
nom d'un fichier local dans le prompt. Le noyau et les références réellement
applicables doivent être connus des deux agents avant leur mandat. Conserver
intégralement les objectifs, accords, permissions, durées métier explicites,
preuves, critères, rapports et clôtures de chaque prompt.

La référence commune proposée est :

> Avant tout pilotage, résoudre le protocole désigné par AGENTS.md du projet
> cible, puis charger ses obligations et les références nécessaires au mandat.
> PROTOCOLE_PILOTAGE désigne ce contrat résolu, pas un nom de fichier imposé.
> Les limites métier et les décisions réservées au développeur restent celles
> du prompt. Une référence indisponible suspend les seules opérations concernées,
> sans autorisation inventée ni modification de la distribution source.

Remplacer les renvois techniques par cette référence logique. Adapter le seul
requirement « Autorité du protocole et lecture préalable », ses scénarios,
l'index et les cadrages correspondants. La résolution d'un profil non CAB
conserve son fichier local lorsque AGENTS.md le prescrit. Les contrats CAB
appartiennent à CAB ; les règles générales AGENTS.md restent référencées dans
template. Ne pas propager AGENTS.md à prompts ou à d'autres consommateurs.
Ne supprimer ni le fichier local de prompts, ni celui de template.

## Fichiers concernés dans /home/devops/datas/prompts

| Fichier | Renvois actuels à examiner | Empreinte de la base lue |
|---|---:|---|
| `SCMP.md` | 22 | `a0af9e5a98e31a6e72a19e63f90158bf8e49241c04579f87b812b452f96c718f` |
| `CISMP.md` | 18 | `19b740dab74b27519d19c53357ea4397695ae395b8c47a3bc1d0c55349334e2d` |
| `ISMP.md` | 15 | `40e2c636a7590c73300e36ffc2bd12e509654c9cae23b13247868dca7568d586` |
| `SPCMP.md` | 10 | `132b0771a652b36bcee1101540bbbbf578f73265ba580c76d0b81f00a94b57bc` |
| `GSCMP.md` | 11 | `dcc2e779d324926caac89b27c882d6a0e0aa891359b5c13ba06a39707766334e` |
| `ACSP.md` | 13 | `ef4f551c2354a672234ee175ad7fe29ba2c7e45a8de318931dd5e76052f1b489` |
| `RCAM.md` | 1 | `f8ef3e30c743b7f6a398dfe3b7178339c623bdd44053d79ede980d5e9dca4d8a` |
| `RSMP.md` | 16 | `22cf5aa9aaefcd29f96adc88731ae33f2109640af96b5316d64641b76d2a262e` |
| `RCAMP.md` | 13 | `0ebef89efa37febe979a58a3d8deaf18c9fa882077f47a18c2446c82df055f1c` |
| `PPSCP.md` | 8 | `d3af2b4666fb53a1c7ba8d5dacae7f881fbaac2c0a6ae4138098c83f912b8c7b` |
| `DOPP.md` | 9 | `2b4b686fbcf622ab251fb0890a091bcde56b000fa2e9dd82a40d719b056e16da` |
| `ACSMP.md` | 13 | `bd0252da8a1b22c4658dbc49c83fea39ecf628a4eacfec1f2a7c6942df1cee76` |
| `INDEX.md` | 2 | `612bc0fc12db0f570ab462e607f4c5a8385e9a3d43cf388e7f232b1d752ea004` |
| `README.md` | 2 | `65191e71fd96cdf10b9dd1328151663600de6bb908b3d80e91cb5cf0bc3daa6c` |
| `PROJECT.md` | 1 | `4d061e57cde1e184d6eb34d717ce87d5fafc8d93b6d381b3f09f1456d485e4ab` |
| `TECHNICAL.md` | 3 | `3028b4bbe9c28e3e43cf6e34ac1984fcc5607f38820075f16517087eacf92bc9` |
| `SGS.md` | 1 | `f2604535dbc24a3f335866190a300827a03e12fb365611ffe6e82871f0e4c2be` |
| `openspec/specs/orchestrated-pllm-session/spec.md` | 2 | `bbe623a9671bf1a33d5f619b0205cb172540c464f565bf7c0fb5bcd11dd4cbd2` |

## Frontière d'autorisation

Cette extension n'est pas comprise dans la propagation ciblée template→CAB.
AGENTS.md interdit l'écriture hors racine sans validation explicite. Le projet
prompts n'a donc pas été modifié. Après accord, vérifier ses instructions,
les sources et les empreintes ci-dessus avant modification ; un fichier ayant
évolué est relu et réconcilié, jamais remplacé à partir de cette ancienne base.

Après cette adaptation, vérifier les renvois, retirer seulement le fichier
ORCHESTRATED_CODING.md du dépôt CAB déjà autorisé, puis terminer cohérence,
archivage, statistiques et publication SCM. Les opérations Git sur le projet
prompts et toute propagation vers d'autres consommateurs restent distinctes.
