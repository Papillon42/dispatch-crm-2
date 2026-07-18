# Driver Operational Status System

Полная система управления операционными статусами водителей: справочник статусов,
контролируемые переходы, синхронизация водитель ↔ груз ↔ трак, история, realtime-карта,
геозоны, RBAC и audit log.

## Как применить изменения БД

Проект исторически использует `prisma db push`:

```bash
npx prisma generate
npx prisma db push          # применяет дельту схемы
npx tsx prisma/seed.ts      # сидирует справочник статусов (если БД пустая)
```

Эквивалентная SQL-миграция лежит в `prisma/migrations/20260718_driver_status_system/migration.sql`
(для команд, работающих через `prisma migrate deploy`).

Справочник статусов автоматически сидируется при первом обращении к `GET /api/statuses`
(или сервису статусов), поэтому на существующей БД достаточно `db push`.

## Архитектура

| Слой | Файл | Что делает |
|---|---|---|
| Домен | `src/lib/driverStatus.ts` | 15 системных статусов, переходы, обязательные поля, маппинг на LoadStatus, геозоны. Чистые функции, покрыты unit-тестами |
| Сервис | `src/lib/services/driverStatus.service.ts` | `updateDriverOperationalStatus()` — атомарная транзакция: водитель + груз + трак + история + audit + activity + уведомления, затем realtime-событие. `recordDriverLocation()` — GPS + геозонные подсказки. `syncDriverFromLoadStatus()` — обратная синхронизация из пайплайна грузов |
| Realtime | `src/lib/realtime.ts`, `/api/realtime/stream`, `src/hooks/useRealtime.ts` | SSE-шина: `driver.status.updated`, `driver.location.updated`. RBAC-фильтрация на сервере, авто-reconnect, индикатор подключения, polling-fallback |
| API | см. ниже | REST-endpoints c zod-валидацией и rate limiting |
| UI | `/drivers/[id]`, `ChangeStatusModal`, `StatusHistoryTimeline`, `FleetMapWorkspace`, `SettingsWorkspace` | Карточка водителя, модалка смены статуса, timeline истории, карта с фильтрами, админ-справочник |

## API

```
GET    /api/statuses                      справочник (auto-seed), ?all=1 — с отключенными (admin)
POST   /api/statuses                      добавить кастомный статус (admin)
PATCH  /api/statuses/:id                  переименовать/цвет/выключить/переходы (admin)
DELETE /api/statuses/:id                  только кастомные и неиспользуемые

GET    /api/drivers/:id                   полная карточка водителя
PATCH  /api/drivers/:id/status            смена статуса (единая точка входа)
PATCH  /api/drivers/:id/location          GPS/ручное обновление позиции
GET    /api/drivers/:id/status-history    timeline истории (append-only)
GET    /api/drivers/:id/location-history  история GPS

GET    /api/map/drivers                   карта: фильтры status/hasLoad/dispatcherId/clientId/
                                          truckId/loadId/staleGps/overdueEta/search/bounds
GET    /api/map/loads                     активные грузы с маршрутами
GET    /api/realtime/stream               SSE
GET|PATCH /api/notifications              внутренние уведомления
POST   /api/cron/location-retention       retention GPS-истории (Bearer CRON_SECRET)
```

Пример смены статуса:

```json
PATCH /api/drivers/driver_123/status
{
  "status": "IN_TRANSIT",
  "loadId": "load_456",
  "origin": { "address": "Chicago, IL", "latitude": 41.8781, "longitude": -87.6298 },
  "destination": { "address": "Dallas, TX", "latitude": 32.7767, "longitude": -96.797 },
  "currentLocation": { "latitude": 39.78, "longitude": -89.65, "label": "Springfield, IL" },
  "eta": "2026-07-20T21:30:00Z",
  "comment": "Driver departed from pickup facility"
}
```

Ответ содержит обновлённого водителя, груз, трак, запись истории и данные для карты.
`409 { code: "OVERRIDE_REQUIRED" }` — нестандартный переход: повторить с
`manualOverride: true` + `reason` (только ADMIN / SENIOR_DISPATCHER).

## Переходы

Нормальная последовательность:
`AVAILABLE → ASSIGNED → TO_PICKUP → AT_PICKUP → LOADING → ON_LOAD → IN_TRANSIT → AT_DELIVERY → UNLOADING → DELIVERED → AVAILABLE`

* «Жёсткие» блокировки (не обходятся): статус, требующий груз, без активного груза;
  переход в тот же статус.
* Нестандартные переходы — предупреждение → причина → запись в историю и audit log
  с флагом `isManualOverride`.
* `AVAILABLE` при незавершённом грузе — только через override.
* Updater может двигать водителя только по операционному пайплайну.

## Синхронизация

Одна транзакция обновляет: `Driver` (status, current*), `Load` (status + loadedAt /
actualDepartureAt / actualDeliveryAt / estimatedArrivalAt + маршрут), `Truck`
(currentLoadId, maintenanceStatus), `DriverStatusHistory`, `LoadStatusHistory`,
`AuditLog` (+meta: role/source/isAutomatic/isManualOverride), `ActivityLog`,
`Notification`. Ошибка любого шага — полный rollback.

Обратная синхронизация: `PATCH /api/loads/:id/status` и driver-app вызывают
`syncDriverFromLoadStatus()`.

## Как подключить GPS

Слать точки в `PATCH /api/drivers/:id/location` (CRM-роль) или
`POST /api/driver-app/location` (driver app), поле `source: GPS | ELD | MANUAL`.
Рекомендуемый интервал: 15–30 сек в движении, 1–5 мин на стоянке. Сервис сам
обновит карту (realtime), ETA, деноормализованную позицию груза и посчитает
геозонные подсказки. Автоприменение — только при `autoStatusMode = AUTO`
в Settings (все автосмены логируются как `isAutomatic`).

## Переменные окружения

Новых нет. Используются существующие: `DATABASE_URL`, Clerk-ключи,
`CRON_SECRET` (для retention-cron).

## Тесты

```bash
npm test          # vitest: 20 unit-тестов state machine / required fields / sync mapping / геозон
npm run typecheck
```

Ручной E2E-сценарий: Drivers → карточка водителя → Change Status по цепочке
до Delivered → Available; во втором браузере карта/список обновляются без
перезагрузки (SSE). История — вкладка Status History.

## Ограничения и следующие шаги

* Realtime-шина in-process: при нескольких инстансах нужен Redis pub/sub мост в
  `publishRealtimeEvent` (контракт подписчиков не меняется).
* Геокодинг адресов — справочник городов (`src/lib/geo.ts`); для продакшена
  подключить Mapbox/Google Geocoding.
* `minGeofenceMinutes` учитывается упрощённо (по текущей точке, без таймера
  пребывания в зоне) — для точного dwell-time нужен worker.
* Кластеризация маркеров включится автоматически при >200 маркерах (OpenLayers
  Cluster source) — сейчас не критично, отложено.
* Уведомления внешних каналов (Telegram/SMS/email/push) — архитектура готова:
  worker может читать непрочитанные `Notification` и рассылать.
