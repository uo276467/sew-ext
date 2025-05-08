import xml.etree.ElementTree as ET

class Kml:
    """
    Genera archivo KML con puntos y líneas
    """
    def __init__(self):
        self.raiz = ET.Element('kml', xmlns="http://www.opengis.net/kml/2.2")
        self.doc = ET.SubElement(self.raiz, 'Document')

    def addPlacemark(self, nombre, longitud, latitud, altitud):
        pm = ET.SubElement(self.doc, 'Placemark')
        ET.SubElement(pm, 'name').text = nombre
        punto = ET.SubElement(pm, 'Point')
        ET.SubElement(punto, 'coordinates').text = f'{longitud},{latitud},{altitud}'

    def addLineString(self, coordenadas, color):
        pm = ET.SubElement(self.doc, 'Placemark')
        line_string = ET.SubElement(pm, 'LineString')
        ET.SubElement(line_string, 'coordinates').text = " ".join(coordenadas)
        style = ET.SubElement(pm, 'Style')
        line_style = ET.SubElement(style, 'LineStyle')
        ET.SubElement(line_style, 'color').text = color
        ET.SubElement(line_style, 'width').text = '3'

    def escribir(self, nombreArchivoKML):
        arbol = ET.ElementTree(self.raiz)
        arbol.write(nombreArchivoKML, encoding='utf-8', xml_declaration=True)


def parse_xml(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    rutas = []

    for ruta in root.findall("ruta"):
        ruta_nombre = ruta.get("nombre")
        hitos = []

        for hito in ruta.find("hitos").findall("hito"):
            coord = hito.find("coordenadas")
            longitud = coord.get("longitud")
            latitud = coord.get("latitud")
            altitud = coord.get("altitud")
            hitos.append((longitud, latitud, altitud))

        rutas.append({"nombre": ruta_nombre, "hitos": hitos})

    return rutas


def generate_kml(rutas):
    colores = ['ffffffff', 'ff0000ff', 'ffff0000']

    for i, ruta in enumerate(rutas):
        output_file = f"planimetria{i + 1}.kml"
        kml = Kml()
        coordenadas = []
        for lon, lat, alt in ruta['hitos']:
            kml.addPlacemark(ruta['nombre'], lon, lat, alt)
            coordenadas.append(f"{lon},{lat},{alt}")

        # Cerrar la línea uniendo el último punto con el primero
        if coordenadas:
            coordenadas.append(coordenadas[0])

        color = colores[i % len(colores)]
        kml.addLineString(coordenadas, color)

        kml.escribir(output_file)
        print(f"Archivo KML generado: {output_file}")


if __name__ == "__main__":
    xml_file = "rutas.xml"

    rutas = parse_xml(xml_file)
    generate_kml(rutas)