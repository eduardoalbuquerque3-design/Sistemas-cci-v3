import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';

import {
    getAuth,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci-2026.firebaseapp.com",
    databaseURL: "https://sistema-cci-default-rtdb.firebaseio.com/",
    projectId: "sistema-cci-2026",
    storageBucket: "sistema-cci-2026.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65"
};


// ================= FIREBASE =================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);


// ================= FORM =================

const form =
    document.getElementById('form-recuperacao');


// ================= RECUPERAÇÃO =================

form.addEventListener('submit', async (e) => {

    e.preventDefault();

    const email =
        document
        .querySelector('input[type="email"]')
        .value
        .trim();

    Swal.fire({
        title: 'Enviando email...',
        text: 'Aguarde...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {

        // ENVIA EMAIL
        await sendPasswordResetEmail(
            auth,
            email
        );

        console.log(
            "EMAIL ENVIADO PARA:",
            email
        );

        Swal.fire({
            icon: 'success',
            title: 'Email enviado!',
            text:
                'Verifique sua caixa de entrada, spam ou promoções.',
            background: '#07152f',
            color: '#fff'
        });

    } catch (error) {

        console.error(
            "CÓDIGO:",
            error.code
        );

        console.error(
            "MENSAGEM:",
            error.message
        );

        let msg = "Erro ao enviar email.";

        if (
            error.code === 'auth/user-not-found'
        ) {
            msg = "Este email não está cadastrado.";
        }

        if (
            error.code === 'auth/too-many-requests'
        ) {
            msg =
                "Muitas tentativas.\nAguarde alguns minutos.";
        }

        if (
            error.code === 'auth/invalid-email'
        ) {
            msg = "Email inválido.";
        }

        Swal.fire({
            icon: 'error',
            title: 'Erro!',
            text: msg,
            background: '#07152f',
            color: '#fff'
        });
    }

});