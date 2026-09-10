# DJ Planner V1 — Guide très simple

Tu n'as besoin de modifier AUCUN fichier de code.

## Ce que contient le dossier

- index.html : l'écran principal de l'application
- styles.css : le design
- app.js : le fonctionnement et l'enregistrement local
- manifest.webmanifest : l'installation sur iPhone
- sw.js : le fonctionnement hors connexion
- .nojekyll : indique à GitHub Pages de servir les fichiers tels quels
- icons/ : les icônes de l'application

## Étape A — Mettre l'application sur GitHub

1. Ouvre https://github.com/ sur ton Mac.
2. Crée un compte gratuit si tu n'en as pas.
3. Une fois connecté, clique sur le bouton + en haut à droite.
4. Clique sur "New repository".
5. Nom du repository : dj-planner
6. Choisis "Public".
   Important : le CODE sera public, mais tes prestations ne seront PAS dans GitHub.
   Les prestations restent dans la base locale de ton iPhone.
7. Clique sur "Create repository".
8. Dans le repository vide, choisis "uploading an existing file" / "Add file" > "Upload files".
9. Décompresse le ZIP DJ_Planner_V1.zip sur ton Mac.
10. Sélectionne TOUT LE CONTENU du dossier DJ_Planner_V1 :
    index.html, styles.css, app.js, manifest.webmanifest, sw.js, .nojekyll et le dossier icons.
11. Glisse les fichiers dans la zone d'upload GitHub.
12. Clique sur "Commit changes".

ATTENTION : il faut déposer le CONTENU du dossier, et non créer un dossier DJ_Planner_V1 dans le repository.
index.html doit être visible à la racine du repository.

## Étape B — Activer GitHub Pages

1. Dans le repository "dj-planner", clique sur "Settings".
2. Dans la colonne de gauche, clique sur "Pages".
3. Dans "Build and deployment", mets "Source" sur "Deploy from a branch".
4. Dans "Branch", sélectionne "main".
5. À côté, sélectionne "/ (root)".
6. Clique sur "Save".
7. GitHub affichera ensuite l'adresse publique de DJ Planner.
   Elle ressemblera à :
   https://TON-NOM-UTILISATEUR.github.io/dj-planner/

## Étape C — Tester sur le Mac

1. Ouvre l'adresse GitHub Pages.
2. Clique sur "Ajouter".
3. Crée une prestation test.
4. Ferme l'onglet.
5. Rouvre l'adresse.
6. La prestation doit toujours être présente.

## Étape D — Installer sur iPhone

1. Sur l'iPhone, ouvre Safari.
2. Ouvre l'adresse GitHub Pages de DJ Planner.
3. Appuie sur le bouton de partage.
4. Choisis "Sur l'écran d'accueil".
5. Active "Ouvrir comme app web" si l'option est proposée.
6. Appuie sur "Ajouter".

Une icône DJ Planner apparaît sur l'écran d'accueil.

## Sauvegarde

Dans DJ Planner :
Plus > Sauvegarder toutes les données

L'iPhone génère un fichier JSON. Enregistre-le dans Fichiers > iCloud Drive.

Pour restaurer :
Plus > Restaurer une sauvegarde > sélectionne le fichier JSON.

## Important

Les prestations sont enregistrées localement sur l'appareil via IndexedDB.
GitHub héberge uniquement le programme.
Une sauvegarde JSON régulière reste recommandée.
