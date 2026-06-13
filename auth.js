import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci.firebaseapp.com",
    databaseURL: "https://sistema-cci-default-rtdb.firebaseio.com/",
    projectId: "sistema-cci",
    storageBucket: "sistema-cci.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65",
    measurementId: "G-7ZXR8J734L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const DB_URL = "https://sistema-cci-default-rtdb.firebaseio.com";

(function limparTokenAntigo() {
    const token = localStorage.getItem('firebaseToken');
    if (!token) return;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const projetoCorreto = payload.aud === 'sistema-cci-2026';
        const naoExpirado = payload.exp * 1000 > Date.now();
        if (!projetoCorreto || !naoExpirado) {
            localStorage.removeItem('firebaseToken');
            console.log('Token antigo/inválido removido do localStorage.');
        }
    } catch (e) {
        localStorage.removeItem('firebaseToken');
    }
})();

const inputSenha = document.getElementById('senha');
const btnEye     = document.querySelector('.eye');

if (btnEye && inputSenha) {
    btnEye.innerHTML = '<i class="bi bi-eye"></i>';
    btnEye.setAttribute('type', 'button');
    btnEye.addEventListener('click', (e) => {
        e.preventDefault();
        if (inputSenha.type === 'password') {
            inputSenha.type = 'text';
            btnEye.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            inputSenha.type = 'password';
            btnEye.innerHTML = '<i class="bi bi-eye"></i>';
        }
    });
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const senha = inputSenha.value;

    console.log("Iniciando autenticação...");

    let userCredential;
    try {
        userCredential = await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
        console.error("Erro de login:", error.code);
        if (error.code === 'auth/invalid-credential' ||
            error.code === 'auth/user-not-found'     ||
            error.code === 'auth/wrong-password') {
            alert("E-mail ou senha incorretos.");
        } else if (error.code === 'auth/too-many-requests') {
            alert("Muitas tentativas. Conta bloqueada temporariamente.");
        } else {
            alert("Falha ao entrar: " + error.message);
        }
        return;
    }

    const uid   = userCredential.user.uid;
    const token = await userCredential.user.getIdToken();
    console.log("Login realizado! UID:", uid);

    try {

        const resCoord = await fetch(`${DB_URL}/coordenacao/${uid}.json?auth=${token}`);
        const dadosCoord = await resCoord.json();

        if (dadosCoord && dadosCoord !== null) {
            console.log("Perfil: GESTÃO");
            localStorage.setItem('usuarioNome',  dadosCoord.nome || "Gestor");
            localStorage.setItem('firebaseToken', token);
            localStorage.setItem('usuarioUID',    uid);
            window.location.href = "CORD_painel.html";
            return;
        }

        const resProf = await fetch(`${DB_URL}/professores/${uid}.json?auth=${token}`);
        const dadosProf = await resProf.json();

        if (dadosProf && dadosProf !== null) {
            console.log("Perfil: PROFESSOR");
            localStorage.setItem('usuarioNome',  dadosProf.nome || "Professor");
            localStorage.setItem('firebaseToken', token);
            localStorage.setItem('usuarioUID',    uid);
            window.location.href = "PROF_painel.html";
            return;
        }

        console.error("UID não encontrado no banco.");
        alert("Usuário sem permissões de acesso. Contate a coordenação.");

    } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        alert("Erro técnico ao verificar seu perfil: " + error.message);
    }
});