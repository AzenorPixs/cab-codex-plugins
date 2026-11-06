## ADDED Requirements

### Requirement: Reprise d’un reçu legacy dans son layout d’origine
CABU SHALL reprendre un reçu classique ou managed avec ses cibles et
sauvegardes d’origine. Une option de layout différente MUST NOT réinterpréter
le reçu. Les services résiduels du repli SHALL être arrêtés avant la capture
finale ; le registre métier SHALL rester identique entre prévol et capture.

#### Scenario: Reçu classique et briques résiduelles anciennes
- **WHEN** un reçu classique ROLLBACK_FAILED a des artefacts intègres et un état accepté par son lecteur cible
- **THEN** la même transaction migre après arrêt des seules briques gérées, puis vérifie sa cible avant l’alignement courant distinct

### Requirement: Artefact broker avancé vérifié sans confiance dans son étiquette
Un broker supérieur à la cible historique MAY être reconnu seulement si ses
octets égalent ceux du paquet courant qualifié hors déclaration de version.
Les octets observés SHALL être conservés ; toute autre modification SHALL
rester refusée. Le même reçu SHALL conserver stage et sauvegardes originaux.

#### Scenario: Broker copié en avance par une installation qualifiée
- **WHEN** les trois modules correspondent au code qualifié avec une version intermédiaire et le reste du reçu est intègre
- **THEN** leurs octets sont conservés en audit avant reprise et aucune modification inconnue n’est écrasée
