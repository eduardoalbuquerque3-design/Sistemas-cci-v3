// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci-2026.firebaseapp.com",
    databaseURL: "https://sistema-cci-default-rtdb.firebaseio.com/",
    projectId: "sistema-cci-2026",
    storageBucket: "sistema-cci-2026.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65"
};

// Inicializa o Firebase se ainda não foi inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

async function executarViradaDeSemestre() {
    // INTERAÇÃO VISUAL IMEDIATA
    console.log("Iniciando processo de virada...");
    const btnOriginal = event.target; // Captura o botão que foi clicado
    const textoOriginal = btnOriginal.innerText;
    
    // Feedback visual no botão
    btnOriginal.style.opacity = "0.5";
    btnOriginal.innerText = "Aguardando...";

    try {
        const { value: confirmar } = await Swal.fire({
            title: 'Encerrar Semestre?',
            text: "Os alunos aprovados (Média >= 6) subirão de módulo e as notas serão zeradas.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, aplicar virada!',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmar) {
            btnOriginal.style.opacity = "1";
            btnOriginal.innerText = textoOriginal;
            return;
        }

        // Loader Visual
        Swal.fire({
            title: 'Processando Alunos',
            html: '<div class="spinner-border text-primary"></div><br>Isso pode levar alguns segundos...',
            showConfirmButton: false,
            allowOutsideClick: false
        });

        const snapshot = await database.ref('alunos').once('value');
        const alunos = snapshot.val();

        if (!alunos) {
            throw new Error("Nenhum aluno encontrado no banco.");
        }

        const updates = {};
        const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

        Object.keys(alunos).forEach(id => {
            const aluno = alunos[id];
            
            // Lógica de Média
            let somaMedias = 0;
            for (let i = 1; i <= 4; i++) {
                const p = aluno.notas?.[`p${i}`] || { n1: 0, n2: 0 };
                somaMedias += (parseFloat(p.n1) || 0) + (parseFloat(p.n2) || 0);
            }
            const mediaFinal = somaMedias / 4;

            // Registro Histórico
            updates[`historico_notas/${id}/${dataHoje}`] = {
                modulo_concluido: aluno.modulo || 1,
                media_final: mediaFinal.toFixed(1)
            };

            // Progressão
            let modulo = parseInt(aluno.modulo || 1);
            if (mediaFinal >= 6) {
                if (modulo < 6) modulo++;
                else updates[`alunos/${id}/situacao`] = "Concluído";
            }

            updates[`alunos/${id}/modulo`] = modulo;
            updates[`alunos/${id}/notas`] = { p1: {n1:0,n2:0}, p2: {n1:0,n2:0}, p3: {n1:0,n2:0}, p4: {n1:0,n2:0} };
            updates[`alunos/${id}/faltas_porSemestre`] = 0;
        });

        await database.ref().update(updates);

        // Sucesso Visual
        await Swal.fire('Sucesso!', 'O novo semestre começou!', 'success');
        location.reload(); // Recarrega a página para atualizar os dados na tela

    } catch (error) {
        console.error(error);
        Swal.fire('Erro!', error.message, 'error');
        btnOriginal.style.opacity = "1";
        btnOriginal.innerText = textoOriginal;
    }
}