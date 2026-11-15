# Awalé — Oware

Implémentation web réaliste du jeu d'awalé (Oware) : plateau en bois, graines
individuelles, animation des semis, règles officielles complètes, mode
2 joueurs local ou contre une IA (minimax avec élagage alpha-bêta).

## Lancer le jeu

Ouvrir `index.html` dans un navigateur, ou servir le dossier en local :

```sh
cd awale
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Aucun dépendance externe : tout est en HTML/CSS/JS vanilla.

## Fichiers

- `index.html` — page du jeu
- `style.css` — rendu « plateau en bois »
- `awale-logic.js` — moteur de règles pur (navigateur + Node)
- `ai.js` — adversaire artificiel (minimax alpha-bêta, 3 niveaux)
- `ui.js` — interface, animation des semis, gestion des tours
- `test.js` — tests du moteur (Node) : `node test.js`

## Règles implémentées

- 12 cases (6 par joueur), 48 graines, semis anti-horaire en sautant la case
  de départ lors d'un tour complet.
- Capture si la dernière graine tombe dans une case adverse contenant alors
  2 ou 3 graines, avec capture en chaîne vers l'arrière.
- Aucune capture dans sa propre rangée.
- « Grand slam » interdit : on ne peut pas vider le camp adverse d'un coup.
- Obligation de « nourrir » l'adversaire quand il n'a plus de graines, si possible.
- Fin de partie quand un joueur n'a plus de graines et ne peut pas être nourri ;
  l'autre ramasse les graines restantes. 24–24 = match nul.
- Si une même position se répète (boucle de nourrissage), la partie s'arrête :
  le score se joue alors sur les graines déjà capturées.
