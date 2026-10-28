# OBS09 — Reconnaître les codes historiques L1 et L2 dans le moniteur

## Pourquoi

Les codes CAB L1 et L2 sont attestés et consolidés par ACL, mais le parseur du moniteur exige au moins deux chiffres. Leurs cellules restent donc vides. Le développeur demande explicitement le correctif, la mise à jour OpenSpec et les tests ciblés, sans renumérotation.

## Changements

- Admettre exactement L1 et L2 en complément des formats existants, depuis le premier titre admissible seulement.
- Conserver les codes à l’identique, les séparateurs, les refus des autres codes à un chiffre et toutes les protections de lecture.
- Couvrir le parseur et la lecture d’un change actif et d’une archive référencée avec des fixtures locales.
- Mettre à jour le canon local-web-monitor et le delta correspondant, ainsi que les mentions affectées du registre et de la cartographie.

## Capacités

### Capacités modifiées

- local-web-monitor : exception explicite pour les deux codes historiques.

## Périmètre

Correctif source sans incrément de version, installation, activation, archivage ou opération Git. Aucun code de lot nouveau n’est attribué à ce change ; son identifiant technique est le repère provisoire. Les 72 archives et leurs titres demeurent inchangés.
