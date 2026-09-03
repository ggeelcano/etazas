# Brief de curación — demo tienda eTazas (Premià de Dalt)

## Quién es el cliente
eTazas (etazas.com), taller de serigrafía y merchandising en Premià de Dalt (Barcelona), grupo MG Merchandising SCP. Estampan tazas, bolsas de tela, camisetas, bidones, bolis, libretas, gorras, paraguas y delantales con el logo del cliente. Técnicas: serigrafía, vinilo textil, sublimación, tampografía, transfer, bordado, DTF. Sin cantidad mínima (desde 1 unidad), urgentes en 24-48 h, departamento de diseño propio. Clientes tipo: empresas, colegios y AMPAs, ayuntamientos, bares y restaurantes, eventos y equipos.

Quieren una tienda "tipo euroserigrafia.com pero con menos producto porque lía mucho": un catálogo curado (~1000 refs) alimentado por las APIs B2B de los mayoristas **Makito** (regalo promocional) y **Roly** (textil). Los candidatos vienen de esos dos catálogos públicos.

## Qué hay que devolver por categoría
1. **Picks** (6 a 8 productos): los que un cliente de eTazas pediría de verdad. Prioriza lo clásico y vendible (taza cerámica blanca 350 ml, bidón deportivo, bolsa de algodón natural, boli de plástico barato, libreta A5, gorra 5 paneles, camiseta 150 g...), luego un par de opciones "premium" o eco. Descarta rarezas (calentadores de tazas, gadgets) salvo que aporten variedad razonable.
2. **Nombre comercial** para TODOS los candidatos de la categoría (no solo los picks): en español, descriptivo y corto, tipo "Taza cerámica 350 ml Milayka" o "Camiseta algodón 150 g Atomic". Mantén el nombre de modelo del mayorista al final (Larsen, Atomic, Ridof...). No inventes datos: usa solo material, capacidad, gramaje o medidas que estén en la ficha. Si no hay dato, nombre genérico + modelo ("Bolsa de algodón Larsen").
3. **Subcategoría** corta para todos (ej. "Cerámica", "Térmica", "Acero inox", "Algodón", "Non-woven", "Cordón", "Plegable", "Manga corta", "Orgánica", "Infantil", "Plástico", "Metal", "Bambú").
4. **Blurb** solo para los picks: 1-2 frases en español llano, sin adjetivos grandilocuentes, sin ternas, sin rayas. Solo hechos de la ficha (material, capacidad, técnicas, colores disponibles) y para qué sirve. Ejemplo: "Bolsa de algodón de 105 g con asas largas. Se estampa en serigrafía a 1 o varias tintas y hay 6 colores de tela."
5. **Precios** (IVA incluido, por unidad, marcaje a 1 tinta incluido): `base` = precio a 1 unidad y `desde` = precio a partir de 250 unidades. Deben caer dentro de los anclajes de abajo (son los precios reales que eTazas publica hoy en su web). Ajusta dentro del rango según calidad del artículo (gramaje, material, capacidad).
6. `destacado`: marca 2 picks por categoría (los que irían en portada). `eco`: true si el material es orgánico, reciclado, RPET, bambú, corcho o la ficha lo indica.

## Anclajes de precio (€/ud IVA incl.) — base a 1 ud → desde a 250+ uds
| Categoría | Tipo | base (1 ud) | desde (250+) |
|---|---|---|---|
| tazas | cerámica clásica 300-350 ml | 8,10-10,00 | 2,84-3,50 |
| tazas | cerámica con asa/interior color, vintage, base corcho | 9,00-13,00 | 3,15-5,46 |
| tazas | acero esmaltada / térmica / con tapa | 11,00-14,00 | 3,85-4,90 |
| tazas | vaso térmico 370-450 ml | 10,00-12,00 | 3,50-6,24 |
| bidones | plástico/PET 500-650 ml | 2,60-5,40 | 1,35-2,81 |
| bidones | aluminio 650-800 ml | 7,50-10,00 | 3,90-5,20 |
| bidones | acero inox 500-750 ml | 8,00-15,00 | 4,16-7,80 |
| bidones | cristal 500 ml | 10,00 | 5,20 |
| termos | termo café/té, vaso térmico acero | 12,00-16,00 | 6,24-8,50 |
| bolsas | algodón natural 105-140 g | 2,20-3,65 | 1,14-1,90 |
| bolsas | algodón orgánico / reciclado / yute | 3,19-4,00 | 1,66-2,08 |
| bolsas | con fuelle o colores | 3,20-4,62 | 1,66-2,40 |
| bolsas | non-woven (TNT) | 0,60-1,00 | 0,37-0,55 |
| bolsas | cordón algodón pequeña/mediana/grande | 1,25-2,50 | 0,65-1,30 |
| bolsas | plegable poliéster | 1,50-3,80 | 0,78-1,98 |
| mochilas | mochila de cuerdas algodón | 3,75-4,50 | 1,95-2,30 |
| mochilas | mochila con cremallera | 10,00 | 1,40-5,00 |
| boligrafos | plástico | 0,60-1,20 | 0,22-0,45 |
| boligrafos | metal / roller / set | 2,00-6,00 | 0,90-3,00 |
| boligrafos | lápiz / ecológico cartón-bambú | 0,50-1,50 | 0,20-0,60 |
| libretas | libreta A5/A6 tapa blanda o cartón | 3,00-5,50 | 1,20-2,50 |
| libretas | set libreta + boli, tapa dura | 5,00-9,00 | 2,20-4,50 |
| paraguas | plegable | 10,00-14,00 | 4,50-6,50 |
| paraguas | XL golf / automático | 14,00-22,00 | 7,50-11,00 |
| delantales | delantal algodón o poliéster | 6,50-9,50 | 3,20-4,60 |
| delantales | manopla / set cocina | 4,00-7,00 | 1,80-3,20 |
| gorras | gorra 5-6 paneles adulto | 3,90-6,50 | 1,70-2,90 |
| gorras | gorra infantil | 3,50-5,00 | 1,50-2,40 |
| neceseres | neceser/estuche algodón | 3,20-4,50 | 1,66-2,20 |
| neceseres | neceser poliéster/RPET | 3,00-6,00 | 1,40-3,00 |
| lanyards | lanyard 2 cm sublimado o 1 tinta | 1,20-1,80 | 0,40-0,70 |
| posavasos | corcho / cartón / cerámica | 1,20-3,00 | 0,45-1,40 |
| camisetas | algodón 150 g adulto | 4,90-6,50 | 1,95-2,90 |
| camisetas | algodón 165-190 g, peinado, entallada mujer, infantil | 5,90-8,50 | 2,50-3,90 |
| camisetas | técnica poliéster deporte | 5,50-8,00 | 2,40-3,60 |
| camisetas | orgánica | 7,50-9,90 | 3,40-4,60 |
| camisetas | tirantes | 4,50-6,00 | 1,80-2,60 |
| sudaderas | con o sin capucha 280 g | 14,50-19,90 | 8,90-12,50 |
| polos | piqué 200-220 g | 8,90-12,90 | 4,90-6,90 |
| eco | según tipo de prenda: usa el rango de camisetas/sudaderas/polos orgánica +10 % | | |

## Reglas de redacción (obligatorias)
- Español de España, llano. Nada de "increíble", "premium" sin motivo, "imprescindible", "ideal para cualquier ocasión".
- Sin ternas rítmicas (tres adjetivos seguidos), sin rayas largas, sin exclamaciones.
- Cero datos inventados: si no consta la capacidad o el gramaje en la ficha, no lo pongas.
