let chartFaltas, chartMedias, chartDesempenho;
let dadosBrutos = {};
let filtroAtual = { turma: 'TODAS', turno: 'TODOS', disciplina: 'TODAS' };

document.addEventListener('DOMContentLoaded', () => {
    // 1. CONFIGURAÇÃO CORRIGIDA COM O '-2026'
const firebaseConfig = {
    apiKey: "AIzaSyBvSOKw2VTeG1uMDqDn3-SWi0Hsf2z6i2w",
    authDomain: "sistema-cci.firebaseapp.com",        // <-- VEJA SE TEM O -2026
    databaseURL: "https://sistema-cci-default-rtdb.firebaseio.com/", // <-- VEJA SE TEM O -2026
    projectId: "sistema-cci",                          // <-- VEJA SE TEM O -2026
    storageBucket: "sistema-cci.firebasestorage.app",
    messagingSenderId: "633401547904",
    appId: "1:633401547904:web:0572615ffba4227a6f5a65",
    measurementId: "G-7ZXR8J734L"
};

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // Puxa os dados reais do Firebase
    db.ref('alunos').on('value', (snapshot) => {
        dadosBrutos = snapshot.val() || {};
        console.log("Dados recebidos da Nuvem:", dadosBrutos);
        aplicarFiltrosEProcessar();
    });

    // Configuração dos seletores de filtros da tela
    document.getElementById('filtroTurma')?.addEventListener('change', (e) => {
        filtroAtual.turma = e.target.value;
        aplicarFiltrosEProcessar();
    });

    document.getElementById('filtroTurno')?.addEventListener('change', (e) => {
        filtroAtual.turno = e.target.value;
        aplicarFiltrosEProcessar();
    });
});

function aplicarFiltrosEProcessar() {
    let filtrados = [];
    
    Object.keys(dadosBrutos).forEach(id => {
        const aluno = dadosBrutos[id];
        let passaTurma = (filtroAtual.turma === 'TODAS' || aluno.turma === filtroAtual.turma);
        
        let turnoAluno = 'OUTRO';
        if(aluno.horario) {
            const h = aluno.horario.toLowerCase();
            if(h.includes('manhã') || h.includes('07:') || h.includes('09:')) turnoAluno = 'MANHA';
            else if(h.includes('tarde') || h.includes('13:') || h.includes('15:')) turnoAluno = 'TARDE';
            else if(h.includes('noite') || h.includes('18:') || h.includes('19:')) turnoAluno = 'NOITE';
        }
        let passaTurno = (filtroAtual.turno === 'TODOS' || turnoAluno === filtroAtual.turno);

        if(passaTurma && passaTurno) {
            filtrados.push({ id, ...aluno });
        }
    });

    atualizarCardsInformativos(filtrados);
    processarGraficos(filtrados);
    renderizarTabela(filtrados);
}

function atualizarCardsInformativos(alunos) {
    const total = alunos.length;
    let totalFaltas = 0;
    let somaMedias = 0;
    let contMedias = 0;

    alunos.forEach(a => {
        if(a.faltas) {
            Object.keys(a.faltas).forEach(mes => {
                totalFaltas += (parseInt(a.faltas[mes]) || 0);
            });
        }
        if(a.mediaCalculada !== undefined) {
            somaMedias += parseFloat(a.mediaCalculada);
            contMedias++;
        }
    });

    const mediaGeral = contMedias > 0 ? (somaMedias / contMedias) : 0;

    if(document.getElementById('cardTotalAlunos')) document.getElementById('cardTotalAlunos').innerText = total;
    if(document.getElementById('cardTotalFaltas')) document.getElementById('cardTotalFaltas').innerText = totalFaltas;
    if(document.getElementById('cardMediaGeral')) document.getElementById('cardMediaGeral').innerText = mediaGeral.toFixed(1);
}

function processarGraficos(alunos) {
    let faixasFaltas = { '0-5': 0, '6-10': 0, '11-15': 0, '16+': 0 };
    let faixasMedias = { '0-4.9': 0, '5.0-6.9': 0, '7.0-8.9': 0, '9.0-10': 0 };
    let acima = 0, abaixo = 0;

    alunos.forEach(a => {
        let fTot = 0;
        if(a.faltas) {
            Object.keys(a.faltas).forEach(m => fTot += (parseInt(a.faltas[m]) || 0));
        }
        if(fTot <= 5) faixasFaltas['0-5']++;
        else if(fTot <= 10) faixasFaltas['6-10']++;
        else if(fTot <= 15) faixasFaltas['11-15']++;
        else faixasFaltas['16+']++;

        let med = parseFloat(a.mediaCalculada) || 0;
        if(med < 5) faixasMedias['0-4.9']++;
        else if(med < 7) faixasMedias['5.0-6.9']++;
        else if(med < 9) faixasMedias['7.0-8.9']++;
        else faixasMedias['9.0-10']++;

        if(med >= 7.0) acima++; else abaixo++;
    });

    const opcoes = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

    if (chartFaltas) chartFaltas.destroy();
    const ctxF = document.getElementById('chartFaltas');
    if (ctxF) {
        chartFaltas = new Chart(ctxF, {
            type: 'bar',
            data: {
                labels: Object.keys(faixasFaltas),
                datasets: [{ data: Object.values(faixasFaltas), backgroundColor: '#38bdf8' }]
            },
            options: opcoes
        });
    }

    if (chartMedias) chartMedias.destroy();
    const ctxM = document.getElementById('chartMedias');
    if (ctxM) {
        chartMedias = new Chart(ctxM, {
            type: 'bar',
            data: {
                labels: Object.keys(faixasMedias),
                datasets: [{ data: Object.values(faixasMedias), backgroundColor: '#a855f7' }]
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
                datasets: [{ data: [acima, abaixo], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0 }]
            },
            options: { ...opcoes, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#fff' } } } }
        });
    }
}

function renderizarTabela(alunos) {
    const corpo = document.getElementById('tabelaCorpoDashboard');
    if (!corpo) return;
    corpo.innerHTML = "";
    
    alunos.forEach(aluno => {
        let fTot = 0;
        if(aluno.faltas) {
            Object.keys(aluno.faltas).forEach(m => fTot += (parseInt(aluno.faltas[m]) || 0));
        }
        const med = parseFloat(aluno.mediaCalculada) || 0;
        const statusClass = med >= 7 ? 'num-verde' : 'num-vermelho';
        const faltaClass = fTot >= 15 ? 'num-vermelho' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${aluno.nome_completo || '---'}</td>
            <td>${aluno.turma || '---'}</td>
            <td>${aluno.escola_regular?.nome || '---'}</td>
            <td class="${statusClass}">${med.toFixed(1)}</td>
            <td class="${faltaClass}">${fTot} f.</td>
            <td><span class="badge-sit ${String(aluno.situacao).toLowerCase() === 'ativo' ? 'sit-ativo' : 'sit-inativo'}">${aluno.situacao || 'Ativo'}</span></td>
        `;
        corpo.appendChild(tr);
    });
}

// 2. FUNÇÃO DE EXPORTAR PDF TOTALMENTE CORRIGIDA
window.exportarPDF = function() {
    let filtrados = [];
    Object.keys(dadosBrutos).forEach(id => {
        const aluno = dadosBrutos[id];
        let passaTurma = (filtroAtual.turma === 'TODAS' || aluno.turma === filtroAtual.turma);
        let turnoAluno = 'OUTRO';
        if(aluno.horario) {
            const h = aluno.horario.toLowerCase();
            if(h.includes('manhã') || h.includes('07:') || h.includes('09:')) turnoAluno = 'MANHA';
            else if(h.includes('tarde') || h.includes('13:') || h.includes('15:')) turnoAluno = 'TARDE';
            else if(h.includes('noite') || h.includes('18:') || h.includes('19:')) turnoAluno = 'NOITE';
        }
        let passaTurno = (filtroAtual.turno === 'TODOS' || turnoAluno === filtroAtual.turno);
        if(passaTurma && passaTurno) filtrados.push(aluno);
    });

    if(filtrados.length === 0) {
        Swal.fire('Aviso', 'Não há dados filtrados para exportar.', 'warning');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Configurações de página
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    const mL = 14, mR = 14;

    // Cabeçalho elegante
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 35, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("SICCI — Relatório de Acompanhamento", mL, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Filtros Ativos — Turma: ${filtroAtual.turma} | Turno: ${filtroAtual.turno} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, mL, 26);

    // Mapeia linhas para a tabela do PDF
    const linhasTabela = filtrados.map(aluno => {
        let fTot = 0;
        if(aluno.faltas) {
            Object.keys(aluno.faltas).forEach(m => fTot += (parseInt(aluno.faltas[m]) || 0));
        }
        const med = parseFloat(aluno.mediaCalculada) || 0;
        return [
            aluno.nome_completo || '---',
            aluno.turma || '---',
            aluno.escola_regular?.nome || '---',
            med.toFixed(1),
            `${fTot} faltas`,
            aluno.situacao || 'Ativo'
        ];
    });

    doc.autoTable({
        startY: 42,
        head: [['Nome do Aluno', 'Turma', 'Escola Regular', 'Média Geral', 'Faltas Totais', 'Situação']],
        body: linhasTabela,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 50 }, 2: { cellWidth: 45 } },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 3) {
                const n = parseFloat(data.cell.raw);
                data.cell.styles.textColor = n >= 7 ? [21, 128, 61] : [185, 28, 28];
                data.cell.styles.fontStyle = 'bold';
            }
            if (data.section === 'body' && data.column.index === 4) {
                const f = parseInt(data.cell.raw);
                if (f >= 15) data.cell.styles.textColor = [185, 28, 28];
            }
        }
    });

    // --- Rodapé Dinâmico com a correção de Sintaxe anterior ---
    const totalPgs = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPgs; p++) {
        doc.setPage(p);
        doc.setFillColor(241, 245, 249);
        doc.rect(0, pageH - 12, pageW, 12, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Centro Cearense de Idiomas — Documento gerado automaticamente pelo SICCI', mL, pageH - 4);
        doc.text(`Página ${p} de ${totalPgs}`, pageW - mR, pageH - 4, { align: 'right' });
    }

    doc.save(`Dashboard_CCI_${new Date().toISOString().split('T')[0]}.pdf`);
};