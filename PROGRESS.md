# Mis Finanzas FM

Copia de ~/Developer/finanzas-voz (la original queda básica para otros usos) con el método de los 6 frascos, cartera de inversiones, metas y cuotas. App personal de Felipe.
Repo/URL: FelipeManrique/mis-finanzas-fm → felipemanrique.github.io/mis-finanzas-fm/
Datos aislados: localStorage `mf-fm:`, IndexedDB `mis-finanzas-fm`, Drive `mf-fm*.enc.json`, cache SW `mf-fm-`.
## Frascos e inversión (pedido 2026-10-08) — sólo en Mis Finanzas (app de Felipe)
Perfil: ~$715k/mes en 2 cobros (sueldo $360k a principio de mes + pensión ~$355k a mitad, ajusta por inflación),
vive con los padres, gastos ~$370k/mes, cuotas de tarjeta que terminan en 4–6 meses, dona ~$10k/mes, invierte (BTC, SPY/QQQ, renta fija).
Acordado: 6 frascos adaptados — Gastos del mes 45% · Diversión 10% · Ahorro a largo plazo 25% · Libertad financiera 18,5% · Dar $10.000 fijo.
Reparto en cada cobro. Colchón = 6 meses de gastos reales (fase 1), después metas (mudanza, auto, viaje). Sin frasco educación (va a largo plazo).
Cartera: tenencias + precios automáticos, renta fija vs variable (BTC en variable). Primero sólo en la app; después apartados reales.
NO dar recomendaciones de inversión (no somos asesores).
- [x] parser: tipo inversión + categorías renta fija/variable + Donaciones
- [x] frascos: reparto por cobro (fijos primero), mapeo categoría→frasco, saldos
- [x] metas: colchón automático + metas en orden
- [x] cartera: tenencias, precios (CoinGecko directo; acciones/CEDEAR/dólar vía intermediario Apps Script)
- [x] cuotas: lista, fin y plata liberada
- [x] ajustes del método, pestaña Plan, pruebas, publicar
- [x] publicado: https://felipemanrique.github.io/mis-finanzas-fm/
