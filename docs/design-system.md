# Sistema de diseño

Identidad: hospitalidad cálida y software empresarial confiable. Se evita la estética neón. Las asociaciones de color son orientativas y dependen del contexto cultural; se prioriza la usabilidad.

| Token | Valor | Uso |
| --- | --- | --- |
| Ink | #172B4D | Navegación, títulos y marca |
| Brand | #C2410C | Acciones primarias |
| Brand hover | #9A3412 | Interacción |
| Canvas | #F8F5F0 | Fondo de trabajo |
| Surface | #FFFFFF | Tarjetas y formularios |
| Muted | #475569 | Texto secundario |
| Line | #E1DBD3 | Separadores |
| Success | #0F766E | Pagado, disponible, completado |
| Warning | #92400E | Pendiente o alerta no crítica |
| Info | #1D4ED8 | Información y confirmación |
| Danger | #B91C1C | Error, cancelación, stock crítico |

Los tokens están definidos en src/app/globals.css y expuestos como utilidades Tailwind. Evitar colores arbitrarios fuera del sistema.

## Accesibilidad y operación
- Texto y símbolos acompañan a todos los estados; el color no es el único indicador.
- Objetivo WCAG 2.2 AA: comprobar contraste de texto y controles, navegación por teclado y foco visible antes de publicar.
- Priorizar superficies claras, densidad moderada, tipografía legible y áreas táctiles amplias en POS.
- Reservar rojo para errores y acciones destructivas; naranja para CTA y preparación; verde petróleo para confirmaciones.
- Usar tablas en administración y tarjetas solo cuando ayuden a explorar información.
- Usar números tabulares en totales y reportes; distinguir estados de pedido, cocina y pago.

La landing presenta conceptos de producto, no una demo funcional. Las capturas promocionales deberán proceder del software ejecutado con datos ficticios.

## Pantallas de catálogo y mesas
Las referencias aprobadas utilizan paneles crema con bordes sutiles, tarjetas blancas de 13px de radio y una tipografía compacta. En catálogo se muestran dos formularios en paralelo desde pantallas medianas; productos en filas con icono gastronómico, nombre, disponibilidad, precio y acceso de edición. Descripción, variantes y edición se despliegan cuando son necesarias. En mesas se muestran tres indicadores y una cuadrícula de hasta tres columnas; el gráfico de sillas representa la capacidad (hasta ocho sillas dibujadas, con capacidad exacta en texto), y el color representa habilitación administrativa. La creación y edición son desplegables. Los datos siempre provienen de PostgreSQL; no se precargan los valores ilustrativos de las referencias.

## Inventario: movimientos
El selector de tipo utiliza tres botones interactivos de selección exclusiva, con SVG y texto: entrada verde petróleo, salida terracota y merma roja. La selección tiene borde y aria-pressed, con foco visible y navegación por teclado. El formulario envía el valor elegido mediante un campo oculto. El stock mínimo permanece accesible en un desplegable separado. El formulario usa campos de ancho completo. El historial conserva esos colores y símbolos, con motivo bajo el nombre y cantidad alineada a la derecha. Responsable, fecha y saldo se consultan al desplegar la fila, sin perder trazabilidad.

## Adaptación y accesibilidad (8.5)
Menú administrativo plegable nativo en pantallas inferiores a 1024px; navegación lateral en escritorio. Los enlaces Saltar al contenido y Saltar al formulario permiten evitar navegación repetitiva; los destinos admiten foco programático. Los módulos mantienen el diseño crema y terracota con campos de 44px como mínimo, texto de formularios de 16px en móviles, bordes de controles #64748B y anillo de foco de doble contraste. Controles del inventario mantienen sus tamaños originales. POS incluye enlaces al carrito y de regreso a productos; nombres accesibles específicos para cada producto y variante; cantidad de artículos en región de estado. La gráfica de ingresos es decorativa para lectores de pantalla porque sus cifras están disponibles en el desplegable textual. No se deshabilita zoom. Se respeta prefers-reduced-motion. npm run ui:contrast comprueba 21 pares de tokens, no todos los elementos renderizados.

Verificar manualmente 320, 375, 768 y 1440px, zoom al 200%, navegación con Tab/Shift+Tab/Enter/Espacio, menú plegable, salto al contenido, flujo POS y lectura de errores, estados y gráficos. Confirmar ausencia de desbordamiento horizontal del documento y que el desplazamiento interno de gráficas sea utilizable. Probar lectores de pantalla, Chrome/Edge, Firefox y Safari antes de declarar conformidad WCAG 2.2 AA. No se ha realizado esa certificación ni pruebas exhaustivas de navegador en esta etapa.
