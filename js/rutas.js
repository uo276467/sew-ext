class Rutas {
  constructor() {
    this.inputArchivos = document.querySelector("input");
    this.section = document.querySelector("section");
    this.initEventListeners();
  }

  initEventListeners() {
    this.inputArchivos.addEventListener("change", () =>
      this.seleccionarArchivo()
    );
  }

  seleccionarArchivo() {
    const archivos = Array.from(this.inputArchivos.files);
    archivos.forEach((archivo) => {
      const extension = archivo.name.split(".").pop().toLowerCase();
      if (extension === "xml") {
        this.leerArchivoXML(archivo);
      }
    });
  }

  leerArchivoXML(archivo) {
    const lector = new FileReader();
    lector.onload = (e) => {
      const contenidoXML = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(contenidoXML, "text/xml");
      this.mostrarContenidoXML(xmlDoc);
    };
    lector.readAsText(archivo);
  }

  mostrarContenidoXML(doc) {
    const rutas = doc.getElementsByTagName("ruta");
    Array.from(rutas).forEach((ruta) => {
      const article = document.createElement("article");
      article.innerHTML = this.recorrerNodos(ruta, { count: 1 }, article);
      this.section.appendChild(article);
    });
  }

  recorrerNodos(nodo, indiceHito = { count: 1 }, article) {
    let html = "";

    if (nodo.nodeType === Node.ELEMENT_NODE) {
      const nombreNodo = nodo.nodeName.toLowerCase();

      const formatearNombre = (nombre) => {
        return nombre
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
      };

      if (nombreNodo === "ruta") {
        html += `<h3>${nodo.getAttribute("nombre") || "Ruta sin nombre"}</h3>`;
        html += `<p>Descripción: ${
          nodo.getAttribute("descripcion") || "Sin descripción"
        }</p>`;

        Array.from(nodo.attributes).forEach((attr) => {
          if (!["nombre", "descripcion"].includes(attr.name)) {
            html += `<p>${formatearNombre(attr.name)}: ${attr.value}</p>`;
          }
        });
      }

      if (nombreNodo === "inicio") {
        Array.from(nodo.attributes).forEach((attr) => {
          html += `<p>${formatearNombre(attr.name)}: ${attr.value}</p>`;
        });
      }

      if (nombreNodo === "coordenadas") {
        const lon = nodo.getAttribute("longitud");
        const lat = nodo.getAttribute("latitud");
        const alt = nodo.getAttribute("altitud");
        html += `<p>Coordenadas:</p><ul><li>Longitud: ${lon}</li><li>Latitud: ${lat}</li><li>Altitud: ${alt} m</li></ul>`;
        return html;
      }

      if (nombreNodo === "distancia") {
        const valor = nodo.getAttribute("valor");
        const unidades = nodo.getAttribute("unidades");
        html += `<p>Distancia desde el último hito: ${valor} ${unidades}</p>`;
        return html;
      }

      if (nombreNodo === "galeriafotos") {
        html += `<p>Galería de imágenes</p>`;
      }

      if (nombreNodo === "galeriavideos") {
        const tieneVideo = Array.from(nodo.childNodes).some(
          (n) =>
            n.nodeType === Node.ELEMENT_NODE &&
            n.nodeName.toLowerCase() === "video" &&
            n.getAttribute("enlace")
        );
        if (tieneVideo) {
          html += `<p>Galería de vídeos</p>`;
        }
      }

      if (nombreNodo === "foto" && nodo.getAttribute("enlace")) {
        const enlace = nodo.getAttribute("enlace");
        html += `<img src="${enlace}" alt="Foto">`;
      }

      if (nombreNodo === "video" && nodo.getAttribute("enlace")) {
        const enlace = nodo.getAttribute("enlace");
        html += `<video controls><source src="${enlace}" type="video/mp4"></video>`;
      }

      if (nombreNodo === "referencias") {
        html += `<p>Referencias:</p><ul>`;
        Array.from(nodo.childNodes).forEach((ref) => {
          if (
            ref.nodeType === Node.ELEMENT_NODE &&
            ref.getAttribute("enlace")
          ) {
            const enlace = ref.getAttribute("enlace");
            html += `<li><a href="${enlace}" target="_blank">${enlace}</a></li>`;
          }
        });
        html += `</ul>`;
        return html;
      }

      if (nombreNodo === "hito") {
        html += `<aside><h4>Hito ${indiceHito.count++}</h4>`;
        const nombre = nodo.getAttribute("nombre") || "Nombre no disponible";
        const descripcion =
          nodo.getAttribute("descripcion") || "Sin descripción";
        html += `<p>Nombre: ${nombre}</p><p>Descripción: ${descripcion}</p>`;
      }

      if (nombreNodo === "planimetria") {
        const enlace = nodo.getAttribute("enlace");
        this.leerArchivoKML(enlace, article);
      }

      if (nombreNodo === "altimetria") {
        const enlace = nodo.getAttribute("enlace");
        this.leerArchivoSVG(enlace, article);
      }

      const nodosIgnorados = ["planimetria", "altimetria"];

      if (nodo.childNodes.length > 0 && !nodosIgnorados.includes(nombreNodo)) {
        Array.from(nodo.childNodes).forEach((childNode) => {
          if (
            childNode.nodeType === Node.TEXT_NODE &&
            childNode.nodeValue.trim() !== ""
          ) {
            html += `<p>${childNode.nodeValue.trim()}</p>`;
          } else if (childNode.nodeType === Node.ELEMENT_NODE) {
            html += this.recorrerNodos(childNode, indiceHito, article);
          }
        });
      }

      if (nombreNodo === "hito") {
        html += `</aside>`;
      }
    }
    return html;
  }

  leerArchivoKML(rutaArchivo, article) {
    fetch(rutaArchivo)
      .then((response) => {
        if (!response.ok)
          throw new Error(`No se pudo cargar el archivo KML: ${rutaArchivo}`);
        return response.text();
      })
      .then((kml) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(kml, "text/xml");
        const coordenadas = doc.querySelectorAll("coordinates");
        let puntos = [];
        coordenadas.forEach((coordenada) => {
          const coords = coordenada.textContent.trim().split(" ");
          coords.forEach((coord) => {
            const [lng, lat] = coord.split(",");
            puntos.push({ lat: parseFloat(lat), lng: parseFloat(lng) });
          });
        });
        this.agregarMarcadoresYLínea(puntos, article);
      })
      .catch((error) => console.error(error));
  }

  initMap(container) {
    const div = document.createElement("div");
    container.appendChild(div);

    const map = new google.maps.Map(div, {
      center: { lat: 43.252608, lng: -5.771945 },
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    return map;
  }

  agregarMarcadoresYLínea(puntos, article) {
    const mapContainer = document.createElement("section");
    mapContainer.innerHTML = "<h4>Planimetría</h4>";
    const map = this.initMap(mapContainer);
    const coordenadas = [];

    puntos.forEach((punto) => {
      new google.maps.Marker({ position: punto, map });
      coordenadas.push(punto);
    });

    new google.maps.Polyline({
      path: coordenadas,
      geodesic: true,
      strokeColor: "#FF0000",
      strokeOpacity: 1.0,
      strokeWeight: 2,
      map,
    });

    article.appendChild(mapContainer);
  }

  leerArchivoSVG(rutaArchivo, article) {
    fetch(rutaArchivo)
      .then((response) => {
        if (!response.ok)
          throw new Error(`No se pudo cargar el archivo SVG: ${rutaArchivo}`);
        return response.text();
      })
      .then((contenidoSVG) => {
        const container = document.createElement("section");
        container.innerHTML = `<h4>Altimetría</h4>${contenidoSVG}`;
        article.appendChild(container);
      })
      .catch((error) => console.error(error));
  }
}

const rutas = new Rutas();
