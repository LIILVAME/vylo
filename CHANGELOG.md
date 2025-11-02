# Changelog

All notable changes to Doogoo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Framework de versioning et release automatique
- Workflow CI/CD GitHub Actions complet
- Documentation complète du processus de release

### Changed

- Amélioration de la gestion des états de chargement (LocatairesPage)
- Correction des conditions d'affichage pour éviter les loaders bloqués

### Fixed

- Correction bug chargement infini sur page Locataires
- Amélioration gestion loading dans fetchProperties
- Nettoyage des logs de debug en production

---

## [0.2.2] - 2025-11-02

### Changed

- Migration complète vers LinguiJS pour i18n
- Refactorisation architecture (API layer, Circuit Breaker)
- Améliorations SEO et analytics

### Fixed

- Corrections multiples de bugs de chargement
- Amélioration gestion erreurs API
