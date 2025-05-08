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

  initEstructura() {
    this.articleInfo = document.createElement("article");
    $(this.articleInfo).append("<h3>Información de las rutas</h3>");
    $(this.section).append(this.articleInfo);
    this.articlePlanimetria = document.createElement("article");
    $(this.articlePlanimetria).append("<h3>Planimetría de las rutas</h3>");
    $(this.section).append(this.articlePlanimetria);
    this.articleAltimetria = document.createElement("article");
    $(this.articleAltimetria).append("<h3>Altimetría de las rutas</h3>");
    $(this.section).append(this.articleAltimetria);
  }

  leerArchivoXML(archivo) {
    this.initEstructura();

    const lector = new FileReader();
    lector.onload = (e) => {
      const contenidoXML = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(contenidoXML, "text/xml");
      this.mostrarContenidoXML(xmlDoc);
    };

    lector.readAsText(archivo);
  }

  mostrarContenidoXML(archivo) {
    const htmlContent = this.recorrerNodos(archivo.documentElement);
    const ul = $("<ul>");
    ul.append(htmlContent);
    $(this.articleInfo).append(ul);
  }

  recorrerNodos(nodo) {
    let html = "";
    if (nodo.nodeType === Node.ELEMENT_NODE) {
      if (
        nodo.nodeName.toLowerCase() !== "planimetria" &&
        nodo.nodeName.toLowerCase() !== "altimetria"
      ) {
        html += `<li>${nodo.nodeName}`;
      }

      if (
        nodo.nodeName.toLowerCase() === "referencia" &&
        nodo.getAttribute("enlace")
      ) {
        const enlace = nodo.getAttribute("enlace");
        html += `<ul><li><a href='${enlace}' target='_blank'>Ver referencia</a></li></ul>`;
      } else if (
        nodo.nodeName.toLowerCase() === "foto" &&
        nodo.getAttribute("enlace")
      ) {
        const enlace = nodo.getAttribute("enlace");
        html += `<ul><li><img src='${enlace}' alt='Foto'></li></ul>`;
      } else if (
        nodo.nodeName.toLowerCase() === "video" &&
        nodo.getAttribute("enlace")
      ) {
        const enlace = nodo.getAttribute("enlace");
        html += `<ul><li><video controls><source src='${enlace}' type='video/mp4'></video></li></ul>`;
      } else if (
        nodo.nodeName.toLowerCase() === "planimetria" &&
        nodo.getAttribute("enlace")
      ) {
        const enlace = nodo.getAttribute("enlace");
        this.leerArchivoKML(enlace);
      } else if (
        nodo.nodeName.toLowerCase() === "altimetria" &&
        nodo.getAttribute("enlace")
      ) {
        const enlace = nodo.getAttribute("enlace");
        this.leerArchivoSVG(enlace);
      } else if (nodo.attributes && nodo.attributes.length > 0) {
        html += "<ul>";
        Array.from(nodo.attributes).forEach((attr) => {
          html += `<li>${attr.name}:${attr.value}</li>`;
        });
        html += "</ul>";
      }

      if (nodo.childNodes.length > 0) {
        html += "<ul>";
        Array.from(nodo.childNodes).forEach((childNode) => {
          if (
            childNode.nodeType === Node.TEXT_NODE &&
            childNode.nodeValue.trim() !== ""
          ) {
            html += `<li>${childNode.nodeValue.trim()}</li>`;
          } else if (childNode.nodeType === Node.ELEMENT_NODE) {
            html += this.recorrerNodos(childNode);
          }
        });
        html += "</ul>";
      }

      html += "</li>";
    }
    return html;
  }

  leerArchivoKML(rutaArchivo) {
    fetch(rutaArchivo)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`No se pudo cargar el archivo KML: ${rutaArchivo}`);
        }
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

        this.agregarMarcadoresYLínea(puntos);
      })
      .catch((error) => console.error(error));
  }

  initMap() {
    $(this.articlePlanimetria).append("<h4>Mapa dinámico</h4>");
    const div = document.createElement("div");
    $(this.articlePlanimetria).append(div);
    div.contentEditable = false;

    this.map = new google.maps.Map(div, {
      center: { lat: 43.252608, lng: -5.771945 },
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    });
  }

  agregarMarcadoresYLínea(puntos) {
    const coordenadas = [];
    this.initMap();

    puntos.forEach((punto) => {
      const marcador = new google.maps.Marker({
        position: punto,
        map: this.map,
      });
      coordenadas.push(punto);
    });

    const polyline = new google.maps.Polyline({
      path: coordenadas,
      geodesic: true,
      strokeColor: "#FF0000",
      strokeOpacity: 1.0,
      strokeWeight: 2,
    });

    polyline.setMap(this.map);
  }

  leerArchivoSVG(rutaArchivo) {
    fetch(rutaArchivo)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`No se pudo cargar el archivo SVG: ${rutaArchivo}`);
        }
        return response.text();
      })
      .then((contenidoSVG) => {
        $(this.articleAltimetria).append("<h4>Gráfica de la altimetría</h4>");
        $(this.articleAltimetria).append(contenidoSVG);
      })
      .catch((error) => console.error(error));
  }
}
const rutas = new Rutas();
