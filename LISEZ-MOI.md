# DJ Planner V1.2 — Journées indisponibles

## Nouveauté V1.2

Dans **Planning**, toucher une journée libre ouvre maintenant deux choix :

- **Ajouter une prestation**
- **Verrouiller la journée**

Une journée verrouillée apparaît avec **🔒 Indisponible**.

### Informations d'indisponibilité
- motif : Personnel / Déplacement / Vacances / Repos / Autre ;
- note facultative.

### Protection
- impossible d'enregistrer ou de dupliquer une prestation sur une journée verrouillée ;
- pour reprendre une prestation ce jour-là, toucher la journée puis **Déverrouiller la journée** ;
- impossible de verrouiller une journée qui contient déjà une prestation active.

Les indisponibilités sont incluses dans la sauvegarde JSON mais exclues de l'export CSV des prestations.

## Mise à jour GitHub

Même procédure que précédemment : remplace les fichiers du dépôt par ceux de cette archive, valide les modifications et attends le nouveau déploiement GitHub Pages.

---


# DJ Planner V1.2 — Journées indisponibles

Cette version remplace la V1 sans supprimer les prestations déjà enregistrées sur le même appareil et la même adresse GitHub Pages.

## Correctif V1.1.1

- correction de la duplication : les informations de la prestation source sont maintenant réellement reprises ;
- la nouvelle date reste volontairement vide ;
- les encaissements déjà reçus, la date de règlement, l'état de facture et les checklists Jour J ne sont pas copiés ;
- le cache PWA est passé à une nouvelle version pour forcer la prise en compte du correctif.

## Nouveautés V1.1

- correction du menu inférieur sur iPhone : l'écran central défile, le menu reste fixe ;
- nom DJ / nom d'artiste personnalisable dans Plus > Réglages ;
- duplication d'une prestation ;
- packs matériel avec calcul automatique de la liste à apporter ;
- gestion financière enrichie : prestation, frais, acompte demandé/reçu, solde reçu, reste calculé, mode/date de règlement, facture ;
- mode Jour J simplifié avec checklist matériel et préparation ;
- boutons Apple Plans et appel téléphonique ;
- export .ics enrichi avec arrivée, set, brief et deux rappels ;
- sauvegarde JSON et export CSV mis à jour ;
- préparation de l'étape suivante : synchronisation Google Calendar vers Calendrier Apple.

## Mise à jour du dépôt GitHub

1. Décompresser DJ_Planner_V1_1_1.zip sur le Mac.
2. Ouvrir le dépôt GitHub `dj-planner`.
3. Cliquer sur `Add file` > `Upload files`.
4. Glisser tout le CONTENU du dossier DJ_Planner_V1_1_1 dans la zone de dépôt, y compris `icons`.
5. GitHub signalera que les fichiers existants seront remplacés / modifiés.
6. Dans le message de validation, saisir : `Correctif duplication DJ Planner V1.1.1`.
7. Cliquer sur `Commit changes` / `Valider les modifications`.
8. Attendre la fin de GitHub Pages.
9. Ouvrir https://jeromeguilloux.github.io/dj-planner/ et actualiser deux fois si nécessaire afin que le nouveau service worker prenne la main.

## Contrôles avant utilisation réelle

- Le menu inférieur reste immobile pendant le défilement d'une longue fiche.
- Une ancienne prestation est toujours présente.
- Plus > Réglages modifie le nom affiché en haut.
- Dupliquer ouvre une copie et exige une nouvelle date.
- Un pack matériel se recalcule lorsqu'un élément est marqué comme fourni sur place.
- Les montants financiers se calculent automatiquement.
- Mode Jour J conserve l'état des checklists après fermeture/réouverture.
- Plans et Appeler fonctionnent sur iPhone.
- Calendrier génère un fichier .ics enrichi.

## Important

La synchronisation automatique Google Calendar n'est pas encore activée dans cette V1.1. Elle nécessite une configuration OAuth Google propre à ton compte. Elle sera branchée après validation fonctionnelle de la V1.1, puis le calendrier Google pourra être affiché dans Calendrier Apple sur iPhone.
