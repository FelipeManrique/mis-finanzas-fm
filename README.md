# Mis Finanzas FM

Versión de Mis Finanzas con el método de los 6 frascos adaptado, cartera de inversiones con precios automáticos,
metas (colchón de emergencia + objetivos) y seguimiento de cuotas. Basada en la app original, que queda básica.

- Frascos: Gastos del mes 45% · Diversión 10% · Ahorro a largo plazo 25% · Libertad financiera 20% · Dar $10.000 fijo (los % suman 100 sobre ingresos − Dar).
  Cada cobro se reparte al entrar (fijos una vez por mes, el resto en proporción). Editables en Ajustes.
- Movimientos: ingreso, gasto e inversión, por voz ("invertí 100 mil en bitcoin", "puse 200 mil en el plazo fijo").
- Metas: colchón = N meses del promedio real de gastos; después las metas en orden de prioridad.
- Cartera: tenencias por activo; precios de Yahoo Finance (acciones/ETF/CEDEAR) y dolarapi vía el intermediario
  de Apps Script, y CoinGecko directo. Renta fija vs. variable. No es asesoramiento financiero.
- Cuotas: monto, cuántas faltan, cuándo terminan y cuánto se libera.

Datos aislados de las otras apps (prefijo `mf-fm:`). Tests: `node test/parser.test.js` · `node test/vault.test.js`

© 2026 Felipe Manrique. Todos los derechos reservados. Ver [LICENSE](LICENSE).
