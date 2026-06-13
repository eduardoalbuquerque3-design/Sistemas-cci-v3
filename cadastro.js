import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci-2026.firebaseapp.com",
    databaseURL: "https://sistema-cci-2026-default-rtdb.firebaseio.com/",
    projectId: "sistema-cci-2026",
    storageBucket: "sistema-cci-2026.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const form = document.getElementById('form-primeiro-acesso');
const inputSenha = document.getElementById('cad-senha');
const btnEye = document.querySelector('.eye');

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

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cpfInput = document.getElementById('cad-cpf').value.trim();
    const emailInput = document.getElementById('cad-email').value.trim();
    const senhaInput = inputSenha.value;

    console.log("Iniciando verificação de pré-cadastro...");

    try {
        const profsRef = ref(db, 'professores');
        const snapshot = await get(profsRef);

        if (snapshot.exists()) {
            let chaveOriginal = null;
            let dadosProfessor = null;

            snapshot.forEach((childSnapshot) => {
                const dados = childSnapshot.val();
                if (dados.cpf === cpfInput && dados.email === emailInput) {
                    chaveOriginal = childSnapshot.key;
                    dadosProfessor = dados;
                }
            });

            if (chaveOriginal) {
                console.log("Pré-cadastro validado. Criando credenciais de autenticação...");

                const userCredential = await createUserWithEmailAndPassword(auth, emailInput, senhaInput);
                const uid = userCredential.user.uid;

                console.log("Usuário autenticado criado com UID:", uid);

                const updates = {};

                updates[`professores/${uid}`] = {
                    cpf: dadosProfessor.cpf,
                    disciplina: dadosProfessor.disciplina || "",
                    email: dadosProfessor.email,
                    nome: dadosProfessor.nome
                };

                updates[`professores/${chaveOriginal}`] = null;

                await update(ref(db), updates);

                alert("Cadastro concluído com sucesso! Agora você pode entrar.");
                window.location.href = "index.html";

            } else {
                alert("Dados de pré-cadastro não encontrados. Verifique seu CPF e E-mail institucional junto à coordenação.");
            }
        } else {
            alert("Nenhum registro de professores disponível para validação.");
        }
    } catch (error) {
        console.error("Erro no fluxo de primeiro acesso:", error.code, error.message);

        if (error.code === 'auth/email-already-in-use') {
            alert("Este e-mail já está sendo utilizado por outra conta.");
        } else if (error.code === 'auth/weak-password') {
            alert("A senha escolhida é muito fraca. Digite pelo menos 6 caracteres.");
        } else if (error.code === 'auth/invalid-email') {
            alert("O formato do e-mail inserido é inválido.");
        } else {
            alert("Erro ao realizar o cadastro: " + error.message);
        }
    }
});