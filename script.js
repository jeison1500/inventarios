// Configuración de Supabase
const supabaseUrl = 'https://mmwsywpdycbpvgrnyeuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1td3N5d3BkeWNicHZncm55ZXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MTMzMzIsImV4cCI6MjA3MzI4OTMzMn0.kE8DoG7Vqf9YVTPLpgGp2trxL8Ay-_zcB5Jr-qpzYpo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Elementos del formulario
const codigoInput = document.getElementById("codigoArt");
const nombreInput = document.getElementById("nombre");
const tallaSelect = document.getElementById("talla");
const colorSelect = document.getElementById("color");
const conteoInput = document.getElementById("conteo");
const responsableSelect = document.getElementById("responsable");
const guardarBtn = document.getElementById("guardarBtn");
const loader = document.getElementById("loader");

let codigoSeleccionado = null; // Código activo

// Cargar responsables al iniciar
function cargarResponsables() {
    for (let i = 1; i <= 10; i++) {
        const option = document.createElement("option");
        option.value = `Equipo ${i.toString().padStart(2, "0")}`;
        option.textContent = `Equipo ${i.toString().padStart(2, "0")}`;
        responsableSelect.appendChild(option);
    }
}
cargarResponsables();

// Limpiar selects
function limpiarSelect(selectElement) {
    selectElement.innerHTML = '<option value="">Selecciona una opción</option>';
}

// Limpiar formulario completo (solo se llama tras guardar)
function limpiarFormulario() {
    codigoInput.value = "";
    nombreInput.value = "";
    conteoInput.value = "";
    responsableSelect.value = "";
    limpiarSelect(tallaSelect);
    limpiarSelect(colorSelect);
    codigoSeleccionado = null;
    codigoInput.focus(); // 👈 vuelve a enfocar al código
}

// Mostrar/Ocultar loader
function mostrarLoader() {
    loader.style.display = "flex";
}

function ocultarLoader() {
    loader.style.display = "none";
}

// Buscar producto por código
codigoInput.addEventListener("input", async () => {
    const codigo = codigoInput.value;

    if (!codigo) {
        return; // 👈 no limpia, solo sale
    }

    const { data, error } = await supabase
        .from("articulos_inventario")
        .select("nombre, talla, color")
        .eq("codigo", codigo);

    if (error) {
        console.error("❌ Error en la búsqueda:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.warn("⚠️ No se encontró el producto");
        return;
    }

    codigoSeleccionado = codigo;
    nombreInput.value = data[0].nombre;

    const tallasUnicas = [...new Set(data.map(item => item.talla))];
    const coloresUnicos = [...new Set(data.map(item => item.color))];

    limpiarSelect(tallaSelect);
    tallasUnicas.forEach(talla => {
        const option = document.createElement("option");
        option.value = talla;
        option.textContent = talla;
        tallaSelect.appendChild(option);
    });

    limpiarSelect(colorSelect);
    coloresUnicos.forEach(color => {
        const option = document.createElement("option");
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
    });
});

// Guardar en Supabase
async function guardarConteo() {
    if (!codigoSeleccionado || !tallaSelect.value || !colorSelect.value || !responsableSelect.value) {
        Swal.fire("Atención", "Completa todos los campos antes de guardar.", "warning");
        return;
    }

    const nuevoConteo = parseInt(conteoInput.value);
    const responsableNuevo = responsableSelect.value;

    try {
        // Verificar si ya existe el registro
       // Mostrar spinner antes de verificar el conteo
Swal.fire({
    title: "Verificando conteo...",
    text: "Por favor espera",
    allowOutsideClick: false,
    didOpen: () => {
        Swal.showLoading();
    }
});

const { data: existente, error: errorBusqueda } = await supabase
    .from("articulos_inventario")
    .select("conteo, responsable")
    .eq("codigo", codigoSeleccionado)
    .eq("talla", tallaSelect.value)
    .eq("color", colorSelect.value)
    .single();

if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
    console.error("❌ Error al buscar conteo existente:", errorBusqueda);
    
    // Cerrar spinner y mostrar error
    Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo verificar el conteo existente."
    });

    return;
}


        // Si existe el artículo
        if (existente) {
            const { conteo, responsable } = existente;

            // 🚨 CASO 1: Si aún no tiene conteo registrado
            if (!conteo || conteo === 0) {
                Swal.fire({
                    title: "Guardando...",
                    text: "Por favor espera",
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const { error: errorPrimera } = await supabase
                    .from("articulos_inventario")
                    .update({
                        conteo: nuevoConteo,
                        responsable: responsableNuevo
                    })
                    .eq("codigo", codigoSeleccionado)
                    .eq("talla", tallaSelect.value)
                    .eq("color", colorSelect.value);

                if (errorPrimera) {
                    console.error("❌ Error al guardar conteo:", errorPrimera);
                    Swal.fire("Error", "No se pudo guardar el conteo inicial.", "error");
                } else {
                    Swal.fire("Éxito", "Conteo guardado correctamente.", "success");
                    limpiarFormulario();
                }

                return; // Salimos para evitar seguir con la lógica de ajuste/suma
            }

            // 🚨 CASO 2: Ya tiene conteo registrado → mostrar opciones
            const resultado = await Swal.fire({
                title: "Este artículo ya fue contado",
                html: `
                    <p><strong>Cantidad contada:</strong> ${conteo}</p>
                    <p><strong>Responsable:</strong> ${responsable}</p>
                    <p>¿Qué deseas hacer con la nueva cantidad: <strong>${nuevoConteo}</strong>?</p>
                `,
                icon: "question",
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: "Sumar",
                denyButtonText: "Ajustar",
                cancelButtonText: "Cancelar"
            });

            let cantidadFinal;
            let accion;

            if (resultado.isConfirmed) {
                cantidadFinal = conteo + nuevoConteo;
                accion = "sumar";
            } else if (resultado.isDenied) {
                cantidadFinal = nuevoConteo;
                accion = "ajustar";
            } else {
                Swal.fire("Cancelado", "No se realizaron cambios.", "info");
                return;
            }

            Swal.fire({
                title: `${accion === "sumar" ? "Sumando" : "Ajustando"}...`,
                text: "Por favor espera",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { error: errorUpdate } = await supabase
                .from("articulos_inventario")
                .update({
                    conteo: cantidadFinal,
                    responsable: responsableNuevo
                })
                .eq("codigo", codigoSeleccionado)
                .eq("talla", tallaSelect.value)
                .eq("color", colorSelect.value);

            if (errorUpdate) {
                console.error("❌ Error al actualizar:", errorUpdate);
                Swal.fire("Error", `No se pudo ${accion === "sumar" ? "sumar" : "ajustar"} el conteo.`, "error");
            } else {
                Swal.fire("Éxito", `Conteo ${accion === "sumar" ? "sumado" : "ajustado"} correctamente.`, "success");
                limpiarFormulario();
            }

        } else {
            // Si no existe el artículo (por si acaso)
            Swal.fire({
                title: "Guardando...",
                text: "Por favor espera",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { error: errorInsert } = await supabase
                .from("articulos_inventario")
                .update({
                    conteo: nuevoConteo,
                    responsable: responsableNuevo
                })
                .eq("codigo", codigoSeleccionado)
                .eq("talla", tallaSelect.value)
                .eq("color", colorSelect.value);

            if (errorInsert) {
                console.error("❌ Error al guardar nuevo conteo:", errorInsert);
                Swal.fire("Error", "No se pudo registrar el conteo.", "error");
            } else {
                Swal.fire("Éxito", "Conteo registrado correctamente.", "success");
                limpiarFormulario();
            }
        }

    } catch (err) {
        console.error("❌ Error inesperado:", err);
        Swal.fire("Error", "Ocurrió un problema inesperado.", "error");
    }
}



// Guardar al hacer clic en el botón
guardarBtn.addEventListener("click", guardarConteo);




document.getElementById("exportarBtn").addEventListener("click", async () => {
    try {
        Swal.fire({
            title: "Exportando...",
            text: "Por favor espera mientras generamos el archivo.",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const { data, error } = await supabase
            .from("articulos_inventario")
            .select("*");

        if (error) {
            console.error("❌ Error al obtener datos:", error);
            Swal.fire("Error", "No se pudieron obtener los datos para exportar.", "error");
            return;
        }

        if (!data || data.length === 0) {
            Swal.fire("Vacío", "No hay datos para exportar.", "info");
            return;
        }

        // Convertir datos a hoja de Excel
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

        // Generar archivo y descargar
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "inventario_exportado.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Swal.fire("Éxito", "Archivo exportado correctamente.", "success");

    } catch (err) {
        console.error("❌ Error inesperado:", err);
        Swal.fire("Error", "Ocurrió un problema al exportar los datos.", "error");
    }
});
