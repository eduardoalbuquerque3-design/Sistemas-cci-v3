import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, remove, update, orderByChild, equalTo, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// Inicialização segura do Firebase no padrão Modular
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

// Variáveis de Estado (Cache)
let cacheAlunos = {};
let alunoAtualId = null;
let mesSelecionado = new Date().getMonth();

/* =========================================
   ABRIR TURMAS (Alternador de Abas)
========================================= */
function abrirTurma(evento, idSala) {
    document.querySelectorAll('.tabela-turma-turmas').forEach(tabela => {
        tabela.classList.remove('ativa-turmas');
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document.getElementById(idSala).classList.add('ativa-turmas');
    evento.currentTarget.classList.add('active');

    carregarAlunos();
}

/* =========================================
   CARREGAR ALUNOS (Leitura do Realtime Database)
========================================= */
async function carregarAlunos() {
    const aba = document.querySelector('.tab.active');
    if (!aba) return;

    let sala = aba.innerText.trim();

    // Normalização das nomenclaturas das salas
    if (sala === "Sala 1") sala = "Sala 01";
    if (sala === "Sala 2") sala = "Sala 02";
    if (sala === "Sala 3") sala = "Sala 03";
    if (sala === "Sala 4") sala = "Sala 04";

    console.log("Buscando alunos da:", sala);

    const tbody = document.querySelector('.tabela-turma-turmas.ativa-turmas tbody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="2" style="text-align:center; color: #94a3b8;">
                Carregando alunos...
            </td>
        </tr>
    `;

    try {
        const alunosRef = ref(database, 'alunos');
        // Construção da consulta filtrada usando as funções modulares query(), orderByChild() e equalTo()
        const consultaAlunos = query(alunosRef, orderByChild('turma'), equalTo(sala));
        const snapshot = await get(consultaAlunos);

        tbody.innerHTML = "";
        cacheAlunos = {};

        if (!snapshot.exists()) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align:center; color: #94a3b8;">
                        Nenhum aluno encontrado nesta turma.
                    </td>
                </tr>
            `;
            return;
        }

        snapshot.forEach(child => {
            const aluno = child.val();
            const id = child.key;

            cacheAlunos[id] = aluno;
            criarLinhaAluno(id, aluno, tbody);
        });

        // Caso exista um termo digitado previamente no campo de busca, reaplica o filtro
        const inputBusca = document.getElementById('inputBusca');
        if (inputBusca && inputBusca.value) {
            filtrarTabela();
        }

    } catch (erro) {
        console.error("Erro ao carregar alunos: ", erro);
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#ef4444;">Erro ao processar listagem.</td></tr>`;
    }
}

/* =========================================
   LINHA DO ALUNO (Renderização HTML)
========================================= */
function criarLinhaAluno(id, aluno, tbody) {
    const faltas = aluno.faltas_porSemestre || 0;
    const classeCor = faltas >= 10 ? 'num-vermelho-turmas' : 'num-verde-turmas';

    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td>
            <div class="nome-col-turmas nome-clicavel-turmas" data-id="${id}">
                <img class="user-avatar-turmas" 
                     src="https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome_completo)}&background=16a34a&color=fff">
                <div>
                    <strong>${aluno.nome_completo}</strong>
                </div>
            </div>
        </td>
        <td>
            <div class="frequencia-col-turmas">
                <span class="faltas-texto-turmas">
                    Faltou <span class="num-faltas-turmas ${classeCor}">${faltas}</span> dias
                </span>
                <div class="botoes-falta-turmas">
                    <button class="btn-mais" data-id="${id}" data-tipo="F">+</button>
                    <button class="btn-justificada" data-id="${id}" data-tipo="J">J</button>
                    <button class="btn-menos" data-id="${id}" data-tipo="R">-</button>
                </div>
            </div>
        </td>
    `;

    // Delegação de eventos segura atrelada aos elementos gerados
    tr.querySelector('.nome-clicavel-turmas').addEventListener('click', () => abrirModal(id));
    tr.querySelectorAll('.botoes-falta-turmas button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idAluno = e.target.getAttribute('data-id');
            const tipoFalta = e.target.getAttribute('data-tipo');
            atualizarFalta(idAluno, tipoFalta);
        });
    });

    tbody.appendChild(tr);
}

/* =========================================
   ATUALIZAR FALTA (Incremento/Controle Multi-path)
========================================= */
async function atualizarFalta(id, tipo) {
    const hoje = new Date().toISOString().split('T')[0];
    
    const refRegistro = ref(database, `alunos/${id}/registro_faltas/${hoje}`);
    const refContador = ref(database, `alunos/${id}/faltas_porSemestre`);

    try {
        let novoValor = Number(cacheAlunos[id].faltas_porSemestre || 0);

        if (!cacheAlunos[id].registro_faltas) {
            cacheAlunos[id].registro_faltas = {};
        }

        const jaExiste = cacheAlunos[id].registro_faltas[hoje];

        // REMOVER FALTA (-)
        if (tipo === 'R') {
            if (jaExiste === 'F') {
                novoValor--;
            }
            await remove(refRegistro);
            delete cacheAlunos[id].registro_faltas[hoje];
        }
        // ADICIONAR FALTA (+)
        else if (tipo === 'F') {
            if (jaExiste !== 'F') {
                novoValor++;
            }
            await set(refRegistro, 'F');
            cacheAlunos[id].registro_faltas[hoje] = 'F';
        }
        // JUSTIFICADA (J)
        else if (tipo === 'J') {
            if (jaExiste === 'F') {
                novoValor--;
            }
            await set(refRegistro, 'J');
            cacheAlunos[id].registro_faltas[hoje] = 'J';
        }

        if (novoValor < 0) novoValor = 0;

        // Persiste as alterações no banco usando os métodos modulares set()
        await set(refContador, novoValor);
        cacheAlunos[id].faltas_porSemestre = novoValor;

        // Atualiza a visualização em tempo real
        carregarAlunos();

        if (alunoAtualId === id) {
            document.getElementById('m-faltas-total').innerText = novoValor;
            renderizarCalendario(cacheAlunos[id].registro_faltas);
        }

    } catch (erro) {
        console.error("Erro ao atualizar status de faltas: ", erro);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao atualizar falta',
            background: '#0f172a',
            color: '#fff'
        });
    }
}

/* =========================================
   MODAL (Abertura e Preenchimento dos Inputs)
========================================= */
function abrirModal(id) {
    alunoAtualId = id;
    const aluno = cacheAlunos[id];
    if (!aluno) return;

    document.getElementById('m-nome-display').innerText = aluno.nome_completo || '';
    document.getElementById('m-faltas-total').innerText = aluno.faltas_porSemestre || 0;

    const setValor = (idCampo, valor) => {
        const campo = document.getElementById(idCampo);
        if (campo) campo.value = valor || '';
    };

    setValor('edit-email', aluno.email);

    const endereco = aluno.endereco || {};
    setValor('edit-endereco', endereco.rua || endereco.address);
    setValor('edit-cep', endereco.cep);
    setValor('edit-bairro', endereco.bairro);
    setValor('edit-cidade', endereco.cidade || endereco.city);
    setValor('edit-uf', endereco.uf);
    setValor('edit-numero', endereco.numero);
    setValor('edit-complemento', endereco.complemento);

    setValor('edit-nome', aluno.nome_completo);
    setValor('edit-turma', aluno.turma);
    setValor('edit-id', id);
    setValor('edit-cpf', aluno.cpf_aluno);
    setValor('edit-nascimento', aluno.data_nascimento || aluno.nascimento);
    setValor('edit-resp-parentesco', aluno.parentesco_responsavel || aluno.parentesco);
    setValor('edit-tel', aluno.telefone);
    setValor('edit-resp-nome', aluno.nome_responsavel);
    setValor('edit-resp-tel', aluno.telefone_responsavel);
    setValor('edit-turno', aluno.horario);
    setValor('edit-modulo', aluno.modulo);
    setValor('edit-disciplina', aluno.disciplina);
    setValor('edit-situacao', aluno.situacao);
    setValor('edit-resp-cpf', aluno.cpf_responsavel);

    const school = aluno.escola_regular || {};
    setValor('edit-escola-nome', school.nome);
    setValor('edit-escola-ano', school.ano);
    setValor('edit-escola-turma', school.turma);

    document.getElementById('modalAluno').style.display = "flex";

    bloquearEdicao();
    mudarMes(new Date().getMonth());
}

function fecharModal() {
    document.getElementById('modalAluno').style.display = "none";
}

/* =========================================
   CALENDÁRIO (Renderização Dinâmica)
========================================= */
function mudarMes(mes) {
    mesSelecionado = mes;

    document.querySelectorAll('#seletor-meses button').forEach((btn, index) => {
        btn.classList.toggle('active', index === mes);
    });

    const aluno = cacheAlunos[alunoAtualId];
    if (aluno) {
        renderizarCalendario(aluno.registro_faltas);
    }
}

function renderizarCalendario(faltas) {
    const calendario = document.getElementById('calendario-faltas');
    if (!calendario) return;

    calendario.innerHTML = "";
    const ano = 2026;

    const primeiroDia = new Date(ano, mesSelecionado, 1).getDay();
    const ultimoDia = new Date(ano, mesSelecionado + 1, 0).getDate();

    // Preenche os espaçamentos vazios do início do mês
    for (let i = 0; i < primeiroDia; i++) {
        calendario.innerHTML += `<div></div>`;
    }

    // Renderiza cada um dos dias
    for (let dia = 1; dia <= ultimoDia; dia++) {
        const data = `${ano}-${String(mesSelecionado + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const div = document.createElement('div');

        div.classList.add('dia-calendario-turmas');
        div.innerText = dia;

        if (faltas && faltas[data]) {
            if (faltas[data] === 'F') {
                div.classList.add('dia-com-falta-turmas');
            } else if (faltas[data] === 'J') {
                div.classList.add('dia-justificado-turmas');
            }
        }
        calendario.appendChild(div);
    }
}

/* =========================================
   CONTROLE DE EDIÇÃO DO FORMULÁRIO
========================================= */
function habilitarEdicao() {
    document.querySelectorAll('#form-detalhes input').forEach(input => {
        if (input.id !== 'edit-id') {
            input.readOnly = false;
            input.style.background = '#0f172a';
        }
    });

    const modal = document.querySelector('.modal-content-turmas');
    if (modal) modal.classList.add('modo-edicao');

    document.getElementById('btn-editar').style.display = "none";
    document.getElementById('btn-salvar').style.display = "inline-flex";

    Swal.fire({
        icon: 'info',
        title: 'Modo edição ativado',
        text: 'Agora você pode editar os dados do aluno.',
        timer: 1800,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
    });
}

function bloquearEdicao() {
    document.querySelectorAll('#form-detalhes input').forEach(input => {
        input.readOnly = true;
        input.style.background = '#020817';
    });

    const modal = document.querySelector('.modal-content-turmas');
    if (modal) modal.classList.remove('modo-edicao');

    document.getElementById('btn-editar').style.display = "inline-flex";
    document.getElementById('btn-salvar').style.display = "none";
}

/* =========================================
   SALVAR ALTERAÇÕES (Gravação Segura via update())
========================================= */
async function salvarEdicao() {
    const id = document.getElementById('edit-id').value;

    const dados = {
        email: document.getElementById('edit-email').value,
        nome_completo: document.getElementById('edit-nome').value,
        data_nascimento: document.getElementById('edit-nascimento').value,
        cpf_aluno: document.getElementById('edit-cpf').value,
        telefone: document.getElementById('edit-tel').value,
        nome_responsavel: document.getElementById('edit-resp-nome').value,
        cpf_responsavel: document.getElementById('edit-resp-cpf').value,
        telefone_responsavel: document.getElementById('edit-resp-tel').value,
        parentesco_responsavel: document.getElementById('edit-resp-parentesco').value,
        endereco: {
            cep: document.getElementById('edit-cep').value,
            rua: document.getElementById('edit-endereco').value,
            numero: document.getElementById('edit-numero').value,
            bairro: document.getElementById('edit-bairro').value,
            cidade: document.getElementById('edit-cidade').value,
            uf: document.getElementById('edit-uf').value,
            complemento: document.getElementById('edit-complemento').value
        },
        escola_regular: {
            nome: document.getElementById('edit-escola-nome').value,
            ano: document.getElementById('edit-escola-ano').value,
            turma: document.getElementById('edit-escola-turma').value
        }
    };

    try {
        const alunoSpecificRef = ref(database, `alunos/${id}`);
        await update(alunoSpecificRef, dados);

        bloquearEdicao();
        carregarAlunos();

        Swal.fire({
            icon: 'success',
            title: 'Informações atualizadas!',
            text: 'Os dados do aluno foram salvos com sucesso.',
            timer: 1800,
            showConfirmButton: false,
            background: '#0f172a',
            color: '#fff'
        });

    } catch (erro) {
        console.error("Erro ao persistir dados de edição do aluno: ", erro);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar',
            background: '#0f172a',
            color: '#fff'
        });
    }
}

/* =========================================
   FILTRO DE PESQUISA (Busca na Tabela)
========================================= */
function filtrarTabela() {
    const valor = document.getElementById('inputBusca').value.toLowerCase();

    document.querySelectorAll('.tabela-turma-turmas.ativa-turmas tbody tr').forEach(tr => {
        if (tr.cells.length > 1) { // Garante que não aplicará o filtro na mensagem de "Nenhum aluno"
            tr.style.display = tr.innerText.toLowerCase().includes(valor) ? '' : 'none';
        }
    });
}

/* =========================================
   PRINT / EXPORTAR PDF
========================================= */
function exportarPDF() {
    const modal = document.getElementById('modalAluno');
    if (modal) modal.style.display = 'none';

    document.body.classList.add('modo-print');

    setTimeout(() => {
        window.print();
        document.body.classList.remove('modo-print');
        if (modal) modal.style.display = 'flex'; // Reabre o modal após o cancelamento/impressão
    }, 300);
}

/* =========================================
   LOGOUT E DELEGAÇÃO DE ESCOPO GLOBAL
========================================= */
function fazerLogout() {
    localStorage.clear();
    window.location.href = "index.html"; // Redireciona para sua tela raiz (antigo login.html)
}

// Vincula as funções necessárias ao objeto window para manter compatibilidade com chamadas inline dos botões no HTML
window.abrirTurma = abrirTurma;
window.atualizarFalta = atualizarFalta;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.mudarMes = mudarMes;
window.habilitarEdicao = habilitarEdicao;
window.salvarEdicao = salvarEdicao;
window.filtrarTabela = filtrarTabela;
window.exportarPDF = exportarPDF;
window.fazerLogout = fazerLogout;

// Inicialização de Escuta ao carregar
window.addEventListener('DOMContentLoaded', () => {
    carregarAlunos();

    const inputBusca = document.getElementById('inputBusca');
    if (inputBusca) {
        inputBusca.addEventListener('input', filtrarTabela);
    }

    const seletorMeses = document.getElementById('seletor-meses');
    if (seletorMeses) {
        seletorMeses.querySelectorAll('button').forEach((btn, index) => {
            btn.addEventListener('click', () => mudarMes(index));
        });
    }

    const btnEditar = document.getElementById('btn-editar');
    if (btnEditar) btnEditar.addEventListener('click', habilitarEdicao);

    const btnSalvar = document.getElementById('btn-salvar');
    if (btnSalvar) btnSalvar.addEventListener('click', salvarEdicao);

    // Fechamento externo do modal
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modalAluno') {
            fecharModal();
        }
    });
});