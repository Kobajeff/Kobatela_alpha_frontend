# FRONTEND API USAGE — Operational Playbook (React Query & UI Safety)

- Last updated: 2026-01-11 (Europe/Brussels)
- Audience: Frontend engineers
- Dependency: FRONTEND_API_GUIDE.md (canonical contract)
- Evidence rule: faits issus du backend doivent porter une citation 【F:...†L..】

## 1. Executive Summary
- Ce playbook décrit comment consommer l’API en toute sécurité côté frontend (React Query), sans jamais diverger du contrat canonique FRONTEND_API_GUIDE.md.
- Il documente les clés de voûte opérationnelles : clés d’API/scopes, statuts métier, dépôts idempotents, uploads multipart, et webhooks PSP.
- Les schémas et endpoints restent ceux du guide ; ici on détaille le *comment* (polling, invalidation, reprises après erreur).
- Les mutations critiques (funding, dépôts, payouts) exigent des protections anti-double clic et un rafraîchissement serveur systématique.
- Les états peuvent évoluer de façon asynchrone (webhooks Stripe, recalculs fraude/AI) : la UI doit surveiller le serveur jusqu’aux états terminaux.
- Les erreurs 409/422 signalent souvent un conflit d’état métier : les traiter comme des divergences de contexte, pas comme des bugs.
- Les uploads imposent type/poids max et retournent `storage_url` + `sha256`; il faut enchaîner avec POST /proofs et du polling.
- Les politiques de retry sont conservatrices : pas de retry aveugle sur les mutations non idempotentes.
- Le flux sender doit piloter les CTA via `viewer_context.allowed_actions` au lieu de déduire les actions côté UI ; ces actions sont calculées par le backend selon la relation d’escrow et l’état courant.【F:app/schemas/escrow.py†L182-L203】【F:app/protocol/policies/escrow_allowed_actions.py†L15-L204】
- Le flux provider doit s’appuyer sur `/provider/inbox/escrows` et `current_submittable_milestone_idx` (inbox) pour guider les soumissions de preuve, plutôt que de déduire l’index côté UI.【F:app/routers/provider_inbox.py†L16-L36】【F:app/schemas/provider_inbox.py†L8-L23】
- Les races courantes (double soumission, onglets multiples, webhook en retard) sont couvertes par des checklists.
- Une table de preuves en annexe recense les citations de code utilisées.

## 2. Golden Rules (Do Not Shoot Yourself)
1. Ne jamais supposer qu’un changement d’état est immédiat (webhooks Stripe/Funding) ; toujours repoller la source serveur (cf. FRONTEND_API_GUIDE, section 6 + endpoints de paiement/funding).【F:app/services/psp_webhooks.py†L121-L218】
2. Travailler uniquement avec les scopes/API keys validés par les dépendances `require_api_key/require_scope` ; envoyer `Authorization: Bearer <token>` ou `X-API-Key`.【F:app/security/__init__.py†L21-L155】
3. Traiter 409/422 comme conflits métier (payout déjà exécuté, séquence de milestone) et rafraîchir les données avant nouvelle action.【F:app/utils/error_codes.py†L60-L86】
4. Ne jamais réessayer une mutation non idempotente sans clé explicite ; `/escrows/{id}/deposit` exige `Idempotency-Key` (même valeur pour retry sûr).【F:app/routers/escrow.py†L119-L140】
5. Après une mutation, déclencher un refetch serveur (pas uniquement mise à jour locale) pour capter les effets webhook/état machine (cf. FRONTEND_API_GUIDE, Endpoint Inventory).
6. Ne pas journaliser d’artefacts sensibles (OCR/EXIF/PII) côté client ; limiter les logs aux codes/ids (voir section 6.3).
7. Ne jamais exposer de contrôles admin/support à des scopes non autorisés ; le backend retournera 403 (`INSUFFICIENT_SCOPE`).【F:app/security/__init__.py†L136-L155】
8. Désactiver les CTA tant que la réponse précédente n’est pas confirmée (pour éviter double submit) ; surveiller les statuts `PENDING/PAYING` avant de réactiver.
9. Pour les uploads, refuser localement les fichiers hors JPEG/PNG/PDF ou >5MB (image)/10MB (PDF) avant d’appeler `/files/proofs`.【F:app/routers/uploads.py†L29-L84】【F:app/config.py†L75-L78】
10. Piloter les CTA à partir de `viewer_context.allowed_actions` (et non par inférence UI) dans `/escrows/{id}/summary` pour refléter les règles relationnelles d’escrow en temps réel.【F:app/services/escrow.py†L1683-L1715】【F:app/protocol/policies/escrow_allowed_actions.py†L15-L204】
11. `viewer_context` expose la relation d’escrow (`relation`), l’identité de vue (`viewer_user_id`) et les capacités (`allowed_actions`) ; traiter cette structure comme la source de vérité d’autorisation relationnelle côté UI.【F:app/schemas/escrow.py†L154-L203】【F:app/services/escrow.py†L1683-L1715】
12. Les preuves/milestones/payouts évoluent via relations d’escrow (viewer_relation), pas via des labels globaux ; se fier aux endpoints, scopes et `viewer_context` du guide.【F:app/security/authz_rel.py†L39-L107】【F:app/schemas/escrow.py†L182-L203】
13. Pour le flux externe, consommer uniquement `/external/escrows/summary` (token-only) et ignorer la variante path `/external/escrows/{escrow_id}` sauf compatibilité legacy.【F:app/routers/external_proofs.py†L318-L389】
14. Traiter les champs redacted comme “non disponibles” : les relations non-OPS ne reçoivent pas les scores AI (`ai_score`, `ai_score_ml`, `ai_risk_level_ml`, `ai_explanation`), `ai_summary_text` n’est visible que pour la relation `SENDER`/OPS, les métadonnées sont filtrées des rails payout/pricing, et `psp_ref`/`idempotency_key` sont nullifiés hors OPS ; ne jamais inférer ces valeurs côté UI.【F:app/utils/redaction.py†L203-L401】【F:app/protocol/policies/ai_exposure_policy.py†L90-L132】【F:app/schemas/payment.py†L8-L33】
15. Les téléchargements signés sont binaires : `GET /files/signed/{token}` renvoie des octets sans JSON, avec `Content-Type` dérivé du stockage et `Content-Disposition` uniquement si `disposition=attachment` est demandé.【F:app/routers/uploads.py†L165-L207】
16. Toujours afficher un message clair sur 401/403 et purger le token si 401 (cf. FRONTEND_API_GUIDE, Auth section).
17. Pas de retry en boucle sur 500 uploads : afficher échec, proposer réupload avec même fichier/sha pour tracer (cf. section 6.2).

## 3. React Query Patterns (Canonical)
### 3.1 Clés de requête (convention)
- `['auth','me']`
- `['escrows','list',filters]`, `['escrows',id]`, `['escrows',id,'summary']`
- `['milestones','byEscrow',escrowId]`, `['milestones',milestoneId]`
- `['provider','inbox',filters]` (pour `/provider/inbox/escrows`).【F:app/routers/provider_inbox.py†L16-L36】
- `['proofs','list',filters]`, `['proofs',proofId]`
- `['payments','admin',filters]`, `['payments',paymentId]`
- `['uploads','proof',sha256]` (cache de métadonnées d’upload)

### 3.2 Fonctions de requête (axios/fetch)
- Utiliser un `apiClient` unique injectant l’API key (`Authorization: Bearer` ou `X-API-Key`). Validation côté backend via `require_api_key` et `require_scope`.【F:app/security/__init__.py†L21-L155】
- Ajouter un intercepteur 401 → purge du token + redirection login (cf. FRONTEND_API_GUIDE, section Auth).
- Préférer `timeout` explicite sur uploads et mutations critiques.

### 3.3 Mutations (create/update/review/approve)
Tableau

| Mutation type | Typical endpoint(s) | Safe optimistic? | Post-success actions | Post-failure actions | Evidence/API_GUIDE ref |
| --- | --- | --- | --- | --- | --- |
| Créer escrow | POST /escrows | Non (attendre statut serveur) | Invalider `['escrows','list']`, précharger `['escrows',id]` | Afficher erreurs de validation, pas de retry auto | FRONTEND_API_GUIDE – Endpoint Inventory |
| Dépôt funding | POST /escrows/{id}/deposit (Idempotency-Key) | Non (traitement PSP) | Lancer polling escrow + summary, désactiver CTA | Si 409/422 → message conflit + refetch | 【F:app/routers/escrow.py†L119-L140】 |
| Session funding PSP | POST /escrows/{id}/funding-session | Non (redir Stripe) | Stocker session, surveiller webhook via polling escrow | Si erreur 5xx → proposer retry manuel | FRONTEND_API_GUIDE – Endpoint Inventory |
| Marquer livré / approve / reject | POST /escrows/{id}/mark-delivered /client-approve /client-reject | Optimisme faible (optionnel) | Refetch escrow, milestones, summary | Sur 422/409 → bannière conflit, refetch | 【F:app/routers/escrow.py†L143-L211】 |
| Upload fichier | POST /files/proofs (multipart) | Non | Mettre en cache `sha256`, passer à POST /proofs | Sur 422 (type/size) garder fichier pour retry | 【F:app/routers/uploads.py†L25-L84】 |
| Soumettre preuve | POST /proofs | Non (fraude/AI async) | Invalider proof list + milestone + escrow summary | Sur 400/403 → message relation/proof mismatch | 【F:app/routers/proofs.py†L33-L52】 |
| Décision preuve | POST /proofs/{id}/decision | Non | Invalider proof, milestones, payments | Sur 409/422 → refetch proof/milestone | 【F:app/routers/proofs.py†L115-L138】 |
| Exécuter payout (sender) | POST /sender/payments/{id}/execute | Non | Invalider payment + summary; démarrer polling payout | Sur 409 (déjà exécuté) → désactiver bouton | 【F:app/routers/sender_payments.py†L12-L39】 |
| Exécuter payout (ops) | POST /payments/execute/{id} | Non | Invalider payment, escrow summary; démarrer polling payout | Sur 409 (déjà exécuté) → désactiver bouton | 【F:app/routers/payments.py†L27-L43】 |
| Lire payout | GET /payments/{id} | N/A | Rafraîchir uniquement la payment ciblée | Sur 404/403 → message accès indisponible | 【F:app/routers/payments.py†L46-L74】 |
| Liste admin payments | GET /admin/payments | N/A | Mettre `keepPreviousData` | Sur 403 → message accès restreint | 【F:app/routers/payments.py†L46-L68】 |

### 3.4 Stratégie d’invalidation (safe minimale)
- Après création escrow : invalider liste + détails.
- Après dépôt/paiement : invalider escrow, summary, payments liés.
- Après upload preuve : invalider proofs list, milestones (pour états PENDING_REVIEW), escrow summary.
- Après décision preuve : invalider proofs, milestones, payments.
- Après payout : invalider payments, escrow summary, proofs (si statut change).

## 4. Polling Strategy (State-Driven)
Tableau recommandé (cadences indicatives, pas un comportement serveur).

| Resource | Endpoint (FRONTEND_API_GUIDE) | When to poll | Cadence | Stop condition | UI state | Failure fallback | Evidence/API_GUIDE ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Funding escrow | GET /escrows/{id} ou /escrows/{id}/summary | Après dépôt ou retour PSP | 3s pendant 60s puis 10s jusqu’à 3–5 min | Escrow.status ∈ {FUNDED, RELEASABLE, REFUNDED, CANCELLED} | Désactiver CTA funding, montrer “Traitement PSP” | Sur 5xx → pause 15s puis retry limité | FRONTEND_API_GUIDE – Endpoint Inventory; webhook async.【F:app/services/psp_webhooks.py†L121-L218】 |
| Proof review | GET /proofs/{id} | Après POST /proofs | 5s pendant 2 min puis 15s | Proof.status ≠ PENDING et champs AI/fraud remplis | Badge “Analyse en cours” | Si 5xx, retry max 3 puis alerte | 【F:app/routers/proofs.py†L33-L112】【F:app/models/proof.py†L36-L77】 |
| Milestone progression | GET /escrows/{id}/milestones | Quand milestone en PENDING_REVIEW/PAYING | 8–12s | Milestone.status ∈ {APPROVED, REJECTED, PAID} | Désactiver actions hors état | Sur 403/404 → stopper et rafraîchir session | 【F:app/routers/escrow.py†L248-L299】【F:app/models/milestone.py†L21-L107】 |
| Payout statut | GET /payments/{id} ou /admin/payments | Après exécution payout | 5s pendant 1 min puis 20s | Payment.status ∈ {SETTLED, ERROR, REFUNDED} | Afficher bandeau succès/échec | Sur 409 → marquer comme déjà traité | 【F:app/routers/payments.py†L27-L68】【F:app/models/payment.py†L12-L52】 |
| Webhook rattrapage | GET /escrows/{id}/summary | Si suspicion retard Stripe | 10s jusqu’à 2–3 min | Summary reflète funding/payout mis à jour | Bannière “Webhook en attente” | Après timeout → bouton “Rafraîchir” manuel | 【F:app/services/psp_webhooks.py†L121-L218】 |

## 5. Retry & Idempotency Doctrine (Fintech-Safe)
### 5.1 Catégories de retry

| Error/Scenario | HTTP codes | Retry? | Backoff | Message utilisateur | Stop | Evidence/API_GUIDE ref |
| --- | --- | --- | --- | --- | --- | --- |
| Rate limit | 429 | Oui, si indiqué (aucune limite détectée → TODO) | Exponentiel 1→2→4s | “Trop de requêtes, réessayez” | 3 tentatives | TODO / Not found |
| Transient serveur | 500 | Oui si idempotent (deposit, upload) | 1→2→4s | “Erreur serveur, nouvelle tentative” | 3 tentatives | 【F:app/routers/uploads.py†L70-L77】 |
| Timeout réseau | n/a | Oui si idempotent | 1→2→4s | “Connexion instable, tentative en cours” | 3 tentatives | FRONTEND_API_GUIDE – section 6 |
| Conflit état | 409 | Non ; refetch et informer | — | “Action déjà effectuée” | 1 | 【F:app/utils/error_codes.py†L82-L86】 |
| Précondition/validation | 422 | Non ; corriger données | — | “Vérifiez le fichier/données” | 1 | 【F:app/routers/uploads.py†L47-L66】 |
| Auth manquante | 401/403 | Non ; redir login ou message accès refusé | — | “Session expirée / accès refusé” | 1 | 【F:app/security/__init__.py†L33-L155】 |

### 5.2 Idempotency keys (si supportées)
- `/escrows/{id}/deposit` exige `Idempotency-Key` et persiste la clé (unique). Réutiliser la même valeur (UUID) pour tout retry réseau/500 afin d’éviter double débit.【F:app/routers/escrow.py†L119-L140】【F:app/models/escrow.py†L104-L118】
- Les paiements possèdent `Payment.idempotency_key` mais les endpoints d’exécution (`/payments/execute/{id}` et `/sender/payments/{id}/execute`) ne demandent pas de header : **RISK**. Mitigation UI : désactiver bouton après clic, afficher spinner, refetch status avant toute réactivation.【F:app/models/payment.py†L41-L47】【F:app/routers/payments.py†L27-L43】【F:app/routers/sender_payments.py†L12-L39】
- Uploads : pas d’idempotency server-side, mais la combinaison `sha256 + storage_url` sert de clé logique ; conserver `sha256` en cache pour les reprises.【F:app/routers/uploads.py†L68-L84】

## 6. Upload Playbook (Proofs / Evidence)
### 6.1 Flux d’upload (pas-à-pas)
1. Prévalider côté client : MIME autorisés {JPEG, PNG, PDF}, poids ≤5MB image / 10MB PDF.【F:app/routers/uploads.py†L29-L84】【F:app/config.py†L75-L78】
2. Appeler `POST /files/proofs` multipart `file`; header API key requis et, si `escrow_id` est fourni, relation d’escrow validée côté backend (sender/provider).【F:app/routers/uploads.py†L88-L128】【F:app/security/ral.py†L71-L182】
3. Suivre la progression (XHR/fetch streaming) ; bloquer CTA tant que l’upload n’est pas terminé.
4. Réponse retourne `storage_url`, `sha256`, `content_type`, `size_bytes`; stocker localement.【F:app/routers/uploads.py†L68-L84】
5. Enchaîner POST `/proofs` en JSON avec `escrow_id`, `milestone_id/idx`, `type`, `storage_url`, `sha256`, `metadata`.【F:app/routers/proofs.py†L33-L52】
6. Dès succès, lancer polling `GET /proofs/{id}` (voir section 4) et rafraîchir milestones/summary.

### 6.2 Gestion des échecs (tableau)

| Failure mode | Symptom | Likely cause | UI reaction | User action | Recovery steps | Evidence/TODO |
| --- | --- | --- | --- | --- | --- | --- |
| Type interdit | 422 + `UNSUPPORTED_FILE_TYPE` | MIME ≠ jpeg/png/pdf | Message blocant, garder fichier | Choisir format supporté | Revalider MIME avant retry | 【F:app/routers/uploads.py†L47-L51】 |
| Fichier trop lourd | 422 + `FILE_TOO_LARGE` | >5MB image ou >10MB PDF | Message poids + taille max | Réduire taille | Retenter upload | 【F:app/routers/uploads.py†L56-L66】【F:app/config.py†L75-L78】 |
| Échec stockage | 500 + `FILE_UPLOAD_FAILED` | Stockage indisponible | Alerte rouge, bouton “Réessayer” désactivé 5s | Relancer upload | Garder `sha256` pour traçabilité | 【F:app/routers/uploads.py†L70-L77】 |
| Auth manquante | 401/403 | Clé absente ou invalide | Redir login | Se reconnecter | Relancer upload | 【F:app/security/__init__.py†L33-L155】 |
| Duplicate sha | 409/422 service | `sha256` déjà existant | Avertir “déjà envoyé” | Passer à POST /proofs existant si autorisé | Refetch proof list par `sha256` | 【F:app/models/proof.py†L34-L77】 |
| Réseau coupé | Timeout | Connexion perdue | Notif “Connexion interrompue” | Vérifier réseau | Retry avec même fichier | FRONTEND_API_GUIDE – section 6 |
| OCR/AI manquant | Statut reste PENDING | Pipeline lent | Badge “Analyse en cours” | Attendre | Continuer polling | 【F:app/models/proof.py†L36-L77】 |
| Geofence/EXIF rejet | 422 `GEOFENCE_VIOLATION`/`EXIF_*` | Métadonnées invalides | Message blocant, masquer données sensibles | Reprendre photo conforme | Afficher conseils capture | 【F:app/utils/error_codes.py†L102-L119】 |
| Mismatch provider | 403 `NOT_ESCROW_PROVIDER` | Relation d’upload incorrecte | Message relation + disable | Se connecter avec le bon compte | Rafraîchir escrows pour relation | 【F:app/utils/error_codes.py†L87-L101】 |
| Metadata invalide | 422 Pydantic | Champs manquants/vides | Erreurs champ | Corriger form | Resoumettre POST /proofs | 【F:app/routers/proofs.py†L33-L52】 |
| Webhook retard | Proof bloquée en PENDING | PSP/fraude en décalage | Banner “Analyse en attente” | Attendre | Polling + refetch summary | 【F:app/services/psp_webhooks.py†L121-L218】 |

### 6.3 Sécurité & vie privée
- Ne jamais logguer le contenu OCR/EXIF ni les coordonnées exactes ; limiter aux codes d’erreur et IDs preuve/escrow.
- Les métadonnées `invoice_merchant_metadata` contiennent des informations sensibles (comptes, OCR) : ne pas afficher/bruiter côté client sauf vues autorisées.【F:app/models/proof.py†L48-L58】
- Purger toute donnée brute des journaux client ; préférer des événements analytiques anonymisés.

## 7. Race Conditions & Consistency (Real World)
Tableau

| Race condition | Symptom | Root cause | UI mitigation | Server-truth check | Evidence/TODO |
| --- | --- | --- | --- | --- | --- |
| Webhook Stripe en retard | Funding/payout ne s’actualise pas tout de suite | Traitement async webhook | Poll summary/escrow pendant 3–5 min, bannière d’attente | `GET /escrows/{id}/summary` + `GET /payments/{id}` | 【F:app/services/psp_webhooks.py†L121-L218】 |
| Double clic dépôt/payout | Paiement exécuté deux fois | Mutation non idempotente côté payout | Désactiver bouton après clic, spinner | Refetch payment status avant réactivation | 【F:app/routers/payments.py†L27-L43】【F:app/models/payment.py†L41-L47】 |
| Deux onglets approbation preuve | Statut change sans synchro | Décision concurrente support/sender | Refetch proof + milestone après focus | `GET /proofs/{id}` avant CTA | 【F:app/routers/proofs.py†L115-L138】 |
| Upload répété | `sha256` déjà vu | Même fichier soumis | Dédupliquer via cache `sha256`, message “déjà envoyé” | Vérifier proof list | 【F:app/routers/uploads.py†L68-L84】【F:app/models/proof.py†L34-L77】 |
| Session auth expirée | Requêtes 401 au milieu d’un flow | API key expirée/invalide | Intercepteur 401 → logout | `GET /auth/me` | 【F:app/security/__init__.py†L33-L155】 |
| Invalidation tardive | UI montre ancien statut | Cache stale | Invalidate clés après mutation | Refetch ciblé | FRONTEND_API_GUIDE – sections 3 & 6 |

## 8. Role-Aware UX (Minimal Safety Layer)
- Les scopes acceptés par endpoint sont dans FRONTEND_API_GUIDE ; le backend refuse toute dérive via `require_scope` (403).【F:app/security/__init__.py†L136-L155】
- Adapter l’UI selon la relation d’escrow (`viewer_context.relation`) et `viewer_context.allowed_actions` retournés par `/escrows/{id}/summary`, plutôt que des labels globaux.【F:app/services/escrow.py†L1683-L1715】【F:app/schemas/escrow.py†L182-L203】
- Respecter la redaction relationnelle : les relations non-OPS voient les scores AI (`ai_score`, `ai_score_ml`, `ai_risk_level_ml`, `ai_explanation`) nuls, `ai_summary_text` est réservé à la relation `SENDER`/OPS, les métadonnées perdent les rails payout/pricing, et `psp_ref`/`idempotency_key` restent nullifiés hors OPS ; la UI doit accepter ces nulls sans inférence côté client.【F:app/utils/redaction.py†L203-L401】【F:app/protocol/policies/ai_exposure_policy.py†L90-L132】
- Les champs suivants peuvent rester nuls selon la relation ou l’état : `current_submittable_milestone_id`/`current_submittable_milestone_idx` (aucun milestone ouvert), `storage_key` (preuve legacy), `psp_ref`/`idempotency_key` (exécution non effectuée ou redaction).【F:app/schemas/escrow.py†L230-L236】【F:app/schemas/proof.py†L115-L189】【F:app/schemas/payment.py†L8-L33】【F:app/utils/redaction.py†L343-L401】
- En cas de 403, afficher un message “Action non autorisée” et masquer durablement les CTA concernés.
- Ne jamais rendre visibles des actions admin/support sur le client grand public, même cachées par CSS.

## 9. Operational Checklists
### 9.1 Avant de livrer un changement UI
- [ ] Endpoints et scopes vérifiés avec FRONTEND_API_GUIDE.
- [ ] Pas de nouveaux retries non idempotents.
- [ ] Fenêtre de polling définie par état (funding/proof/payout).
- [ ] Messages d’erreur mappés aux codes catalogués.
- [ ] Champs sensibles (PII/OCR/EXIF) non loggés.

### 9.2 Lors du debug en production
- [ ] Capturer request-id (si dispo), timestamps, dernier état connu (escrow/proof/payment).
- [ ] Reproduire avec appels read-only (`GET`) avant toute mutation.
- [ ] Vérifier l’hypothèse de retard webhook (Stripe) avant de réessayer.
- [ ] Pour 409/422, relire FRONTEND_API_GUIDE (doctrine erreurs) pour comprendre le conflit.

## 10. Evidence Index (Appendix)
- Auth & scopes : validation header et scopes via dépendances FastAPI.【F:app/security/__init__.py†L21-L155】
- Escrow router : dépôt idempotent, funding session, actions sender, summary, milestones.【F:app/routers/escrow.py†L99-L299】
- Uploads : multipart proof, MIME/poids max, codes d’erreur, stockage sha256.【F:app/routers/uploads.py†L25-L84】【F:app/config.py†L75-L78】
- Proofs : soumission, listage, décision, statut par défaut, métadonnées sensibles.【F:app/routers/proofs.py†L33-L138】【F:app/models/proof.py†L34-L77】
- Milestones : statuts/validators et structure.【F:app/models/milestone.py†L21-L107】
- Payments : exécution payout, statut, idempotency_key, channel.【F:app/routers/payments.py†L27-L68】【F:app/models/payment.py†L12-L52】
- Webhooks PSP/Stripe : traitement async, signatures, rejets, rejouabilité.【F:app/services/psp_webhooks.py†L72-L218】【F:app/services/psp_webhooks.py†L371-L515】
- Error catalog : codes 403/409/422/500 etc.【F:app/utils/error_codes.py†L10-L140】

Changelog (this update)
- Réécriture complète en playbook opérationnel React Query + sécurité UI.
- Ajout des règles d’or + doctrine retry/idempotence adaptées aux flux PSP.
- Stratégie de polling par ressource avec cadences recommandées.
- Playbook upload détaillé (limites, retries, recovery) + 10 modes d’échec.
- Tableau des races communes et mitigations UI.
- Checklists pré-livraison et debug prod.

TODO / Not found
- Limites de débit/429 non trouvées (recherches `rg -n "429" app`, `rg -n "RateLimit" app`).
- Aucun endpoint supplémentaire de presigned upload détecté (recherche `presign`, `signed_url`).
- Pas de politique de tri explicite (recherche `order_by` dans routeurs côté pagination).
