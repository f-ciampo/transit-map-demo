# [demo.transit.ar](https://demo.transit.ar)
Demo (en construcción) de un mapa de transporte esquemático que se vuelve geográfico al ampliarlo.<br/>

<img src="gitAssets/zoom.gif" width=400>

*Actualmente está incompleto y no funciona bien en teléfonos, pantallas UHD/Retina, o Firefox.*
*Hosteado en [demo.transit.ar](https://demo.transit.ar)*

<br/>

**Principio de funcionamiento**<br/>
Cada elemento del mapa tiene una posición distinta para cada nivel de zoom. Al acercar o alejarse, se hace [IDW](https://en.wikipedia.org/wiki/Inverse_distance_weighting) sobre las estaciones para calcular a dónde debería moverse la cámara para que las más cercanas mantengan sus posiciones relativas a ella.<br/>
Las líneas y estaciones son representadas de forma vectorial y se interpolan al hacer zoom. El resto de los detalles (calles y sus nombres, edificios, etc.) se muestran de fondo en teselas rasterizadas preparadas con [QGIS](https://qgis.org/), estilizadas con [Maputnik](https://github.com/maplibre/maputnik), y generadas con [TileServer-GL](https://github.com/maptiler/tileserver-gl).<br/>
Para renderizar todo se usa el canvas HTML.

**Librerías usadas**<br/>
[protomaps/pmtiles](https://github.com/protomaps/pmtiles) para usar teselas rasterizadas en formato pmtiles. Esto se usa solo para hacer pruebas, porque ningún browser parece manejar bien los requests parciales de HTML.<br/>
[kriszyp/msgpackr](https://github.com/kriszyp/msgpackr) para serializar las estaciones y líneas.

**Fuentes de datos para el mapa**<br/>
Las teselas rasterizadas tienen una base de OSM con [veredas](https://data.buenosaires.gob.ar/dataset/veredas) y [parcelas](https://web.archive.org/web/20200709054813/https://data.buenosaires.gob.ar/dataset/parcelas) de BA Data superpuestas arriba. Estas dos son de 2019, ya que las primeras no se actualizan desde ese año, y los datos para las segundas empeoraron mucho en calidad a partir de 2020.<br/>
El mapa esquemático está basado en el [mapa oficial integrado de transporte](https://enelsubte.com/noticias/buenos-aires-ya-tiene-su-primer-mapa-unificado-de-transporte/), aunque la idea sería reemplazarlo por uno más propicio una vez que esté completa la parte técnica.

**Desarrollo**<br/>
Empecé a hacer pruebas a fines de 2025 con intenciones de hacer un mapa que tuviera en forma de grafo todas las líneas de subte, tren y colectivo del Área Metropolitana de Buenos Aires, y pudiese representarlas geográfica y esquemáticamente de forma dinámica. Sin embargo, me fuí dando cuenta que sería complicado representar todo como objetos en Javascript sin ocupar muchísima memoria o CPU, que el canvas HTML tiene limitaciones demasiado grandes, y que la forma de funcionamiento de ambos hace muy difícil de optimizar el código.<br/>
Por esto, decidí juntar varias de estas pruebas en una demo sencilla de subte y trenes de CABA para tener algo funcional, y al terminarla reescribir todo de cero en WebAssembly y WebGL. Por esto las estructuras de datos no son muy eficientes y el código actual en general no es muy prolijo.<br/>

**Este proyecto no fué hecho con “vibe coding” ni nada del estilo.**

---

**TODO** para que la demo sea presentable
- Ajustar el tamaño de las cosas en pantallas chicas y UHD
- Mejorar los vectores para las líneas de subte
- Reescribir maplayer para que cancele requests a teselas que ya no están visibles
- Mejorar lógica de movimiento y hacer el zoom continuo en pantallas touch
- Agregar entradas a estaciones
- Agregar trenes, premetro y metrobuses
- Agregar UI mínima

**TODO** a futuro para terminar la demo
- Agregar habilidad para cliquear en estaciones
- Diagnosticar baja performance en Firefox
- Agregar un buscador de direcciones y propagarlas a niveles esquemáticos
- Desacoplar el mapa de CABA de la demo y agregar UI para cambiarlo
- Hacer UI para editar mapas
- Limpiar el código
- Reemplazar el mapa esquemático por uno más propicio
