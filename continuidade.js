(function () {

    const DB_URL = "https://sistema-cci-default-rtdb.firebaseio.com";

    function calcularMediaFinal(aluno) {
        let soma = 0;
        for (let i = 1; i <= 4; i++) {
            const p = (aluno.notas && aluno.notas['p' + i]) || { n1: 0, n2: 0 };
            const n1 = parseFloat(p.n1) || 0;
            const n2 = parseFloat(p.n2) || 0;
            soma += (n1 + n2) / 2;
        }
        return soma / 4;
    }

    async function executarViradaDeSemestre() {

        const token = localStorage.getItem('firebaseToken');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Sessão expirada',
                text: 'Faça login novamente para continuar.',
                background: '#0f172a',
                color: '#fff'
            });
            return;
        }

        Swal.fire({
            title: 'Carregando dados...',
            html: '<div style="margin:10px auto;width:40px;height:40px;border:4px solid #334155;border-top-color:#38bdf8;border-radius:50%;animation:spin 0.8s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>',
            showConfirmButton: false,
            allowOutsideClick: false,
            background: '#0f172a',
            color: '#fff'
        });

        let alunos;
        try {
            const res = await fetch(`${DB_URL}/alunos.json?auth=${token}`);
            if (res.status === 401 || res.status === 403) {
                throw new Error('Sessão expirada ou sem permissão. Faça login novamente.');
            }
            alunos = await res.json();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: 'Não foi possível carregar os alunos: ' + err.message,
                background: '#0f172a',
                color: '#fff'
            });
            return;
        }

        if (!alunos) {
            Swal.fire({
                icon: 'warning',
                title: 'Aviso',
                text: 'Nenhum aluno encontrado no banco de dados.',
                background: '#0f172a',
                color: '#fff'
            });
            return;
        }

        const aprovadosMod4  = [];
        const paraProgressao = [];
        const reprovados     = [];

        Object.entries(alunos).forEach(function ([id, aluno]) {
            const modulo = parseInt(aluno.modulo) || 1;
            const media  = calcularMediaFinal(aluno);

            if (media >= 6) {
                if (modulo >= 4) {
                    aprovadosMod4.push({ id, aluno, media });
                } else {
                    paraProgressao.push({ id, aluno, media, moduloAtual: modulo });
                }
            } else {
                reprovados.push({ id, aluno, media });
            }
        });

        Swal.close();

        const totalAlunos    = Object.keys(alunos).length;
        const totalFormatura = aprovadosMod4.length;
        const totalSobe      = paraProgressao.length;
        const totalFica      = reprovados.length;

        let listaFormandosHTML = '';
        if (aprovadosMod4.length > 0) {
            listaFormandosHTML = `
                <div style="margin:16px 0 0;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:14px;padding:14px 16px;text-align:left;max-height:200px;overflow-y:auto;">
                    <p style="color:#4ade80;font-weight:600;margin-bottom:8px;font-size:13px;">🎓 Alunos que serão REMOVIDOS (Módulo 4 aprovados):</p>
                    ${aprovadosMod4.map(a => `
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);color:#e2e8f0;font-size:13px;">
                            <span>${a.aluno.nome_completo || 'Sem nome'}</span>
                            <span style="color:#4ade80;font-weight:600;">Média: ${a.media.toFixed(1)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const { isConfirmed } = await Swal.fire({
            title: 'Encerrar Semestre Letivo?',
            html: `
                <div style="text-align:left;font-size:14px;color:#94a3b8;line-height:1.7;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;">
                        <div style="background:rgba(59,130,246,.1);border-radius:12px;padding:12px;text-align:center;">
                            <div style="font-size:24px;font-weight:700;color:#60a5fa;">${totalAlunos}</div>
                            <div style="font-size:12px;">Total de alunos</div>
                        </div>
                        <div style="background:rgba(34,197,94,.1);border-radius:12px;padding:12px;text-align:center;">
                            <div style="font-size:24px;font-weight:700;color:#4ade80;">${totalSobe}</div>
                            <div style="font-size:12px;">Sobem de módulo</div>
                        </div>
                        <div style="background:rgba(239,68,68,.1);border-radius:12px;padding:12px;text-align:center;">
                            <div style="font-size:24px;font-weight:700;color:#f87171;">${totalFica}</div>
                            <div style="font-size:12px;">Ficam no módulo</div>
                        </div>
                        <div style="background:rgba(250,204,21,.1);border-radius:12px;padding:12px;text-align:center;">
                            <div style="font-size:24px;font-weight:700;color:#fbbf24;">${totalFormatura}</div>
                            <div style="font-size:12px;">Formandos (excluídos)</div>
                        </div>
                    </div>
                    ${listaFormandosHTML}
                    <p style="margin-top:14px;color:#f87171;font-size:12px;">⚠️ Esta ação é <strong>irreversível</strong>. Os formandos serão excluídos do sistema e as notas serão zeradas.</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#22c55e',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Confirmar Encerramento',
            cancelButtonText: 'Cancelar',
            background: '#0f172a',
            color: '#fff',
            width: '560px'
        });

        if (!isConfirmed) return;

        Swal.fire({
            title: 'Aplicando mudanças...',
            html: '<div style="margin:10px auto;width:40px;height:40px;border:4px solid #334155;border-top-color:#22c55e;border-radius:50%;animation:spin 0.8s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style><br><small style="color:#94a3b8">Aguarde, processando todos os alunos...</small>',
            showConfirmButton: false,
            allowOutsideClick: false,
            background: '#0f172a',
            color: '#fff'
        });

        try {
            const updates = {};
            const chaveHistorico = new Date().toISOString().slice(0, 10);

            const notasZeradas = {
                p1: { n1: 0, n2: 0 },
                p2: { n1: 0, n2: 0 },
                p3: { n1: 0, n2: 0 },
                p4: { n1: 0, n2: 0 }
            };

            paraProgressao.forEach(function ({ id, aluno, media, moduloAtual }) {
                updates['historico_semestres/' + id + '/' + chaveHistorico] = {
                    modulo_concluido: moduloAtual,
                    media_final: parseFloat(media.toFixed(2)),
                    nome: aluno.nome_completo || '',
                    situacao: 'aprovado'
                };
                updates['alunos/' + id + '/modulo']             = moduloAtual + 1;
                updates['alunos/' + id + '/notas']              = notasZeradas;
                updates['alunos/' + id + '/faltas_porSemestre'] = 0;
            });

            reprovados.forEach(function ({ id, aluno, media }) {
                updates['historico_semestres/' + id + '/' + chaveHistorico] = {
                    modulo_concluido: parseInt(aluno.modulo) || 1,
                    media_final: parseFloat(media.toFixed(2)),
                    nome: aluno.nome_completo || '',
                    situacao: 'reprovado'
                };
                updates['alunos/' + id + '/notas']              = notasZeradas;
                updates['alunos/' + id + '/faltas_porSemestre'] = 0;
            });

            aprovadosMod4.forEach(function ({ id, aluno, media }) {
                updates['historico_semestres/' + id + '/' + chaveHistorico] = {
                    modulo_concluido: 4,
                    media_final: parseFloat(media.toFixed(2)),
                    nome: aluno.nome_completo || '',
                    situacao: 'formado'
                };
                updates['alunos/' + id] = null;
            });

            const resPatch = await fetch(`${DB_URL}/.json?auth=${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (!resPatch.ok) {
                const errBody = await resPatch.text();
                throw new Error('Falha ao salvar: ' + errBody);
            }

            let msgFormandos = '';
            if (aprovadosMod4.length > 0) {
                const nomes = aprovadosMod4.map(a => '• ' + (a.aluno.nome_completo || 'Aluno')).join('<br>');
                msgFormandos = `
                    <div style="margin-top:12px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:12px 16px;text-align:left;font-size:13px;color:#86efac;max-height:150px;overflow-y:auto;">
                        <strong>🎓 Formados e removidos do sistema:</strong><br>${nomes}
                    </div>
                `;
            }

            await Swal.fire({
                icon: 'success',
                title: 'Semestre encerrado!',
                html: `
                    <p style="color:#94a3b8;font-size:14px;">
                        <strong style="color:#4ade80">${totalSobe}</strong> aluno(s) subiram de módulo,
                        <strong style="color:#f87171">${totalFica}</strong> ficaram e
                        <strong style="color:#fbbf24">${totalFormatura}</strong> foram formados.
                    </p>
                    ${msgFormandos}
                `,
                background: '#0f172a',
                color: '#fff',
                confirmButtonColor: '#22c55e'
            });

            location.reload();

        } catch (err) {
            console.error('Erro na virada de semestre:', err);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao processar!',
                text: err.message,
                background: '#0f172a',
                color: '#fff'
            });
        }
    }

    window.executarViradaDeSemestre = executarViradaDeSemestre;

})();