document.getElementById('menu-toggle').onclick = function() {
  var navLinks = document.getElementById('menu-links');
  navLinks.classList.toggle('active');
};
var links = document.querySelectorAll('.nav-links a');
for (var i = 0; i < links.length; i++) {
  links[i].addEventListener('click', function() {
    document.getElementById('menu-links').classList.remove('active');
  });
}
const firebaseConfig = {
  apiKey: "AIzaSyBSseZN21-xYc7uX7kekP0kb79xdWpWqds",
  authDomain: "enfingridarriagada.firebaseapp.com",
  databaseURL: "https://enfingridarriagada-default-rtdb.firebaseio.com",
  projectId: "enfingridarriagada",
  storageBucket: "enfingridarriagada.firebasestorage.app",
  messagingSenderId: "866351461780",
  appId: "1:866351461780:web:51651096722ec030b28b81",
  measurementId: "G-R5YXJP3BBH"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const reservasRef = db.ref("reservas");
const horariosRef = db.ref("horarios");
const diasBloqueadosRef = db.ref("diasBloqueados");
const diasSemanaBloqueadosRef = db.ref("diasSemanaBloqueados");
if (firebase.auth) {
  firebase.auth().signInAnonymously().catch(err => {
    console.error("Error de autenticación anónima:", err?.message || err);
  });
}
const fechaInput = document.getElementById("fecha");
const cuadroCalendario = document.getElementById("cuadroCalendario");
const ventanaHorarios = document.getElementById("modal-horarios");
const cerrarVentana = document.getElementById("cerrarVentana");
const tituloVentana = document.getElementById("tituloVentana");
const horariosDisponibles = document.getElementById("horariosDisponibles");
const tituloMes = document.getElementById("tituloMes");
const botonAnterior = document.getElementById("mesAnterior");
const botonSiguiente = document.getElementById("mesSiguiente");
const btnPanel = document.getElementById("btn-panel");
const modalAcceso = document.getElementById("modal-acceso");
const modalControl = document.getElementById("modal-control");
const modalConfigHorarios = document.getElementById("modal-configuracion-horarios");
const tituloConfigHorarios = document.getElementById("titulo-config-horarios");
const fechaConfigHorarios = document.getElementById("fecha-config-horarios");
const botonesToggleHoras = document.getElementById("botones-toggle-horas");
let diasBloqueados = [];
let diasSemanaBloqueados = [];
let horariosPersonalizados = {};
let reservasPorDia = {};
let fechaActualCalendario = new Date();
let modoBloqueoDias = false;
let modoGestionHorarios = false;
let fechaSeleccionadaParaConfigurar = "";
const mesesTexto = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];
reservasRef.on("value", snapshot => {
  reservasPorDia = {};
  snapshot.forEach(child => {
    const r = child.val();
    if (!r || !r.fecha || !r.hora) return;
    if (!reservasPorDia[r.fecha]) reservasPorDia[r.fecha] = [];
    reservasPorDia[r.fecha].push(r.hora);
  });
  actualizarBarraMes();
});
function appendReservaToList({fecha, hora, nombre, apellido, key}) {
  const cont = document.getElementById("listaReservas");
  if (!cont) return;
  const idBloque = `${fecha}-${hora}`;
  if (document.getElementById(idBloque)) return;
  const div = document.createElement("div");
  div.className = "reserva-item";
  div.id = idBloque;
  div.dataset.order = new Date(`${fecha}T${hora}:00`).getTime();
  const texto = document.createElement("span");
  const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ");
  texto.textContent = `📅 ${fecha} ⏰ ${hora} - ${nombreCompleto}`;
  const botonX = document.createElement("span");
  botonX.textContent = " | ❌";
  botonX.className = "boton-x";
  botonX.title = "Eliminar esta hora";
  botonX.onclick = () => { reservasRef.child(key).remove(); div.remove(); };
  div.appendChild(texto);
  div.appendChild(botonX);
  let insertado = false;
  const hijos = Array.from(cont.children);
  for (let i = 0; i < hijos.length; i++) {
    const h = hijos[i];
    const hOrder = parseInt(h.dataset.order || "0", 10);
    if (parseInt(div.dataset.order, 10) < hOrder) {
      cont.insertBefore(div, h);
      insertado = true;
      break;
    }
  }
  if (!insertado) cont.appendChild(div);
}
reservasRef.on("child_added", snap => {
  const v = snap.val();
  appendReservaToList({fecha: v.fecha, hora: v.hora, nombre: v.nombre, apellido: v.apellido, key: snap.key});
});
diasBloqueadosRef.on("value", snapshot => {
  diasBloqueados = [];
  snapshot.forEach(child => {
    const v = child.val();
    if (v && v.fecha) diasBloqueados.push(v.fecha);
  });
  actualizarBarraMes();
});
diasSemanaBloqueadosRef.on("value", snapshot => {
  diasSemanaBloqueados = snapshot.val() || [];
  actualizarBarraMes();
  actualizarBotonesSemana();
});
const diasSemanaNombres = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function actualizarBotonesSemana() {
  for (let i = 0; i <= 6; i++) {
    const btn = document.getElementById(`btn-toggle-${i}`);
    if (!btn) continue;
    const bloqueado = diasSemanaBloqueados.includes(i);
    const nombreDia = diasSemanaNombres[i];
    if (bloqueado) {
      btn.innerHTML = `${nombreDia} <br>⛔ CERRADO`;
      btn.style.backgroundColor = "#c0392b";
    } else {
      btn.innerHTML = `${nombreDia} <br>✅ ABIERTO`;
      btn.style.backgroundColor = "#27ae60";
    }
    btn.onclick = () => toggleDiaSemana(i);
  }
}
function toggleDiaSemana(diaIndex) {
  const index = diasSemanaBloqueados.indexOf(diaIndex);
  let nuevos = [...diasSemanaBloqueados];
  if (index > -1) {
    nuevos.splice(index, 1);
  } else {
    nuevos.push(diaIndex);
  }
  diasSemanaBloqueadosRef.set(nuevos);
}
horariosRef.on("value", snapshot => {
  horariosPersonalizados = snapshot.val() || {};
  actualizarBarraMes();
});
function obtenerHorarioDelDiaDesdeFecha(fechaStr) {
  if (horariosPersonalizados[fechaStr]) return horariosPersonalizados[fechaStr];
  const [y, m, d] = fechaStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDay();
  const horas = [];
  function pushRange(start,end){ for(let h=start; h<=end; h++) horas.push(String(h).padStart(2,"0")+":00"); }
  if (day === 6) { pushRange(9,14); return horas; }
  pushRange(9,18);
  return horas;
}
function generarCuadroCalendario() {
  const mesStr = `${fechaActualCalendario.getFullYear()}-${String(fechaActualCalendario.getMonth()+1).padStart(2,"0")}`;
  cuadroCalendario.innerHTML = "";
  const [anio, mes] = mesStr.split("-");
  const fechaInicio = new Date(anio, mes-1, 1);
  const primerDiaSemana = fechaInicio.getDay();
  const totalDias = new Date(anio, mes, 0).getDate();
  const offset = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  for (let i=0;i<offset;i++) cuadroCalendario.appendChild(document.createElement("div"));
  for (let dia=1; dia<=totalDias; dia++) {
    const fechaActual = `${anio}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    const celda = document.createElement("div");
    celda.classList.add("diaCalendario");
    celda.textContent = dia;
    const horasReservadas = reservasPorDia[fechaActual] || [];
    const horarioDelDia = obtenerHorarioDelDiaDesdeFecha(fechaActual);
    const fechaCelda = new Date(anio, mes-1, dia);
    const diaPasado = fechaCelda < hoy;
    const diaSemana = fechaCelda.getDay();
    const estaBloqueado = diasBloqueados.includes(fechaActual) || 
                          (diasSemanaBloqueados && diasSemanaBloqueados.includes(diaSemana)) ||
                          horarioDelDia.length === 0;
    const estaOcupado = horasReservadas.length >= horarioDelDia.length;
    if (diaPasado) celda.classList.add("diaPasado");
    else if (estaBloqueado) celda.classList.add("diaBloqueado");
    else if (estaOcupado) celda.classList.add("diaOcupado");
    else celda.classList.add("diaLibre");
    if (diaPasado || (!modoBloqueoDias && estaBloqueado)) celda.style.pointerEvents = "none";
    celda.onclick = () => {
      if (diaPasado) return;
      if (modoGestionHorarios) {
        fechaSeleccionadaParaConfigurar = fechaActual;
        abrirVentanaConfiguracionHorarios();
      } else if (modoBloqueoDias) {
        if (estaBloqueado) {
          diasBloqueadosRef.once("value", snapshot => {
            snapshot.forEach(child => {
              if (child.val().fecha === fechaActual) child.ref.remove();
            });
          });
        } else {
          diasBloqueadosRef.push({ fecha: fechaActual });
        }
        actualizarBarraMes();
      } else {
        if (estaBloqueado) return;
        fechaInput.value = fechaActual;
        abrirVentanaHorarios(fechaActual);
        cerrarCalendarioModal();
      }
    };
    cuadroCalendario.appendChild(celda);
  }
}
function actualizarBarraMes() {
  const mes = fechaActualCalendario.getMonth();
  const año = fechaActualCalendario.getFullYear();
  tituloMes.textContent = `${mesesTexto[mes]} ${año}`;
  generarCuadroCalendario();
}
botonAnterior.onclick = () => { fechaActualCalendario.setMonth(fechaActualCalendario.getMonth()-1); actualizarBarraMes(); };
botonSiguiente.onclick = () => { fechaActualCalendario.setMonth(fechaActualCalendario.getMonth()+1); actualizarBarraMes(); };
function abrirVentanaHorarios(fecha) {
  tituloVentana.textContent = `HORAS DISPONIBLES ${fecha}`;
  horariosDisponibles.innerHTML = "";
  const horasReservadas = reservasPorDia[fecha] || [];
  const horarioDelDia = obtenerHorarioDelDiaDesdeFecha(fecha);
  horarioDelDia.forEach(hora => {
    const bloque = document.createElement("div");
    bloque.classList.add("bloqueHora");
    if (horasReservadas.includes(hora)) {
      bloque.classList.add("horaOcupada");
      bloque.textContent = `⛔ ${hora}`;
    } else {
      bloque.classList.add("horaLibre");
      bloque.textContent = `✅ ${hora}`;
      bloque.onclick = () => {
        document.getElementById("hora").value = hora;
        fechaInput.value = fecha;
        document.getElementById("modal-hora-personalizada").style.display = "block";
        ventanaHorarios.style.display = "none";
      };
    }
    horariosDisponibles.appendChild(bloque);
  });
  ventanaHorarios.style.display = "block";
}
cerrarVentana.onclick = () => { ventanaHorarios.style.display = "none"; };
window.onclick = (e) => { if (e.target === ventanaHorarios) ventanaHorarios.style.display = "none"; };
function enviarMensajeWhatsApp() {
  const nombre = document.getElementById("nombre")?.value.trim();
  const apellido = document.getElementById("apellido")?.value.trim();
  const fecha = fechaInput.value;
  const hora = document.getElementById("hora").value;
  if (!nombre || !fecha || !hora) {
    alert("Faltan datos: asegúrate de ingresar nombre, fecha y hora");
    return;
  }
  const numeroDestino = "56930273353";
  const nombreCompleto = apellido ? `${nombre} ${apellido}` : nombre;
  const mensaje = `Hola, soy ${nombreCompleto}. Quiero reservar para el día ${fecha} a las ${hora}.`;
  const url = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}
function reservarHora() {
  const nombre = document.getElementById("nombre")?.value.trim();
  const apellido = document.getElementById("apellido")?.value.trim();
  const fecha = fechaInput.value;
  const hora = document.getElementById("hora").value;
  if (!fecha || !hora || !nombre) {
    alert("Completa todos los campos: nombre, fecha y hora");
    return;
  }
  const idBloque = `${fecha}-${hora}`;
  const ref = reservasRef;
  ref.once("value", snapshot => {
    let ocupada = false;
    snapshot.forEach(child => {
      const r = child.val();
      if (`${r.fecha}-${r.hora}` === idBloque) ocupada = true;
    });
    if (ocupada) {
      alert("La hora seleccionada ya está ocupada");
    } else {
      ref.push({ fecha, hora, nombre, apellido }).then(() => {
        document.getElementById("modal-reservada").style.display = "block";
        enviarMensajeWhatsApp();
        setTimeout(() => {
          document.getElementById("modal-reservada").style.display = "none";
          document.getElementById("modal-hora-personalizada").style.display = "none";
        }, 1500);
      });
    }
  });
}
document.getElementById("reservar-button").onclick = reservarHora;
function abrirCalendarioModal() { document.getElementById('modal-calendario').classList.add('activa'); actualizarBarraMes(); }
function cerrarCalendarioModal() { document.getElementById('modal-calendario').classList.remove('activa'); }
document.getElementById('btn-whatsapp').onclick = function(e){ e.preventDefault(); abrirCalendarioModal(); };
const heroBtn = document.getElementById('btn-agendar-hero'); if (heroBtn) heroBtn.onclick = function(e){ e.preventDefault(); abrirCalendarioModal(); };
const contactoBtn = document.getElementById('btn-agendar-contacto'); if (contactoBtn) contactoBtn.onclick = function(e){ e.preventDefault(); abrirCalendarioModal(); };
document.getElementById('cerrar-modal-calendario').onclick = cerrarCalendarioModal;
document.getElementById('cambiar-hora-btn').onclick = function(e){
  e.preventDefault();
  const f = document.getElementById('fecha').value;
  if (f) abrirVentanaHorarios(f);
  else abrirCalendarioModal();
};
btnPanel.onclick = function(e){ e.preventDefault(); modalAcceso.style.display = "block"; };
document.getElementById('cerrar-modal-acceso').onclick = function(){ modalAcceso.style.display = "none"; };
document.getElementById('cerrar-modal-control').onclick = function(){ modalControl.style.display = "none"; modoBloqueoDias = false; modoGestionHorarios = false; };
document.getElementById('cerrar-modal-config').onclick = function(){ modalConfigHorarios.style.display = "none"; modoGestionHorarios = false; };
document.getElementById('btn-entrar').onclick = function(){
  const claveInputVal = document.getElementById("clave-input").value;
  if (claveInputVal === "1234") {
    modalAcceso.style.display = "none";
    modalControl.style.display = "block";
    document.getElementById("clave-input").value = "";
  } else {
    alert("Clave incorrecta");
  }
};
document.getElementById('activar-bloqueo').onclick = function(){ 
  modoBloqueoDias = true; 
  modoGestionHorarios = false; 
  modalControl.style.display = "none"; 
  document.getElementById('desactivar-bloqueo').style.display = 'none';
  document.getElementById('desactivar-bloqueo').style.display = 'block';
  actualizarBarraMes(); 
};
document.getElementById('desactivar-bloqueo').onclick = function(){ 
  modoBloqueoDias = false; 
  document.getElementById('desactivar-bloqueo').style.display = "none";
  actualizarBarraMes(); 
};
document.getElementById('activar-horarios').onclick = function(){  modoGestionHorarios = true; modoBloqueoDias = false; modalControl.style.display = "none"; };
document.getElementById('borrar-todas').onclick = function(){
  if (confirm('¿Borrar todas las reservas?')) {
    reservasRef.remove().then(() => {
      modalControl.style.display = "none";
      modoBloqueoDias = false;
      modoGestionHorarios = false;
      actualizarBarraMes();
    }).catch(error => { alert("Error al borrar las reservas: " + error.message); });
  }
};
document.getElementById('cerrar-panel').onclick = function(){ modalControl.style.display = "none"; modoBloqueoDias = false; modoGestionHorarios = false; };
function abrirVentanaConfiguracionHorarios() {
  tituloConfigHorarios.textContent = "Configurar Horario " + fechaSeleccionadaParaConfigurar;
  fechaConfigHorarios.textContent = "";
  document.getElementById("boton-horario-semana").onclick = () => { cargarHorasEnModal(obtenerHorarioSemanaBase()); };
  document.getElementById("boton-horario-sabado").onclick = () => { cargarHorasEnModal(obtenerHorarioSabadoBase()); };
  document.getElementById("boton-horario-cerrado").onclick = () => { cargarHorasEnModal([]); };
  const horarioActual = horariosPersonalizados[fechaSeleccionadaParaConfigurar] || [];
  cargarHorasEnModal(horarioActual);
  modalConfigHorarios.style.display = "block";
}
function obtenerHorarioSemanaBase() {
  const horas = [];
  for (let h = 9; h <= 18; h++) horas.push(String(h).padStart(2,"0")+":00");
  return horas;
}
function obtenerHorarioSabadoBase() {
  const horas = [];
  for (let h = 9; h <= 14; h++) horas.push(String(h).padStart(2,"0")+":00");
  return horas;
}
function cargarHorasEnModal(horasActivas) {
  botonesToggleHoras.innerHTML = "";
  const base = Array.from(new Set([...obtenerHorarioSemanaBase(), ...obtenerHorarioSabadoBase()]));
  base.forEach(hora => {
    const boton = document.createElement("button");
    boton.textContent = hora;
    boton.classList.add("toggle-hora");
    if (horasActivas.includes(hora)) boton.classList.add("activo");
    boton.onclick = () => { boton.classList.toggle("activo"); };
    botonesToggleHoras.appendChild(boton);
  });
}
document.getElementById("guardar-horario").onclick = function() {
  const horasSeleccionadas = [];
  botonesToggleHoras.querySelectorAll(".activo").forEach(b => { horasSeleccionadas.push(b.textContent); });
  if (horasSeleccionadas.length > 0) {
    horariosRef.child(fechaSeleccionadaParaConfigurar).set(horasSeleccionadas).then(() => {
      modalConfigHorarios.style.display = "none";
      modoGestionHorarios = false;
      actualizarBarraMes();
    }).catch(error => { alert("Error al guardar el horario: " + error.message); });
  } else {
    horariosRef.child(fechaSeleccionadaParaConfigurar).remove().then(() => {
      modalConfigHorarios.style.display = "none";
      modoGestionHorarios = false;
      actualizarBarraMes();
    }).catch(error => { alert("Error al borrar el horario: " + error.message); });
  }
};
document.getElementById("cambiar-dia-btn").addEventListener("click", function() {
  document.getElementById('modal-calendario').style.display = 'block'; 
  document.getElementById('modal-hora-personalizada').style.display = 'none';
  const fechaInput = document.getElementById("fecha");
  fechaInput.disabled = false;
  fechaInput.focus();
});
document.getElementById("cambiar-hora-btn").addEventListener("click", function(e) {
  document.getElementById("modal-hora-personalizada").style.display = 'none';
  e.preventDefault();
});
const reservarBtn = document.getElementById("reservar-button");
const nombreInput = document.getElementById("nombre");
if (reservarBtn && nombreInput) {
  reservarBtn.disabled = !nombreInput.value.trim();
  nombreInput.addEventListener("input", function() {
    reservarBtn.disabled = this.value.trim().length === 0;
  });
}
