# Clôture des EPICs #3, #4, #5, #6, #9 (21/11/2026)

Chaque case du backlog est reliée à du code testé, ou explicitement reportée avec sa raison.
« Pilote » = mesure terrain impossible sans établissement réel (#20) ; « Données sensibles » = #16 PRIV-01.

## #5 Smart Production
| Case | Statut | Où |
|---|---|---|
| Scénarios 150/50/30, 140 préparées, hausse capacité 160 | Fait | `convex/lib/production/plan.ts`, `plan.test.ts` |
| Saisies invalides, recette manquante, capacité | Fait | `validateInputs`, `materialsFor`, tests |
| Deux sessions, simulation qui signale le changement | Fait | `simulate-sheet.tsx`, vérifié navigateur |
| Droits (tenant, usager, distribution) | Fait | `requireKitchen`, `production.test.ts` |
| Comptages par plat, date, jour/semaine ; réservé, absent, remis distincts | Fait | `loadProductionDay` (noShow), onglet Semaine |
| Comptage par créneau | Fait | `counter.slotFlow` |
| Comptage par régime déclaré | Reporté : données sensibles (régime/religion/santé, #16 PRIV-01), base légale ARTCI avant pilote |
| Quantités = réservations + passages + marge validée, limitées capacité/stock, incertitude | Fait | plan validé, absents attendus, alertes capacité, couverture stock |
| Historique, popularité, annulations ; démarrage à froid par règles | Fait | `history.ts`, `loadDishHistory`, passages mesurés au comptoir |
| Prévisions calibrées, calendrier des jours spéciaux | Reporté : pilote (aucun historique réel) ; l'écart du plan est mesuré (#9) |
| Plan, lots, horaires, préparé ; corrections tracées | Fait | `productionPlans`, journal des saisies |
| Replanification après annulation/rupture, suivi des écarts | Fait | écart depuis validation (temps réel), ruptures stock, copilote |

## #6 Smart Waste et stocks
| Case | Statut | Où |
|---|---|---|
| Ingrédients, recettes, rendements, unités, fournisseurs, réceptions, lots, DLC | Fait | `stockMovements`, page Stocks |
| Inventaires, mouvements, consommation par recette, corrections tracées, théorique/physique, alertes rupture | Fait | `lib/stock/position.ts`, écart d'inventaire conservé |
| Préparé, remis, non retiré, surplus récupérable, pertes réelles (motif, poids/coût) distincts | Fait | Pertes réelles, surplus récupéré, matière perdue estimée |
| Suggestions d'achat et de menu selon stocks ; validation humaine | Fait | liste d'achat (CSV), « plats qui l'utilisent » pour les lots qui expirent |
| Valorisation des portions sûres, validation humaine, rien d'automatique | Fait | surplus récupéré avec contrôle hygiène obligatoire |
| Pertes pesées avant/après pilote | Reporté : pilote |

## #4 Smart Booking & Queue
| Case | Statut | Où |
|---|---|---|
| Réservations jour/semaine, limites service et plat, capacité configurable | Fait | réservation groupée, capacité globale par service, réglages |
| Groupes (classes), horaires de pause scolaires | Reporté : données de l'établissement (emplois du temps) nécessaires au pilote |
| Délais, absences, no-show, liste d'attente, arrivées spontanées | Fait | clôture réglable, absents, `waitlist`, servis sans réservation |
| Créneaux selon capacité de distribution, débordement, accès sans smartphone | Fait | `lib/slots.ts`, refus si plein, recherche par nom au comptoir |
| QR opaque, recherche manuelle, contrôles, anti-double retrait | Fait | `passes.ts`, `counter.searchDiner` |
| Tableau distribution : à remettre, remis, flux par créneau, mode dégradé | Fait | rôle distribution, Commandes du jour, flux par créneau |
| Annulation libère portion et créneau, compensation, journal | Fait | `bookings.cancel`, journal du solde, liste d'attente prévenue |
| Attente réelle p50/p90 | Reporté : pilote (mesure au comptoir réel) |

## #9 Intelligence centrale
| Case | Statut | Où |
|---|---|---|
| AI SDK, fournisseur configurable, sorties structurées, secrets serveur, quotas | Fait | B1, `lib/aiQuota.ts`, `lib/copilot/llm.ts` |
| Lecture menu, réservations, production, stocks, historique selon rôle ; mutations déterministes | Fait | `copilot.facts`, `lib/copilot/facts.ts` |
| Dashboard : demande, réservations, retrait, no-show, recettes (crédits démo), pertes, satisfaction, ruptures, périodes, dénominateurs, exports | Fait | `analytics.period`, Indicateurs, CSV |
| Coûts matière | Fait partiellement : estimés si prix reçus (stocks, simulation) ; pas de comptabilité |
| Assistant : écarts, quantités demain, menus à améliorer | Fait | points de gestion du copilote |
| Proposition, aperçu, validation humaine, transaction, audit | Fait | objectif proposé, fenêtre du plan, `productionPlans` |
| Évaluation IA : faits, injection, isolation, fallback, écart aux règles | Fait | tests copilote et B1, écart du plan |
| Résumé IA avec un vrai modèle | À vérifier en prod (clé OpenRouter) |

## #3 Smart Menu
| Case | Statut | Où |
|---|---|---|
| Catalogue, recettes, prix, allergènes, brouillon/publication | Fait | A1, #13, #47 |
| Menu unique ou à choix, navigation classique et questions guidées | Fait | menu publié, Aide au choix en étapes |
| Abonnement | Fait sous forme d'habitudes : pré-remplissage + réservation groupée confirmée (aucune réservation implicite, règle de l'issue) |
| Programme selon budget, jours, préférences, disponibilité, diversité ; alternatives modifiables | Fait | habitudes, `diversify`, alternatives par jour |
| Limites parentales | Reporté : dépend de l'espace parent (#8, non commencé) |
| Validation individuelle ou en lot, revalidation serveur | Fait | `bookMany` |
| Allergènes inconnus, aucune allégation | Fait | B1, #47 |
| Fallback, préférences facultatives, langues, accessibilité | Fait | repli sans IA, FR/EN |
| Temps de choix et satisfaction | Satisfaction faite (notes) ; temps de choix : pilote |
