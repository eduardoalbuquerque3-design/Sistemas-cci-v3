// ================= TEMA SALVO =================

const tema =
    localStorage.getItem('tema') || 'dark';

aplicarTema(tema);


// ================= BOTÃO =================

const btn =
    document.getElementById('toggleTema');

if (btn) {

    btn.addEventListener('click', () => {

        const atual =
            document.body.classList.contains(
                'light'
            )
                ? 'light'
                : 'dark';

        const novo =
            atual === 'dark'
                ? 'light'
                : 'dark';

        aplicarTema(novo);

        localStorage.setItem(
            'tema',
            novo
        );
    });
}


// ================= FUNÇÃO =================

function aplicarTema(tipo) {

    if (tipo === 'light') {

        // BODY
        document.body.style.background =
            '#f5f5f5';

        document.body.style.color =
            '#111';

        // SIDEBAR
        document.querySelectorAll('.sidebar')
            .forEach(el => {

                el.style.background =
                    '#ffffff';
            });

        // CARDS
        document.querySelectorAll(
            '.card, .form-card, .box'
        )
            .forEach(el => {

                el.style.background =
                    '#ffffff';

                el.style.color =
                    '#111';
            });

        // INPUTS
        document.querySelectorAll(
            'input, textarea, select'
        )
            .forEach(el => {

                el.style.background =
                    '#f0f0f0';

                el.style.color =
                    '#111';

                el.style.border =
                    '1px solid #ccc';
            });

        // BOTÕES
        document.querySelectorAll(
            'button'
        )
            .forEach(el => {

                el.style.background =
                    '#3da4b8';

                el.style.color =
                    '#fff';
            });

    } else {

        // BODY
        document.body.style.background =
            '#07152f';

        document.body.style.color =
            '#fff';

        // SIDEBAR
        document.querySelectorAll('.sidebar')
            .forEach(el => {

                el.style.background =
                    '#0f2247';
            });

        // CARDS
        document.querySelectorAll(
            '.card, .form-card, .box'
        )
            .forEach(el => {

                el.style.background =
                    '#10264d';

                el.style.color =
                    '#fff';
            });

        // INPUTS
        document.querySelectorAll(
            'input, textarea, select'
        )
            .forEach(el => {

                el.style.background =
                    '#132c57';

                el.style.color =
                    '#fff';

                el.style.border =
                    '1px solid #24457d';
            });

        // BOTÕES
        document.querySelectorAll(
            'button'
        )
            .forEach(el => {

                el.style.background =
                    '#3da4b8';

                el.style.color =
                    '#fff';
            });
    }
}