# DJ Planner V1.1 — Mise à jour

Cette version remplace la V1 sans supprimer les prestations déjà enregistrées sur le même appareil et la même adresse GitHub Pages.

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

1. Décompresser DJ_Planner_V1_1.zip sur le Mac.
2. Ouvrir le dépôt GitHub `dj-planner`.
3. Cliquer sur `Add file` > `Upload files`.
4. Glisser tout le CONTENU du dossier DJ_Planner_V1_1 dans la zone de dépôt, y compris `icons`.
5. GitHub signalera que les fichiers existants seront remplacés / modifiés.
6. Dans le message de validation, saisir : `Mise à jour DJ Planner V1.1`.
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
