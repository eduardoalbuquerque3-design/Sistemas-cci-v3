const DB_URL = "https://sistema-cci-default-rtdb.firebaseio.com";

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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

let cacheAlunos   = {};
let alunoAtualId  = null;
let mesSelecionado = new Date().getMonth();

let tokenAtual = localStorage.getItem('firebaseToken') || '';

let resolveAuthReady;
const authReady = new Promise(resolve => { resolveAuthReady = resolve; });

auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {

            tokenAtual = await user.getIdToken(true);
            localStorage.setItem('firebaseToken', tokenAtual);
            localStorage.setItem('usuarioUID', user.uid);
        } catch (e) {
            console.error('Erro ao renovar token:', e);
        }
        resolveAuthReady(true);
    } else {

        localStorage.clear();
        window.location.href = 'index.html';
        resolveAuthReady(false);
    }
});

setInterval(async () => {
    const user = auth.currentUser;
    if (user) {
        try {
            tokenAtual = await user.getIdToken(true);
            localStorage.setItem('firebaseToken', tokenAtual);
        } catch (e) {
            console.error('Erro ao renovar token periodicamente:', e);
        }
    }
}, 50 * 60 * 1000);

async function getToken() {
    const user = auth.currentUser;
    if (user) {
        try {

            tokenAtual = await user.getIdToken();
            return tokenAtual;
        } catch (e) {
            console.error('Erro ao obter token:', e);
        }
    }
    return tokenAtual || localStorage.getItem('firebaseToken') || '';
}

async function dbGet(path) {
    const token = await getToken();
    const res = await fetch(`${DB_URL}/${path}.json?auth=${token}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} em GET /${path}`);
    return res.json();
}

async function dbSet(path, valor) {
    const token = await getToken();
    const res = await fetch(`${DB_URL}/${path}.json?auth=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valor)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em SET /${path}`);
    return res.json();
}

async function dbUpdate(path, dados) {
    const token = await getToken();
    const res = await fetch(`${DB_URL}/${path}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em PATCH /${path}`);
    return res.json();
}

async function dbDelete(path) {
    const token = await getToken();
    const res = await fetch(`${DB_URL}/${path}.json?auth=${token}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em DELETE /${path}`);
}

function abrirTurma(evento, idSala) {
    document.querySelectorAll('.tabela-turma-turmas').forEach(t => t.classList.remove('ativa-turmas'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(idSala).classList.add('ativa-turmas');
    evento.currentTarget.classList.add('active');
    carregarAlunos();
}

async function carregarAlunos() {
    const aba = document.querySelector('.tab.active');
    if (!aba) return;

    let sala = aba.innerText.trim();
    if (sala === "Sala 1") sala = "Sala 01";
    if (sala === "Sala 2") sala = "Sala 02";
    if (sala === "Sala 3") sala = "Sala 03";
    if (sala === "Sala 4") sala = "Sala 04";

    const professorSelecionado = document.getElementById('filtroProfessor')?.value || 'todos';
    const disciplinaSelecionada = document.getElementById('filtroDisciplina')?.value || 'todos';
    const horarioSelecionado    = document.getElementById('filtroHorario')?.value    || 'todos';

    const tbody = document.querySelector('.tabela-turma-turmas.ativa-turmas tbody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr><td colspan="2" style="text-align:center; color:#94a3b8; padding:20px;">
            Carregando alunos...
        </td></tr>`;

    try {

        const todos = await dbGet('alunos');

        tbody.innerHTML = '';
        cacheAlunos = {};

        if (!todos) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#94a3b8;">Nenhum aluno cadastrado.</td></tr>`;
            return;
        }

        let contados = 0;

        Object.entries(todos).forEach(([id, aluno]) => {

            if ((aluno.turma || '') !== sala) return;

            if (professorSelecionado !== 'todos') {
                if ((aluno.professor || '').toLowerCase() !== professorSelecionado.toLowerCase()) return;
            }

            if (disciplinaSelecionada !== 'todos') {
                if ((aluno.disciplina || '').toLowerCase() !== disciplinaSelecionada.toLowerCase()) return;
            }

            if (horarioSelecionado !== 'todos') {
                const h = aluno.horario || '';
                if (horarioSelecionado === "1" && !h.includes("18:30")) return;
                if (horarioSelecionado === "2" && !h.includes("20:00")) return;
            }

            cacheAlunos[id] = aluno;
            criarLinhaAluno(id, aluno, tbody);
            contados++;
        });

        if (contados === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#94a3b8;">
                Nenhum aluno atende aos filtros selecionados nesta sala.</td></tr>`;
        }

        const inputBusca = document.getElementById('inputBusca');
        if (inputBusca && inputBusca.value) filtrarTabela();

    } catch (erro) {
        console.error("Erro ao carregar alunos: ", erro);
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#ef4444;">
            Erro ao carregar dados. Verifique sua conexão.</td></tr>`;
    }
}

function criarLinhaAluno(id, aluno, tbody) {
    const faltas = aluno.faltas_porSemestre || 0;
    const classeCor = faltas >= 10 ? 'num-vermelho-turmas' : 'num-verde-turmas';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>
            <div class="nome-col-turmas nome-clicavel-turmas" data-id="${id}" style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                <img class="user-avatar-turmas"
                     src="https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome_completo || '?')}&background=16a34a&color=fff"
                     style="width:36px;height:36px;border-radius:50%;">
                <div><strong>${aluno.nome_completo || '---'}</strong></div>
            </div>
        </td>
        <td>
            <div class="frequencia-col-turmas">
                <span class="faltas-texto-turmas">
                    Faltou <span class="num-faltas-turmas ${classeCor}">${faltas}</span> dias
                </span>
                <div class="botoes-falta-turmas">
                    <button class="btn-mais"        data-id="${id}" data-tipo="F">+</button>
                    <button class="btn-justificada" data-id="${id}" data-tipo="J">J</button>
                    <button class="btn-menos"       data-id="${id}" data-tipo="R">-</button>
                </div>
            </div>
        </td>
    `;

    tr.querySelector('.nome-clicavel-turmas').addEventListener('click', () => abrirModal(id));
    tr.querySelectorAll('.botoes-falta-turmas button').forEach(btn => {
        btn.addEventListener('click', e => {
            atualizarFalta(e.target.dataset.id, e.target.dataset.tipo);
        });
    });

    tbody.appendChild(tr);
}

async function atualizarFalta(id, tipo) {
    const hoje = new Date().toISOString().split('T')[0];

    try {
        if (!cacheAlunos[id].registro_faltas) cacheAlunos[id].registro_faltas = {};
        const jaExiste = cacheAlunos[id].registro_faltas[hoje];
        let novoValor  = Number(cacheAlunos[id].faltas_porSemestre || 0);

        if (tipo === 'R') {
            if (jaExiste === 'F') novoValor--;
            await dbDelete(`alunos/${id}/registro_faltas/${hoje}`);
            delete cacheAlunos[id].registro_faltas[hoje];
        } else if (tipo === 'F') {
            if (jaExiste !== 'F') novoValor++;
            await dbSet(`alunos/${id}/registro_faltas/${hoje}`, 'F');
            cacheAlunos[id].registro_faltas[hoje] = 'F';
        } else if (tipo === 'J') {
            if (jaExiste === 'F') novoValor--;
            await dbSet(`alunos/${id}/registro_faltas/${hoje}`, 'J');
            cacheAlunos[id].registro_faltas[hoje] = 'J';
        }

        if (novoValor < 0) novoValor = 0;
        await dbSet(`alunos/${id}/faltas_porSemestre`, novoValor);
        cacheAlunos[id].faltas_porSemestre = novoValor;

        carregarAlunos();

        if (alunoAtualId === id) {
            document.getElementById('m-faltas-total').innerText = novoValor;
            renderizarCalendario(cacheAlunos[id].registro_faltas);
        }
    } catch (erro) {
        console.error("Erro ao atualizar falta:", erro);
        Swal.fire({ icon: 'error', title: 'Erro ao atualizar falta', background: '#0f172a', color: '#fff' });
    }
}

function abrirModal(id) {
    alunoAtualId = id;
    const aluno = cacheAlunos[id];
    if (!aluno) return;

    document.getElementById('m-nome-display').innerText = aluno.nome_completo || '';
    document.getElementById('m-faltas-total').innerText = aluno.faltas_porSemestre || 0;

    const set = (idCampo, val) => {
        const el = document.getElementById(idCampo);
        if (el) el.value = val || '';
    };

    set('edit-id',               id);
    set('edit-nome',             aluno.nome_completo);
    set('edit-nascimento',       aluno.data_nascimento || aluno.nascimento);
    set('edit-cpf',              aluno.cpf_aluno);
    set('edit-tel',              aluno.telefone);
    set('edit-email',            aluno.email);
    set('edit-resp-nome',        aluno.nome_responsavel);
    set('edit-resp-tel',         aluno.telefone_responsavel);
    set('edit-resp-cpf',         aluno.cpf_responsavel);
    set('edit-resp-parentesco',  aluno.parentesco_responsavel || aluno.parentesco);
    set('edit-turno',            aluno.horario);
    set('edit-situacao',         aluno.situacao);

    const end = aluno.endereco || {};
    set('edit-endereco',         end.rua || end.address);
    set('edit-cep',              end.cep);
    set('edit-bairro',           end.bairro);
    set('edit-cidade',           end.cidade || end.city);
    set('edit-uf',               end.uf);
    set('edit-numero',           end.numero);
    set('edit-complemento',      end.complemento);

    const esc = aluno.escola_regular || {};
    set('edit-escola-nome',      esc.nome);
    set('edit-escola-ano',       esc.ano);
    set('edit-escola-turma',     esc.turma);

    const selTurma = document.getElementById('edit-turma');
    if (selTurma) selTurma.value = aluno.turma || 'Sala 01';

    document.getElementById('modalAluno').style.display = 'flex';
    bloquearEdicao();
    mudarMes(new Date().getMonth());
}

function fecharModal() {
    document.getElementById('modalAluno').style.display = 'none';
}

function mudarMes(mes) {
    mesSelecionado = mes;
    document.querySelectorAll('#seletor-meses button').forEach((btn, i) => {
        btn.classList.toggle('active', i === mes);
    });
    if (cacheAlunos[alunoAtualId]) {
        renderizarCalendario(cacheAlunos[alunoAtualId].registro_faltas);
    }
}

function renderizarCalendario(faltas) {
    const cal = document.getElementById('calendario-faltas');
    if (!cal) return;
    cal.innerHTML = '';
    const ano = 2026;
    const primeiroDia = new Date(ano, mesSelecionado, 1).getDay();
    const ultimoDia   = new Date(ano, mesSelecionado + 1, 0).getDate();

    for (let i = 0; i < primeiroDia; i++) cal.innerHTML += '<div></div>';

    for (let dia = 1; dia <= ultimoDia; dia++) {
        const data = `${ano}-${String(mesSelecionado + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        const div  = document.createElement('div');
        div.className = 'dia-calendario-turmas';
        div.innerText = dia;
        if (faltas && faltas[data]) {
            div.classList.add(faltas[data] === 'F' ? 'dia-com-falta-turmas' : 'dia-justificado-turmas');
        }
        cal.appendChild(div);
    }
}

function habilitarEdicao() {
    document.querySelectorAll('#form-detalhes input').forEach(inp => {
        if (inp.id !== 'edit-id') { inp.readOnly = false; inp.style.background = '#0f172a'; }
    });
    const sel = document.getElementById('edit-turma');
    if (sel) sel.disabled = false;

    document.querySelector('.modal-content-turmas')?.classList.add('modo-edicao');
    document.getElementById('btn-editar').style.display = 'none';
    document.getElementById('btn-salvar').style.display = 'inline-flex';

    Swal.fire({ icon:'info', title:'Modo edição ativado', text:'Edite os dados e clique em Salvar.',
        timer:1800, showConfirmButton:false, background:'#0f172a', color:'#fff' });
}

function bloquearEdicao() {
    document.querySelectorAll('#form-detalhes input').forEach(inp => {
        inp.readOnly = true; inp.style.background = '#020817';
    });
    const sel = document.getElementById('edit-turma');
    if (sel) sel.disabled = true;

    document.querySelector('.modal-content-turmas')?.classList.remove('modo-edicao');
    document.getElementById('btn-editar').style.display = 'inline-flex';
    document.getElementById('btn-salvar').style.display = 'none';
}

async function salvarEdicao() {
    const id = document.getElementById('edit-id').value;
    const dados = {
        nome_completo:          document.getElementById('edit-nome').value,
        data_nascimento:        document.getElementById('edit-nascimento').value,
        cpf_aluno:              document.getElementById('edit-cpf').value,
        telefone:               document.getElementById('edit-tel').value,
        email:                  document.getElementById('edit-email').value,
        nome_responsavel:       document.getElementById('edit-resp-nome').value,
        telefone_responsavel:   document.getElementById('edit-resp-tel').value,
        cpf_responsavel:        document.getElementById('edit-resp-cpf').value,
        parentesco_responsavel: document.getElementById('edit-resp-parentesco').value,
        turma:                  document.getElementById('edit-turma').value,
        situacao:               document.getElementById('edit-situacao').value,
        endereco: {
            rua:         document.getElementById('edit-endereco').value,
            cep:         document.getElementById('edit-cep').value,
            bairro:      document.getElementById('edit-bairro').value,
            cidade:      document.getElementById('edit-cidade').value,
            uf:          document.getElementById('edit-uf').value,
            numero:      document.getElementById('edit-numero').value,
            complemento: document.getElementById('edit-complemento').value
        },
        escola_regular: {
            nome:  document.getElementById('edit-escola-nome').value,
            ano:   document.getElementById('edit-escola-ano').value,
            turma: document.getElementById('edit-escola-turma').value
        }
    };

    try {
        await dbUpdate(`alunos/${id}`, dados);
        Object.assign(cacheAlunos[id], dados);
        bloquearEdicao();
        carregarAlunos();
        Swal.fire({ icon:'success', title:'Dados salvos!', timer:1800, showConfirmButton:false,
            background:'#0f172a', color:'#fff' });
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        Swal.fire({ icon:'error', title:'Erro ao salvar', background:'#0f172a', color:'#fff' });
    }
}

function filtrarTabela() {
    const valor = (document.getElementById('inputBusca')?.value || '').toLowerCase();
    document.querySelectorAll('.tabela-turma-turmas.ativa-turmas tbody tr').forEach(tr => {
        if (tr.cells.length > 1) {
            tr.style.display = tr.innerText.toLowerCase().includes(valor) ? '' : 'none';
        }
    });
}

function exportarPDF() {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        alert("Biblioteca jsPDF não carregada.");
        return;
    }

    const { jsPDF } = window.jspdf || { jsPDF: window.jsPDF };
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const abaAtiva   = document.querySelector('.tab.active');
    const nomeSala   = abaAtiva ? abaAtiva.innerText.trim() : 'Turma';
    const dataEmissao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    const horaEmissao = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const mL = 15, mR = 15;
    const contentW = pageWidth - mL - mR;

    doc.setFillColor(2, 8, 23);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFillColor(20, 184, 166);
    doc.rect(0, 38, pageWidth, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Centro Cearense de Idiomas — CCI', mL, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('SICCI — Sistema Integrado de Controle e Coordenação Institucional', mL, 23);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Relatório de Frequência  ·  ${nomeSala}  ·  Emitido em ${dataEmissao} às ${horaEmissao}`, mL, 31);

    let cursorY = 48;
    const profFiltro = document.getElementById('filtroProfessor')?.selectedOptions[0]?.text || 'Todos';
    const discFiltro = document.getElementById('filtroDisciplina')?.selectedOptions[0]?.text || 'Todas';
    const horFiltro  = document.getElementById('filtroHorario')?.selectedOptions[0]?.text || 'Todos';

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(mL, cursorY - 5, contentW, 18, 3, 3, 'F');
    doc.setDrawColor(30, 41, 59);
    doc.roundedRect(mL, cursorY - 5, contentW, 18, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Professor: ${profFiltro}`, mL + 5, cursorY + 2);
    doc.text(`Disciplina: ${discFiltro}`, mL + 65, cursorY + 2);
    doc.text(`Horário: ${horFiltro}`, mL + 130, cursorY + 2);

    cursorY += 22;

    const alunos = Object.values(cacheAlunos);

    if (alunos.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text('Nenhum aluno encontrado para os filtros selecionados.', mL, cursorY + 10);
    } else {
        const colNome   = mL;
        const colTurma  = mL + 82;
        const colFaltas = mL + 130;
        const colStatus = mL + 155;
        const rowH = 9;

        const desenharCabecalhoTabela = (y) => {
            doc.setFillColor(15, 23, 42);
            doc.rect(mL, y, contentW, rowH, 'F');
            doc.setDrawColor(30, 41, 59);
            doc.rect(mL, y, contentW, rowH, 'S');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(148, 163, 184);
            doc.text('NOME DO ALUNO', colNome   + 3, y + 6);
            doc.text('TURMA',         colTurma  + 3, y + 6);
            doc.text('FALTAS',        colFaltas + 3, y + 6);
            doc.text('SITUAÇÃO',      colStatus + 3, y + 6);
        };

        desenharCabecalhoTabela(cursorY);
        cursorY += rowH;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        alunos.forEach((aluno, idx) => {
            if (cursorY + rowH > pageHeight - 25) {
                doc.addPage();
                cursorY = 20;
                desenharCabecalhoTabela(cursorY);
                cursorY += rowH;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
            }

            const bgColor = idx % 2 === 0 ? [255,255,255] : [248,250,252];
            doc.setFillColor(...bgColor);
            doc.setDrawColor(226, 232, 240);
            doc.rect(mL, cursorY, contentW, rowH, 'FD');

            const faltas = aluno.faltas_porSemestre || 0;
            const status = faltas >= 10 ? 'Irregular' : 'Regular';

            doc.setTextColor(30, 41, 59);
            doc.text((aluno.nome_completo || '—').substring(0, 38), colNome   + 3, cursorY + 6);
            doc.text(aluno.turma || '—',                             colTurma  + 3, cursorY + 6);
            doc.text(String(faltas),                                  colFaltas + 8, cursorY + 6);

            doc.setTextColor(status === 'Regular' ? 21 : 185, status === 'Regular' ? 128 : 28, status === 'Regular' ? 61 : 28);
            doc.setFont('helvetica', 'bold');
            doc.text(status, colStatus + 3, cursorY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            cursorY += rowH;
        });

        cursorY += 4;
        const totalRegulares = alunos.filter(a => (a.faltas_porSemestre || 0) < 10).length;
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.rect(mL, cursorY, contentW, 10, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(
            `Total: ${alunos.length}     Regulares: ${totalRegulares}     Irregulares: ${alunos.length - totalRegulares}`,
            mL + 4, cursorY + 7
        );
    }

    const totalPgs = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPgs; p++) {
        doc.setPage(p);
        doc.setFillColor(241, 245, 249);
        doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Centro Cearense de Idiomas — Documento gerado automaticamente pelo SICCI', mL, pageHeight - 5);
        doc.text(`Página ${p} de ${totalPgs}`, pageWidth - mR - 18, pageHeight - 5);
    }

    doc.save(`Frequencia_${nomeSala.replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`);
}

function fazerLogout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

window.abrirTurma      = abrirTurma;
window.atualizarFalta  = atualizarFalta;
window.abrirModal      = abrirModal;
window.fecharModal     = fecharModal;
window.mudarMes        = mudarMes;
window.habilitarEdicao = habilitarEdicao;
window.salvarEdicao    = salvarEdicao;
window.filtrarTabela   = filtrarTabela;
window.exportarPDF     = exportarPDF;
window.fazerLogout     = fazerLogout;
window.carregarAlunos  = carregarAlunos;

window.addEventListener('DOMContentLoaded', async () => {

    const ok = await authReady;
    if (!ok) return;

    carregarAlunos();

    const inputBusca = document.getElementById('inputBusca');
    if (inputBusca) inputBusca.addEventListener('input', filtrarTabela);

    const seletorMeses = document.getElementById('seletor-meses');
    if (seletorMeses) {
        seletorMeses.querySelectorAll('button').forEach((btn, i) => {
            btn.addEventListener('click', () => mudarMes(i));
        });
    }

    document.getElementById('btn-editar')?.addEventListener('click', habilitarEdicao);
    document.getElementById('btn-salvar')?.addEventListener('click', salvarEdicao);

    window.addEventListener('click', e => {
        if (e.target.id === 'modalAluno') fecharModal();
    });
});