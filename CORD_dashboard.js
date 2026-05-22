let chartFaltas, chartMedias, chartDesempenho;
let dadosBrutos = {};
let filtroAtual = { turma: 'TODAS', turno: 'TODOS', disciplina: 'TODAS' };

document.addEventListener('DOMContentLoaded', () => {
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

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    db.ref('alunos').on('value', (snapshot) => {
        dadosBrutos = snapshot.val() || {};
        console.log("Dados recebidos:", dadosBrutos);
        aplicarFiltrosEProcessar();
    });
});

function filtrar(tipo, valor, elemento) {
    const botoes = elemento.parentElement.querySelectorAll('.btn-filter');
    botoes.forEach(btn => btn.classList.remove('active'));
    elemento.classList.add('active');

    filtroAtual[tipo] = valor;
    aplicarFiltrosEProcessar();
}

function aplicarFiltrosEProcessar() {
    const resumoTurmas = {};
    let acimaMedia = 0;
    let abaixoMedia = 0;
    let totalAlunosFiltrados = 0;
    let somaFaltasFiltradas = 0;

    const listaParaTabela = [];

    Object.keys(dadosBrutos).forEach(id => {
        const aluno = dadosBrutos[id];

        const passaTurma = filtroAtual.turma === 'TODAS' || aluno.turma === filtroAtual.turma;
        const passaTurno = filtroAtual.turno === 'TODOS' || aluno.turno === filtroAtual.turno;
        const discNome = (aluno.escola_regular?.nome || "").toUpperCase();
        const passaDisc = filtroAtual.disciplina === 'TODAS' || discNome.includes(filtroAtual.disciplina);

        if (passaTurma && passaTurno && passaDisc) {
            totalAlunosFiltrados++;
            somaFaltasFiltradas += (aluno.faltas_porSemestre || 0);

            const t = aluno.turma || "Sem Turma";
            if (!resumoTurmas[t]) {
                resumoTurmas[t] = { faltas: 0, somaNotas: 0, qtdAlunos: 0 };
            }

            resumoTurmas[t].faltas += (aluno.faltas_porSemestre || 0);

            const n1 = parseFloat(aluno.notas?.nota1) || 0;
            const n2 = parseFloat(aluno.notas?.nota2) || 0;
            const media = (n1 + n2) / 2;

            resumoTurmas[t].somaNotas += media;
            resumoTurmas[t].qtdAlunos += 1;

            if (media >= 7) acimaMedia++; else abaixoMedia++;

            listaParaTabela.push({ ...aluno, mediaCalculada: media });
        }
    });

    document.getElementById('totalAlunos').innerText = totalAlunosFiltrados;
    document.getElementById('mediaFaltas').innerText = totalAlunosFiltrados > 0 ? (somaFaltasFiltradas / totalAlunosFiltrados).toFixed(1) : 0;

    renderizarTabela(listaParaTabela);
    atualizarGraficos(resumoTurmas, acimaMedia, abaixoMedia);
}

function atualizarGraficos(resumoTurmas, acima, abaixo) {
    const labels = Object.keys(resumoTurmas);
    const dadosFaltas = labels.map(l => resumoTurmas[l].faltas);
    const dadosMedias = labels.map(l => (resumoTurmas[l].somaNotas / resumoTurmas[l].qtdAlunos).toFixed(1));

    const opcoes = {

        responsive: true,
        maintainAspectRatio: false,

        plugins: {

            legend: {
                labels: {
                    color: '#fff',
                    font: {
                        size: 13
                    }
                }
            }

        },

        scales: {

            y: {
                ticks: {
                    color: '#cbd5e1'
                },
                grid: {
                    color: 'rgba(255,255,255,.05)'
                }
            },

            x: {
                ticks: {
                    color: '#cbd5e1'
                },
                grid: {
                    color: 'rgba(255,255,255,.03)'
                }
            }

        }

    };

    if (chartFaltas) chartFaltas.destroy();
    const ctxFaltas = document.getElementById('chartFaltas');
    if (ctxFaltas) {
        chartFaltas = new Chart(ctxFaltas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Faltas', data: dadosFaltas, backgroundColor: [
                        '#22c55e',
                        '#3b82f6',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderRadius: 12
                }]
            },
            options: opcoes
        });
    }

    if (chartMedias) chartMedias.destroy();
    const ctxMedias = document.getElementById('chartMedias');
    if (ctxMedias) {
        chartMedias = new Chart(ctxMedias, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Média de Notas', data: dadosMedias, borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,.2)',
                    fill: true,
                    tension: .4
                }]
            },
            options: opcoes
        });
    }

    if (chartDesempenho) chartDesempenho.destroy();
    const ctxDes = document.getElementById('chartDesempenho');
    if (ctxDes) {
        chartDesempenho = new Chart(ctxDes, {
            type: 'pie',
            data: {
                labels: ['Acima de 7.0', 'Abaixo de 7.0'],
                datasets: [{
                    data: [acima, abaixo], backgroundColor: [
                        '#22c55e',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: opcoes
        });
    }
}

function renderizarTabela(alunos) {
    const corpo = document.getElementById('tabelaCorpoDashboard');
    if (!corpo) return;
    corpo.innerHTML = "";
    alunos.forEach(aluno => {
        const tr = document.createElement('tr');
        const statusClass = aluno.mediaCalculada >= 7 ? 'num-verde' : 'num-vermelho';
        tr.innerHTML = `
            <td>${aluno.nome_completo}</td>
            <td>${aluno.turma}</td>
            <td>${aluno.escola_regular?.nome || '---'}</td>
            <td>${aluno.notas?.nota1 || 0}</td>
            <td>${aluno.notas?.nota2 || 0}</td>
            <td class="${statusClass}"><strong>${aluno.mediaCalculada.toFixed(1)}</strong></td>
            <td>${aluno.faltas_porSemestre || 0}</td>
        `;
        corpo.appendChild(tr);
    });
}