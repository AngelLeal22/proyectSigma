const backToTopBtn = document.getElementById('back-to-top');

// --- GESTOR DE VISTAS (RUTAS) ---
const routes = {
    '#home': document.getElementById('panel-hub'),
    '#envases': document.getElementById('panel-envases'),
    '#publicidad': document.getElementById('panel-publicidad'),
    '#contacto': document.getElementById('panel-contacto')
};

function navigate() {
    const hash = window.location.hash || '#home';

    // Reiniciar vista
    Object.values(routes).forEach(panel => {
        if (panel) panel.classList.remove('view-active');
    });

    // Buscar el panel para el hash actual
    let activePanel = routes[hash] || routes['#home'];
    if (!routes[hash]) {
        const targetEl = document.querySelector(hash);
        if (targetEl) {
            activePanel = Object.values(routes).find(panel => panel && panel.contains(targetEl)) || activePanel;
        }
    }

    if (activePanel) {
        activePanel.classList.add('view-active');
    }

    // Desplazarse a la sección cuando el hash apunta a un elemento; de lo contrario subir arriba.
    const targetSection = window.location.hash ? document.querySelector(window.location.hash) : null;
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

// --- LÓGICA DEL BOTÓN VOLVER ARRIBA ---
window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// --- LÓGICA DEL ACORDEÓN FAQ ---
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const item = question.parentElement;
        const isActive = item.classList.contains('active');

        // Cerrar todos los demás elementos (opcional, pero más limpio)
        document.querySelectorAll('.faq-item').forEach(otherItem => {
            otherItem.classList.remove('active');
        });

        // Alternar elemento actual
        if (!isActive) {
            item.classList.add('active');
        }
    });
});