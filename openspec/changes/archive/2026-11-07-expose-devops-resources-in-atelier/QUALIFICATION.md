# Qualification source CAB2.4.4

Code non attribué. Mandat explicite : ressources DevOps déclarées disponibles, SCM/version/CI-CD/CABU ; tests ciblés vitaux.

## Tests finaux

16tests automatisés réussis :9atelier/autonomie/distribution (dont deuxUID réels) et7sélections CABU/payload/bascule. Les calibrages initiaux ont révélé des descriptions systemd non incrémentées et une preuve de distribution obsolète, corrigées sans toucher aux archives. Les routeurs sont ramenés sous leurs plafonds de taille ; les références complètes restent distribuées.

20sondes locales réelles réussies sous UID OpenCode dans un projet fixture reprenant le DEVOPS.md Pixs : Docker/Compose, SSH/SSHPASS, Git, Go, Node/npm, OpenCode, OpenSpec, OpenSSL, psql, Python/venv/pip, compilation puis exécution Go, chargement des dépendances JS. Chromium restitue le contenu local attendu ; Firefox produit une capture PNG valide. Les configurations nécessaires sont minimales et synthétiques ; seuls fonts/alternatives système RO sont repris. TMPDIR dispose d’un alias court vers le seul temporaire du RUN pour respecter les limites des sockets Unix.

Qualification Python3.14.10/Cython3.3.0 : génération C puis contrôle cc. Nuitka4.3.1 : compilation d’un module natif puis import du.so et valeur42 vérifiée, sans téléchargement. Preuves locales output/scm-cab-244/pa01-runtime-qualification.json ; ce ne sont pas des appels du SID PA01.

## Ressources externes

PostgreSQL : client psql disponible, serveur acceptant les connexions ; SELECT1 et transaction_read_only=on réussis avec les identifiants Pixs explicitement autorisés, traités uniquement dans le processus local. Aucune valeur de credential n’est restituée ni copiée ; serveur160014. Docker info répond sans création de conteneur.

LXC : preuve existante de PA01 du2026-11-06 réutilisée, opération op-cismp7-pa01-sl14-lxc-builder-inventory-20261106-04, exit0/DONE. Inventaire CT100/hvp1 Python3.14.9/Cython3.3.0/Python.h/cc14.2.0/readelf2.44 ; aucune compilation LXC réussie n’est revendiquée, aucune réallocation ni relance. Référence complète dans output/scm-cab-244/pa01-existing-proof.json.

TPM présent mais inaccessible directement à UID OpenCode ; sa sonde de capacités publiques administrative est distincte et son résultat reste dans output/scm-cab-244/tpm-qualification.json. Les ressources externes restent derrière leurs voies CAB ; le réseau et les sockets hôte ne sont pas ouverts au lanceur.

## Statistiques et opérations

SGS permanent collecte la vraie session Codex, sans orchestrateur fictif. Une initialisation avec borne incorrecte a été figée et exclue des mesures ; seule la liaison bornée07:10UTC est admise au rapport. Les deux liaisons seront purgées par SGS après rapport durable. Les mesures absentes restent N/A. Publication GitHub/DIU et activation réelle des six briques sont prouvées séparément après archive ; aucun succès runtime n’est déduit de la qualification source.
