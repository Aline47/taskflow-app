// Importa las funciones que necesitas de los SDKs que necesitas
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Añade la configuración de tu proyecto de Firebase aquí
const firebaseConfig = {
  apiKey: "AIzaSyDEK-mh-_Om83U8Ov_j3MprTnCqUAtc0OQ",
  authDomain: "asignacion-de-tareas.firebaseapp.com",
  projectId: "asignacion-de-tareas",
  storageBucket: "asignacion-de-tareas.firebasestorage.app",
  messagingSenderId: "458090747767",
  appId: "1:458090747767:web:894bcf8ee5444cf8ca7372",
  measurementId: "G-EK65W6M4ZV"
};
// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// LA LÍNEA MÁS IMPORTANTE: Exporta la base de datos
// Asegúrate de que la palabra "export" esté aquí.
export const db = getFirestore(app);