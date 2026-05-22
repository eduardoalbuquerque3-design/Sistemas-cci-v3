import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';

import {
    getAuth,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import {
    getDatabase,
    ref,
    set
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

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


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);




document
    .getElementById('formCadastro')
    .addEventListener('submit', async function (e) {

        e.preventDefault();

        const nome =
            document.getElementById('nome').value;

        const cpf =
            document.getElementById('cpf').value;

        const disciplina =
            document.getElementById('disciplina').value;

        const email =
            document.getElementById('email').value;

        try {

            const senhaTemporaria = "123456";


            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    senhaTemporaria
                );

            const uid = userCredential.user.uid;


            await set(
                ref(db, 'professores/' + uid),
                {
                    nome,
                    cpf,
                    disciplina,
                    email,
                    primeiroAcesso: true
                }
            );


            await sendPasswordResetEmail(
                auth,
                email
            );

            alert(
                "Professor cadastrado!\n\n" +
                "O email para criar senha foi enviado."
            );

            document
                .getElementById('formCadastro')
                .reset();

        } catch (error) {

            console.error(error);

            alert(
                "Erro:\n\n" +
                error.message
            );
        }

    });