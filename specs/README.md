# MQTT Middleware Pro - Specifications

**Version:** 1.0  
**Date:** 2026-03-04

This directory contains all technical specifications for the MQTT Middleware Pro system.

## Documentation Index

| Document                                         | Purpose                                                                                      | Audience                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **[`prd.md`](prd.md)**                           | Product Requirements - system overview, functional requirements, non-functional requirements | Product managers, architects, developers |
| **[`architecture.md`](architecture.md)**         | System architecture - module design, data flow, interfaces, deployment                       | Architects, lead developers              |
| **[`API.md`](API.md)**                           | Complete API documentation - REST endpoints, WebSocket protocol, examples                    | Frontend developers, API consumers       |
| **[`SUO_UOS_DB_Spec.md`](SUO_UOS_DB_Spec.md)**   | Data layer specification - SIF to SUO transformation, UOS cache, database schema             | Backend developers, DBAs                 |
| **[`V5008_Spec.md`](V5008_Spec.md)**             | V5008 device protocol - binary message parsing, SIF transformation                           | Backend developers, firmware engineers   |
| **[`v6800_spec.md`](v6800_spec.md)**             | V6800 device protocol - JSON message parsing, SIF transformation                             | Backend developers, firmware engineers   |
| **[`dashboardPro_prd.md`](dashboardPro_prd.md)** | Dashboard frontend specification - UI design, data contracts, state management               | Frontend developers                      |

### Module Documentation

| Document                                                                         | Purpose                                                      | Audience           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------ |
| **[`../docs/modules/smart-hb.md`](../docs/modules/smart-hb.md)**                 | SmartHB module - heartbeat processing and device info repair | Backend developers |
| **[`../docs/modules/protocol-adapter.md`](../docs/modules/protocol-adapter.md)** | ProtocolAdapter module - V5008/V6800 behavior alignment      | Backend developers |

## Quick Reference

### System Overview

```
RAW (Device) → SIF → SUO → UOS (Cache) + DB (MySQL)
```

### Supported Devices

- **V5008**: Binary protocol ([spec](V5008_Spec.md))
- **V6800**: JSON protocol ([spec](v6800_spec.md))

### Data Layers

| Layer   | Format      | Storage         | Spec                         |
| ------- | ----------- | --------------- | ---------------------------- |
| **RAW** | Binary/JSON | MQTT transient  | V5008_Spec.md, v6800_spec.md |
| **SIF** | JSON        | Transient       | SUO_UOS_DB_Spec.md           |
| **SUO** | JSON        | UOS + DB        | SUO_UOS_DB_Spec.md           |
| **UOS** | JSON        | In-memory cache | SUO_UOS_DB_Spec.md           |
| **DB**  | SQL         | MySQL           | SUO_UOS_DB_Spec.md           |

### API Endpoints

- **REST**: `http://localhost:3000/api/v1` ([details](API.md))
- **WebSocket**: `ws://localhost:3001/ws` ([details](API.md))
- **Health**: `http://localhost:3000/health`

## Document Relationships

```
prd.md (requirements)
    ↓
architecture.md (design)
    ↓
├── V5008_Spec.md ──┐
└── v6800_spec.md ──┼──→ SUO_UOS_DB_Spec.md
                    ↓
              API.md (interface)
                    ↓
            dashboardPro_prd.md (frontend)
```

## Version History

| Date       | Changes                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| 2026-03-05 | Added SmartHB Device Info Repair and ProtocolAdapter module documentation |
| 2026-03-04 | Consolidated specs, added WebSocket docs to API.md, standardized versions |
| 2026-03-01 | Added dashboard PRD                                                       |
| 2026-02-28 | Updated device protocol specs (V5008, V6800)                              |
| 2026-02-26 | Initial architecture document                                             |
| 2026-02-25 | Initial PRD                                                               |

---

**DRY Principle**: These documents follow the DRY (Don't Repeat Yourself) principle. For detailed API reference, always consult [`API.md`](API.md). For implementation details, consult the relevant device protocol specs.
