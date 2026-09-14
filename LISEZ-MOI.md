# DJ Planner V1.3.2 — Correctif iPhone tableau financier

## Bug corrigé
Sur iPhone, le bouton **Ouvrir le tableau financier** pouvait être visible mais ne rien faire.

## Cause
Safari/PWA pouvait charger le nouveau HTML tout en conservant un ancien `app.js` dans le cache.

## Corrections
- bouton Finance relié aussi au système de navigation générique ;
- fichiers critiques versionnés en `1.3.2` ;
- nouveau cache `dj-planner-v1-3-2` ;
- chargement réseau prioritaire pour HTML / JS / CSS / manifeste ;
- ancien cache supprimé à l'activation ;
- Service Worker enregistré avec `updateViaCache: none`.

## Mise à jour GitHub
1. Décompresse `DJ_Planner_V1_3_2.zip`.
2. GitHub > dépôt `dj-planner`.
3. `Add file` > `Upload files`.
4. Dépose tout le contenu.
5. Message conseillé : `DJ Planner V1.3.2 - correctif finance iPhone`.
6. Valide et attends GitHub Pages.

## Après déploiement sur iPhone
1. Ouvre d'abord l'adresse DJ Planner dans Safari.
2. Recharge une fois.
3. Ferme complètement l'app DJ Planner installée.
4. Rouvre-la depuis l'écran d'accueil.
5. Va dans `Plus > Ouvrir le tableau financier`.
