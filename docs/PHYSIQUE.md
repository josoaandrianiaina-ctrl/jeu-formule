# Modèle physique minimal (v0)

Statut : spécification écrite par Claude après la revue de ChatGPT sur la PR n°1.
Rien n'est encore implémenté. Les valeurs sont des points de départ à calibrer.

## 1. Qui calcule quoi

| Tâche | Responsable |
|---|---|
| Intégration du châssis, gravité, collisions, lancers de rayons | Rapier |
| Suspensions, pneus, roues, moteur, freins, aérodynamique | Code du projet |

Le contrôleur de véhicule intégré à Rapier **n'est pas utilisé**. Il applique sa
propre adhérence ; le superposer à un modèle de pneu créerait deux sources de
forces concurrentes. Un seul modèle commande donc les forces : celui décrit ici.

Les roues n'ont pas de corps rigide. Chaque roue est un rayon lancé depuis le
châssis, plus une vitesse de rotation ω (un degré de liberté).

## 2. Unités et pas de temps

- Unités SI : m, kg, s, N, rad.
- Repère véhicule : longitudinal (vers l'avant), vertical (vers le haut), latéral (vers la droite).
- Pas fixe : 1/120 s. La rotation des roues est sous-échantillonnée si la stabilité l'exige (test V11).

## 3. Paramètres initiaux (monoplace fictive)

| Paramètre | Valeur de départ |
|---|---|
| Masse totale m | 800 kg |
| Répartition statique sur l'avant | 46 % |
| Empattement L | 3,6 m |
| Voies avant / arrière | 1,60 m / 1,55 m |
| Hauteur du centre de gravité h | 0,30 m |
| Inerties lacet / tangage / roulis | 1000 / 900 / 150 kg·m² |
| Rayon de roue r | 0,33 m |
| Inertie d'une roue | 1,2 kg·m² |
| Raideur à la roue avant / arrière | 150 / 170 kN/m |
| Amortissement à la roue | 6 kN·s/m |
| Débattement autour de la position statique | ± 45 mm |
| Appui : Cz·A | 4,0 m², 45 % sur l'avant |
| Traînée : Cx·A | 1,3 m² (1,05 m² DRS ouvert) |
| Masse volumique de l'air ρ | 1,225 kg/m³ |
| Puissance maximale | 600 kW |
| Régime maximal | 12 000 tr/min |
| Boîte | 8 rapports, rendement 0,92 |
| Répartition de freinage sur l'avant | 58 % |
| Adhérence de pointe μ₀ à charge nominale | 1,7 |
| Sensibilité de μ à la charge k_μ | 0,12 |

Cohérence vérifiée par calcul : vitesse maximale théorique d'environ 319 km/h ; appui à cette vitesse d'environ 2,4 fois le poids ; compression due à l'appui d'environ 29 mm à l'avant et 31 mm à l'arrière, dans le débattement ; fréquence propre des suspensions d'environ 4,5 Hz.

## 4. Équations

### 4.1 Suspension (par roue)
- Compression δ mesurée par le rayon ; vitesse de compression δ̇.
- Force : `F_s = k·δ + c·δ̇`, bornée à zéro (une roue ne tire pas le sol).
- Appliquée au châssis au point d'ancrage, selon la normale du contact.
- La charge normale du pneu est `Fz = F_s`.

### 4.2 Glissements du pneu
Vitesse du point de contact dans le repère de la roue : `v_x` (longitudinale), `v_y` (latérale).
- Glissement longitudinal : `κ = (ω·r − v_x) / max(|v_x|, v_min)`
- Angle de dérive : `α = atan(v_y / max(|v_x|, v_min))`
- κ et α passent par un retard du premier ordre (longueur de relaxation) pour rester stables à basse vitesse.

### 4.3 Adhérence disponible
`μ(Fz) = μ₀ · (1 − k_μ · (Fz − Fz₀) / Fz₀) · f_T(T) · f_U(u) · f_piste`

`f_piste` vaut 1 sur le sec et moins sous la pluie ou hors piste.

### 4.4 Forces et saturation combinée
- Glissements normalisés : `σ_x = κ / κ_pic`, `σ_y = tan α / tan α_pic`, `σ = √(σ_x² + σ_y²)`.
- Force totale : `F = μ(Fz) · Fz · g(σ)`, où `g` est une courbe de type « formule magique » : croissante, maximum 1 en σ = 1, puis légère chute.
- Répartition : `Fx = F · σ_x / σ`, `Fy = −F · σ_y / σ`.
- La force d'un pneu ne dépasse donc jamais `μ·Fz`, en freinage, en virage ou les deux.
- Points de départ : `κ_pic = 0,10`, `α_pic = 7°`.

### 4.5 Roue
`I_roue · ω̇ = C_moteur − C_frein − Fx · r − C_roulement`

### 4.6 Moteur et transmission
- Couple moteur donné par une courbe (régime, position de l'accélérateur).
- Régime déduit de la vitesse moyenne des roues arrière et du rapport engagé.
- Couple aux roues : `C = C_moteur · rapport · pont · rendement`.
- Différentiel v0 : couple de couplage proportionnel à l'écart de vitesse entre les roues arrière.
- Passage automatique des rapports selon le régime.

### 4.7 Freins, ABS, antipatinage
- Couple de frein par roue : `pédale · C_max · répartition`.
- **ABS**, par roue : si `κ < −0,15`, le couple de frein de cette roue est relâché ; il est rétabli quand `κ > −0,08`. Cycle limité à 15 Hz.
- **Antipatinage** : si le glissement moyen des roues arrière dépasse 0,12, le couple moteur est réduit par un régulateur proportionnel-intégral. Désactivable.

### 4.8 Aérodynamique
- Appui : `½ · ρ · Cz·A · v²`, réparti avant/arrière, appliqué au châssis.
- Traînée : `½ · ρ · Cx·A · v²`, opposée à la vitesse.
- DRS : Cx·A réduit, appui arrière réduit.
- Aspiration : traînée et appui réduits dans le sillage d'une voiture.

### 4.9 Température et usure (modèle empirique)
- Puissance de glissement : `P = |Fx · v_gliss,x| + |Fy · v_gliss,y|`.
- Température : `dT/dt = a · P − b · (T − T_air)`.
- Usure : `du/dt = c · P`, plus rapide hors de la fenêtre de température.
- `f_T` est une cloche centrée sur la fenêtre idéale ; `f_U` décroît avec l'usure.
- Ce modèle est paramétrique. Il ne prétend pas reproduire un pneu réel.

## 5. Scénarios de validation

Chaque scénario est un test automatique. La référence est calculée à la main à
partir des mêmes paramètres. Le test échoue hors tolérance.

| N° | Scénario | Référence | Tolérance |
|---|---|---|---|
| V1 | Voiture posée, à l'arrêt | Charge par roue = poids × répartition ; tassement = Fz / k ; vitesse résiduelle nulle | 2 %, 5 %, < 0,01 m/s |
| V2 | Accélération de 0 à 300 km/h | Courbe v(t) d'un modèle 1D : adhérence limitée, puis puissance limitée | 5 % |
| V3 | Vitesse maximale | `P · rendement = ½ρ·Cx·A·v³ + roulement` | 3 % |
| V4 | Freinage de 300 à 100 km/h | Distance et décélération selon μ(Fz) et l'appui ; avec ABS, aucun blocage de plus de 0,1 s | 7 % |
| V5 | Transfert de charge longitudinal | `ΔFz = m · a · h / L`, appui coupé | 7 % |
| V6 | Transfert de charge latéral | `ΔFz = m · a_y · h / voie`, virage stabilisé | 10 % |
| V7 | Accélération latérale maximale à 100, 200 et 250 km/h | `μ(Fz) · (m·g + appui) / m` | 10 % |
| V8 | Freinage et virage combinés | Force de chaque pneu ≤ `μ · Fz` | 2 % |
| V9 | Roue libre sur pente constante, en descente et en montée | `a = ± g·sin θ − traînée/m − roulement` | 5 % |
| V10 | Bosse et compression à haute vitesse | Pas de traversée du sol ; retour à l'équilibre en moins de 1 s | — |
| V11 | Dix minutes simulées à vitesse maximale | Aucune valeur invalide ; énergie non divergente | — |

Les courbes de référence (v(t), Fz(t)) sont enregistrées dans le dépôt. Toute
dérive ultérieure fait échouer les tests.

## 6. Limites connues de la v0

- Pas de carrossage, de pince, ni de déformation du pneu.
- Appui indépendant de la hauteur de caisse.
- Modèle thermique empirique.
- Aucune donnée réelle de comparaison : « ultra réaliste » ne sera pas affirmé sur la base de ces seuls tests.
