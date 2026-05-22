import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci-2026.firebaseapp.com",
    databaseURL: "https://sistema-cci-default-rtdb.firebaseio.com/",
    projectId: "sistema-cci-2026",
    storageBucket: "sistema-cci-2026.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65",
    measurementId: "G-7ZXR8J734L"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Seleção de elementos do DOM
const form = document.getElementById('form-login');
const inputSenha = document.getElementById('senha');
const btnEye = document.querySelector('.eye');

/* =========================================================================
   FUNCIONALIDADE: EXIBIR/OCULTAR SENHA (.eye)
========================================================================= */
if (btnEye && inputSenha) {
    // Configura o ícone inicial usando classes do Bootstrap Icons já importadas
    btnEye.innerHTML = '<i class="bi bi-eye"></i>';
    // Importante: define type="button" via JS para garantir que o clique não envie o form
    btnEye.setAttribute('type', 'button'); 

    btnEye.addEventListener('click', (e) => {
        e.preventDefault(); // Evita qualquer comportamento padrão colateral
        
        if (inputSenha.type === 'password') {
            inputSenha.type = 'text';
            btnEye.innerHTML = '<i class="bi bi-eye-slash"></i>'; // Muda para ícone ocultar
        } else {
            inputSenha.type = 'password';
            btnEye.innerHTML = '<i class="bi bi-eye"></i>'; // Muda para ícone mostrar
        }
    });
}

/* =========================================================================
   EVENTO: SUBMIT DO FORMULÁRIO DE LOGIN
========================================================================= */
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const senha = inputSenha.value;

    console.log("Iniciando autenticação...");

    signInWithEmailAndPassword(auth, email, senha)
        .then(async (userCredential) => {
            const uid = userCredential.user.uid;
            console.log("Login realizado! UID:", uid);

            try {
                // 1º Passo: Verifica se é do perfil Coordenação (Gestão)
                const coordRef = ref(db, 'coordenacao/' + uid);
                const snapCoord = await get(coordRef);

                if (snapCoord.exists()) {
                    const dados = snapCoord.val();
                    console.log("Perfil identificado: GESTÃO");
                    localStorage.setItem('usuarioNome', dados.nome || "Gestor");
                    window.location.href = "CORD_painel.html";
                } 
                // 2º Passo: Se não for coordenação, verifica se é Professor
                else {
                    const profRef = ref(db, 'professores/' + uid);
                    const snapProf = await get(profRef);

                    if (snapProf.exists()) {
                        const dados = snapProf.val();
                        console.log("Perfil identificado: PROFESSOR");
                        localStorage.setItem('usuarioNome', dados.nome || "Professor");
                        window.location.href = "PROF_painel.html";
                    } 
                    // Caso o UID não esteja em nenhum nó do Banco
                    else {
                        console.error("UID não encontrado no Realtime Database");
                        alert("Erro: Usuário sem permissões de acesso (UID não encontrado no banco).");
                    }
                }
            } catch (error) {
                console.error("Erro ao acessar o banco de dados:", error);
                alert("Erro técnico ao verificar seu perfil.");
            }
        })
        .catch((error) => {
            console.error("Erro de login:", error.code);

            // Tratamento de erros amigável para o usuário comum
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                alert("E-mail ou senha incorretos.");
            } else if (error.code === 'auth/too-many-requests') {
                alert("Muitas tentativas malsucedidas. A conta foi temporariamente bloqueada. Tente mais tarde.");
            } else {
                alert("Falha ao entrar: " + error.message);
            }
        });
});