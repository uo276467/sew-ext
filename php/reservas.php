<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ob_start();
class DataManager {
    private $server;
    private $user;
    private $pass;
    private $dbname;
    private $conn;

    public function __construct() {
        $this->server = "localhost";
        $this->user = "DBUSER2025";
        $this->pass = "DBPWD2025";
        $this->dbname = "reservas";

        $this->conn = new mysqli($this->server, $this->user, $this->pass);

        if ($this->conn->connect_error) {
            die("Error de conexión: " . $this->conn->connect_error);
        }

        if (!$this->databaseExists()) {
            $this->createDatabase();
        }else {
            $this->conn->select_db($this->dbname);
        }
    }
    private function databaseExists() {
        $query = "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$this->dbname'";
        $result = $this->conn->query($query);
        return $result->num_rows > 0;
    }

    public function dropDatabase(){
        $query = "DROP DATABASE IF EXISTS $this->dbname";
        if ($this->conn->query($query) === TRUE) {
            echo "<p>Base de datos '$this->dbname' eliminada con éxito.</p>";
        } else {
            die("Error al eliminar la base de datos: " . $this->conn->error);
        }
    }

    public function createDatabase() {
        $query = "CREATE DATABASE $this->dbname COLLATE utf8_spanish_ci";
        if ($this->conn->query($query) === TRUE) {
            $this->conn->select_db($this->dbname);
            $this->createTables();
            $this->insertDataFromCsv('./datos.csv');
        } else {
            die("Error al crear la base de datos: " . $this->conn->error);
        }
    }
    public function createTables() {
        $sqlFilePath = 'reservas.sql';
        
        $sqlContent = file_get_contents($sqlFilePath);
        
        $queries = array_filter(array_map('trim', explode(';', $sqlContent)));
        
        foreach ($queries as $query) {
            if (!empty($query)) {
                if ($this->conn->query($query) !== TRUE) {
                    echo "<p>Error al ejecutar la consulta: " . $this->conn->error . "</p>";
                }
            }
        }
    }
    public function insertDataFromCsv($csvFilePath) {
        if (!file_exists($csvFilePath)) {
            die("Error: El archivo CSV no existe.");
        }
    
        $file = fopen($csvFilePath, 'r');
        if (!$file) {
            die("Error: No se pudo abrir el archivo CSV.");
        }
    
        while (($line = fgetcsv($file, 1000, ";")) !== false) {
            if ($line[0] === 'recursos_turisticos') {
                // Inserta en la tabla recursos_turisticos
                $stmt = $this->conn->prepare("INSERT INTO recursos_turisticos (nombre, descripcion, precio, fecha_inicio, fecha_fin, limite_ocupacion) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("ssdssi", $line[1], $line[2], $line[3], $line[4], $line[5], $line[6]);
                if (!$stmt->execute()) {
                    die("Error al insertar recurso turístico: " . $this->conn->error);
                }
            }else if ($line[0] === 'usuarios') {
                // Inserta en la tabla usuarios
                $stmt = $this->conn->prepare("INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)");
                $hashedPassword = password_hash($line[3], PASSWORD_BCRYPT);
                $stmt->bind_param("sss", $line[1], $line[2], $hashedPassword);
                if (!$stmt->execute()) {
                    die("Error al insertar recurso turístico: " . $this->conn->error);
                }
            }
        }
    
        fclose($file);
    }
    public function createUser($nombre, $email, $contraseña) {
        $hashedPassword = password_hash($contraseña, PASSWORD_BCRYPT);
        $stmt = $this->conn->prepare("INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $nombre, $email, $hashedPassword);
        return $stmt->execute();
    }
    public function getRecursosTuristicos() {
        $query = "
            SELECT 
                rt.*, 
                (rt.limite_ocupacion - COALESCE(SUM(r.n_plazas), 0)) AS plazas_disponibles
            FROM recursos_turisticos rt
            LEFT JOIN reservas r ON rt.id = r.recurso_id AND r.anulada = FALSE
            GROUP BY rt.id
        ";
        $result = $this->conn->query($query);
        
        if ($result->num_rows > 0) {
            return $result->fetch_all(MYSQLI_ASSOC);
        }
        return [];
    }
    public function validarUsuario($email, $contraseña) {
        $stmt = $this->conn->prepare("SELECT id, contraseña FROM usuarios WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows == 1) {
            $user = $result->fetch_assoc();
            if (password_verify($contraseña, $user['contraseña'])) {
                return $user['id'];
            }
        }
        return false;
    }
    private function getPlazasDisponibles($recurso_id) {
        $query = "SELECT limite_ocupacion - COALESCE(SUM(n_plazas), 0) AS plazas_disponibles 
                  FROM recursos_turisticos 
                  LEFT JOIN reservas ON recursos_turisticos.id = reservas.recurso_id AND reservas.anulada = FALSE 
                  WHERE recursos_turisticos.id = ? 
                  GROUP BY recursos_turisticos.id";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $recurso_id);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        return $result ? $result['plazas_disponibles'] : 0;
    }
    public function createReserva($email, $contraseña, $recurso_id, $n_plazas) {
        $stmt = $this->conn->prepare("SELECT id, contraseña FROM usuarios WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        
        if (!$user || !password_verify($contraseña, $user['contraseña'])) {
            return "Error: Credenciales incorrectas.";
        }
        
        $plazas_disponibles = $this->getPlazasDisponibles($recurso_id);
        
        if ($n_plazas > $plazas_disponibles) {
            return "Error: No hay suficientes plazas disponibles.";
        }
        
        $stmt = $this->conn->prepare("INSERT INTO reservas (usuario_id, recurso_id, n_plazas) VALUES (?, ?, ?)");
        $stmt->bind_param("iii", $user['id'], $recurso_id, $n_plazas);
        
        if ($stmt->execute()) {
            // Crear el pago asociado a la reserva
            $reserva_id = $this->conn->insert_id; // Obtener el ID de la última reserva creada
            $stmt = $this->conn->prepare("INSERT INTO pagos (reserva_id, cantidad) SELECT ?, precio * ? FROM recursos_turisticos WHERE id = ?");
            $stmt->bind_param("iii", $reserva_id, $n_plazas, $recurso_id);
            if($stmt->execute()){   
                return "Reserva creada con éxito.";
            }
        }
        return "Error al crear la reserva: " . $this->conn->error;
    }
    public function getReservasUsuario($email, $contraseña) {
        $stmt = $this->conn->prepare("SELECT id, contraseña FROM usuarios WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if (!$user || !password_verify($contraseña, $user['contraseña'])) {
            return "Error: Credenciales incorrectas.";
        }

        $stmt = $this->conn->prepare(
            "SELECT r.id, rt.nombre, r.n_plazas, (r.n_plazas * rt.precio) AS costo_total 
                FROM reservas r 
                JOIN recursos_turisticos rt ON r.recurso_id = rt.id 
                WHERE r.usuario_id = ? AND r.anulada = FALSE"
        );
        $stmt->bind_param("i", $user['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function anularReserva($reserva_id) {
        $stmt = $this->conn->prepare("UPDATE reservas SET anulada = TRUE WHERE id = ?");
        $stmt->bind_param("i", $reserva_id);
        return $stmt->execute();
    }
}

$manager = new DataManager();
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST["crear_usuario"])) {
    $nombre = $_POST["nombre"];
    $email = $_POST["email"];
    $contraseña = $_POST["contraseña"];
    $manager->createUser($nombre, $email, $contraseña);
}
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST["reservar_recurso"])) {
    $email = $_POST["email"];
    $contraseña = $_POST["contraseña"];
    $recurso_id = $_POST["recurso_id"];
    $n_plazas = $_POST["n_plazas"];
    $mensaje_reserva =  $manager->createReserva($email, $contraseña, $recurso_id, $n_plazas);
    $id_recurso_afectado = $recurso_id;
}
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST["ver_reservas"])) {
    $email = $_POST["email"];
    $contraseña = $_POST["contraseña"];
    $reservas = $manager->getReservasUsuario($email, $contraseña);

    if ($reservas === "Error: Credenciales incorrectas.") {
        $mensaje_reservas_usuario = "Error: Credenciales incorrectas.";
    } elseif (is_array($reservas) && empty($reservas)) {
        $mensaje_reservas_usuario = "Aún no has realizado ninguna reserva.";
    }
}
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST["anular_reserva"])) {
    $reserva_id = $_POST["reserva_id"];
    $manager->anularReserva($reserva_id);
}
?>
<!DOCTYPE HTML>

<html lang="es">
<head>
    <meta charset="UTF-8" />
    <title>Mieres: reservas</title>

    <meta name="author" content="Daniel Suárez de la roza"/>
    <meta name="description" content="descripción del documento"/>
    <meta name="keywords" content="Mieres, reservas"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

    <link rel="stylesheet" type="text/css" href="../estilo/estilo.css" />
    <link rel="stylesheet" type="text/css" href="../estilo/layout.css" />
</head>

<body>
    <main>
        <header>
            <h1><a href="../index.html">Mieres</a></h1>
            <nav>
                <a href="../index.html">Inicio</a>
                <a href="../gastronomia.html">Gastronomia</a>
                <a href="../rutas.html">Rutas</a>
                <a href="../meteorologia.html">Meteorología</a>
                <a href="../juego.html">Juego</a>
                <a href="reservas.php" class="activo">Reservas</a>
                <a href="../ayuda.html" >Ayuda</a>
            </nav>
        </header>
        
        <p>Estás en: Reservas</p>

        <section>
            <h2>Reservas de Recursos Turísticos</h2>

            <h3>Registrar Usuario</h3>
            <form method="POST" action=#>
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" required>
                
                <label for="email_registro">Email:</label>
                <input type="email" id="email_registro" name="email" required>
                
                <label for="contraseña_registro">Contraseña:</label>
                <input type="password" id="contraseña_registro" name="contraseña" required>
                
                <button type="submit" name="crear_usuario">Registrar</button>
            </form>

            <h3>Recursos Turísticos Disponibles</h3>
            <ul>
                <?php
                    $recursos = $manager->getRecursosTuristicos();
                    foreach ($recursos as $recurso) {
                        echo "<li><article>";
                        echo "<h4>{$recurso['nombre']}</h4>";
                        echo "<p>{$recurso['descripcion']}</p>";
                        echo "<p>Precio: {$recurso['precio']}€</p>";
                        echo "<p>Fecha: {$recurso['fecha_inicio']} - {$recurso['fecha_fin']}</p>";
                        echo "<p>Plazas disponibles: {$recurso['plazas_disponibles']}</p>";
                        echo "<form method='POST' action=#>";
                        echo "<input type='hidden' name='recurso_id' value='{$recurso['id']}' />";
                        echo "<label for='email{$recurso['id']}'>Email:</label>";
                        echo "<input type='email' id='email{$recurso['id']}' name='email' required>";
                        echo "<label for='contraseña{$recurso['id']}'>Contraseña:</label>";
                        echo "<input type='password' id='contraseña{$recurso['id']}' name='contraseña' required>";
                        echo "<label for='n_plazas{$recurso['id']}'>Número de plazas:</label>";
                        echo "<input type='number' id='n_plazas{$recurso['id']}' name='n_plazas' min='1' required>";
                        echo "<button type='submit' name='reservar_recurso'>Reservar</button>";
                        echo "</form>";
                        if (isset($mensaje_reserva) && $id_recurso_afectado == $recurso['id']) {
                            echo "<p>$mensaje_reserva</p>";
                        }
                        echo "</article></li>";
                    }
                ?>
            </ul>
        </section>
        <aside>
            <h2>Ver reservas</h2>
            <form method="POST" action=#>
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
                
                <label for="contraseña">Contraseña:</label>
                <input type="password" id="contraseña" name="contraseña" required>
                
                <button type="submit" name="ver_reservas">Ver Reservas</button>
            </form>
            
            <?php
            if (isset($mensaje_reservas_usuario)) {
                echo "<p>$mensaje_reservas_usuario</p>";
            } elseif (!empty($reservas)) {
                foreach ($reservas as $reserva) {
                    echo "<article>";
                    echo "<p>Recurso: {$reserva['nombre']}</p>";
                    echo "<p>Plazas reservadas: {$reserva['n_plazas']}</p>";
                    echo "<p>Importe total: {$reserva['costo_total']}€</p>";
                    echo "<form method='POST' action=#>";
                    echo "<input type='hidden' name='reserva_id' value='{$reserva['id']}'>";
                    echo "<button type='submit' name='anular_reserva'>Anular</button>";
                    echo "</form>";
                    echo "</article>";
                }
            }
            ?>
        </aside>
    </main>
</body>
</html>