# DJ Planner V1.3.4 — Trésorerie fiabilisée

## Exemple de contrôle
- Juin : 500 € net.
- Juillet : 600 € encaissés, dont 250 € facturés. Charges 23 % sur 250 € = 57,50 €. Net = 542,50 €.
- Août : 600 € net.
- Cumul : 500 € fin juin, 1 042,50 € fin juillet, 1 642,50 € fin août.

## Correctifs
- plus aucun paiement sans date n'est automatiquement placé sur la date de prestation ;
- tout montant encaissé oblige à saisir sa date d'encaissement ;
- les anciens encaissements sans date apparaissent comme « Encaissements à dater » ;
- graphique combiné : histogramme net mensuel + montant au-dessus de chaque barre + courbe du cumul net ;
- statut de paiement clairement indiqué comme automatique ;
- toute nouvelle prestation remet explicitement les montants encaissés à zéro.

## Statut de paiement
- 0 € reçu : À recevoir
- réception partielle : Partiellement payé
- reçu >= total prestation : Payé

## Mise à jour GitHub
1. Décompresse `DJ_Planner_V1_3_4.zip`.
2. Add file > Upload files.
3. Dépose tout le contenu.
4. Message : `DJ Planner V1.3.4 - trésorerie et graphique`.
5. Valide, attends GitHub Pages, puis recharge une fois dans Safari avant de relancer la PWA.
