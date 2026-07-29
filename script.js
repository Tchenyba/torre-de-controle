const SUPABASE_URL = 'https://gbtwytylusuefjdbwjda.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidHd5dHlsdXN1ZWZqZGJ3amRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTkwNTAsImV4cCI6MjA5NzEzNTA1MH0.nHsgHM_IHzo9w1_dfj4_97ZGir4o5ZHxclp64bpy7Jo';

let globalEvents = [];

const eventsBody = document.getElementById('events-body');
const refreshBtn = document.getElementById('refresh-btn');
const modal = document.getElementById('event-modal');
const closeModalBtn = document.getElementById('close-modal');

async function fetchEvents() {
    refreshBtn.innerHTML = 'Carregando...';
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/eventos_log?select=*&order=created_at.desc&limit=100`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Falha ao buscar eventos');
        
        const data = await response.json();
        globalEvents = data;
        renderTable(data);
    } catch (error) {
        console.error(error);
        alert('Erro ao carregar os eventos.');
    } finally {
        refreshBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Atualizar
        `;
    }
}

function renderTable(events) {
    eventsBody.innerHTML = '';
    
    events.forEach((ev) => {
        const tr = document.createElement('tr');
        
        const dateObj = new Date(ev.created_at);
        const dateStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR');
        
        let badgeClass = '';
        if (ev.event_name === 'PageView') badgeClass = 'pageview';
        else if (ev.event_name === 'InitiateCheckout') badgeClass = 'initiatecheckout';
        else if (ev.event_name === 'Purchase') badgeClass = 'purchase';
        
        let utmString = ev.utm_source ? ev.utm_source : '-';
        if (ev.utm_campaign) utmString += ` / ${ev.utm_campaign}`;
        
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><span class="badge ${badgeClass}">${ev.event_name}</span></td>
            <td style="font-family: monospace; color: var(--text-secondary);">${ev.id.substring(0, 15)}...</td>
            <td style="font-family: monospace; color: var(--success);">${ev.visitor_id.substring(0, 15)}...</td>
            <td>${utmString}</td>
            <td>
                <span class="status-badge ${ev.meta_status === 'Sucesso' ? 'success' : (ev.meta_status.includes('Não') ? 'pending' : 'error')}">
                    ${ev.meta_status}
                </span>
            </td>
            <td>
                <span class="status-badge ${ev.ga4_status === 'Sucesso' ? 'success' : (ev.ga4_status.includes('Não') ? 'pending' : 'error')}">
                    ${ev.ga4_status}
                </span>
            </td>
            <td>
                <button class="action-btn" onclick="openModal('${ev.id}')" title="Ver Detalhes">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </td>
        `;
        
        eventsBody.appendChild(tr);
    });
}

window.openModal = function(id) {
    const ev = globalEvents.find(e => e.id === id);
    if (!ev) return;
    
    document.getElementById('modal-event-title').innerText = `>_ Detalhes do Evento: ${ev.event_name}`;
    document.getElementById('modal-event-id').innerText = `Event ID: ${ev.id}`;
    
    const dateObj = new Date(ev.created_at);
    document.getElementById('modal-date').innerText = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR');
    
    document.getElementById('modal-visitor-id').innerText = ev.visitor_id;
    
    let utms = [];
    if(ev.utm_source) utms.push(`source: ${ev.utm_source}`);
    if(ev.utm_medium) utms.push(`medium: ${ev.utm_medium}`);
    if(ev.utm_campaign) utms.push(`campaign: ${ev.utm_campaign}`);
    
    document.getElementById('modal-utm').innerText = utms.length > 0 ? utms.join(' | ') : 'Nenhum parâmetro UTM';
    
    const metaStatusEl = document.getElementById('modal-meta-status');
    metaStatusEl.innerText = ev.meta_status.toUpperCase();
    if(ev.meta_status === 'Sucesso') {
        metaStatusEl.className = 'status-badge success';
        metaStatusEl.style.backgroundColor = '';
        metaStatusEl.style.color = '';
    } else {
        metaStatusEl.className = 'status-badge error';
        metaStatusEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        metaStatusEl.style.color = '#ef4444';
    }
    
    // Tratamento do Payload e Resposta
    let payloadText = '';
    let responseText = '';

    if (ev.event_name === 'Purchase' && ev.payload) {
        payloadText = JSON.stringify(ev.payload, null, 2);
        // O webhook do Meta não devolve o JSON da resposta pro backend de forma que salvamos,
        // então nós mockamos a resposta de sucesso padrão do Meta CAPI para vendas.
        if (ev.meta_status === 'Sucesso') {
            responseText = `[\n  {\n    "success": true,\n    "pixel_id": "SEU_PIXEL_AQUI",\n    "response": {\n      "messages": [],\n      "events_received": 1\n    }\n  }\n]`;
        } else {
            responseText = `// Falha no envio pelo servidor.`;
        }
    } else {
        payloadText = `// Evento disparado no Frontend via Pixel no navegador.\n// Payload servidor indisponível.`;
        responseText = `// Processado nativamente pelo navegador.`;
    }

    document.getElementById('modal-meta-payload').innerText = payloadText;
    document.getElementById('modal-meta-response').innerText = responseText;
    
    modal.classList.add('active');
}

closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('active');
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

refreshBtn.addEventListener('click', fetchEvents);

// Auto fetch on load
document.addEventListener('DOMContentLoaded', fetchEvents);
