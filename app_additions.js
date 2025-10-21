// ============================================
// ADD THESE TO YOUR EXISTING app.js FILE
// ============================================

// Add to state management (top of file, after existing variables)
let citations = [];
let bolos = [];

// Add to DOMContentLoaded initialization
loadCitations();
loadBolos();

// Add to switchView titles object
const titles = {
    'civilians': 'Civilians Database',
    'records': 'Criminal Records',
    'citations': 'Citations',
    'bolos': 'BOLOs - Be On the Lookout',
    'vehicles': 'Vehicles Database',
    'search': 'Quick Search'
};

// ============================================
// CIVILIAN SEARCH AUTOCOMPLETE
// ============================================

function setupCivilianSearch(inputId, hiddenId, resultsId) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const results = document.getElementById(resultsId);

    input.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length < 2) {
            results.classList.remove('active');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/civilians?search=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();

            if (data.length === 0) {
                results.innerHTML = '<div class="search-dropdown-item">No civilians found</div>';
                results.classList.add('active');
                return;
            }

            results.innerHTML = data.map(c => `
                <div class="search-dropdown-item" data-id="${c.id}">
                    <strong>${c.game_nick}</strong>
                    <span>${c.first_name || ''} ${c.last_name || ''}</span>
                </div>
            `).join('');

            results.querySelectorAll('.search-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    const civilian = data.find(c => c.id == id);
                    input.value = civilian.game_nick;
                    hidden.value = id;
                    results.classList.remove('active');
                });
            });

            results.classList.add('active');
        } catch (error) {
            console.error('Error searching civilians:', error);
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.remove('active');
        }
    });
}

// ============================================
// UPDATE EXISTING FUNCTIONS
// ============================================

// UPDATE handleCivilianSubmit to include new fields
// Add these lines to the civilianData object:
/*
is_bolo: document.getElementById('is-bolo').value,
warning_flags: document.getElementById('warning-flags').value
*/

// UPDATE editCivilian to include new fields
// Add these lines after existing field assignments:
/*
document.getElementById('is-bolo').value = civilian.is_bolo || 0;
document.getElementById('warning-flags').value = civilian.warning_flags || '';
*/

// UPDATE renderCivilians to show BOLO badge
// Replace the game_nick td with:
/*
<td>
    <strong>${civilian.game_nick}</strong>
    ${civilian.is_bolo ? '<span class="badge badge-bolo" style="margin-left: 0.5rem;">BOLO</span>' : ''}
</td>
*/

// ============================================
// CITATIONS FUNCTIONS
// ============================================

async function loadCitations() {
    try {
        const response = await fetch(`${API_URL}/citations`);
        citations = await response.json();
        renderCitations(citations);
    } catch (error) {
        console.error('Error loading citations:', error);
    }
}

function renderCitations(data) {
    const tbody = document.getElementById('citations-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No citations found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(citation => `
        <tr>
            <td><strong>${citation.citation_number}</strong></td>
            <td>${citation.game_nick}</td>
            <td>${citation.citation_date}</td>
            <td>${citation.violation.substring(0, 40)}${citation.violation.length > 40 ? '...' : ''}</td>
            <td>$${citation.fine_amount || '0.00'}</td>
            <td><span class="badge ${getStatusBadgeClass(citation.status)}">${citation.status}</span></td>
            <td class="action-buttons">
                <button class="btn btn-success" onclick="editCitation(${citation.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteCitation(${citation.id}, '${citation.citation_number}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleCitationSubmit(e) {
    e.preventDefault();
    
    const citationData = {
        civilian_id: document.getElementById('citation-civilian-select').value,
        citation_date: document.getElementById('citation-date').value,
        citation_time: document.getElementById('citation-time').value,
        location: document.getElementById('citation-location').value,
        issuing_officer: document.getElementById('citation-officer').value,
        department: document.getElementById('citation-department').value,
        violation: document.getElementById('citation-violation').value,
        fine_amount: document.getElementById('citation-fine').value,
        notes: document.getElementById('citation-notes').value,
        status: document.getElementById('citation-status').value
    };

    const citationId = document.getElementById('citation-id').value;
    const url = citationId ? `${API_URL}/citations/${citationId}` : `${API_URL}/citations`;
    const method = citationId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(citationData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(citationId ? 'Citation updated' : 'Citation added', 'success');
            closeModal('citation-modal');
            loadCitations();
        } else {
            showNotification(result.error || 'Error saving citation', 'error');
        }
    } catch (error) {
        console.error('Error saving citation:', error);
        showNotification('Error saving citation', 'error');
    }
}

async function editCitation(id) {
    try {
        const citation = citations.find(c => c.id === id);
        if (!citation) return;

        document.getElementById('citation-id').value = citation.id;
        document.getElementById('citation-civilian-search').value = citation.game_nick;
        document.getElementById('citation-civilian-select').value = citation.civilian_id;
        document.getElementById('citation-date').value = citation.citation_date;
        document.getElementById('citation-time').value = citation.citation_time || '';
        document.getElementById('citation-location').value = citation.location || '';
        document.getElementById('citation-officer').value = citation.issuing_officer || '';
        document.getElementById('citation-department').value = citation.department || '';
        document.getElementById('citation-violation').value = citation.violation;
        document.getElementById('citation-fine').value = citation.fine_amount || '';
        document.getElementById('citation-notes').value = citation.notes || '';
        document.getElementById('citation-status').value = citation.status || 'Unpaid';

        document.getElementById('citation-modal-title').textContent = 'Edit Citation';
        setupCivilianSearch('citation-civilian-search', 'citation-civilian-select', 'citation-search-results');
        openModal('citation-modal');
    } catch (error) {
        console.error('Error loading citation:', error);
    }
}

async function deleteCitation(id, citationNumber) {
    if (!confirm(`Delete citation ${citationNumber}?`)) return;

    try {
        const response = await fetch(`${API_URL}/citations/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showNotification('Citation deleted', 'success');
            loadCitations();
        }
    } catch (error) {
        console.error('Error deleting citation:', error);
    }
}

window.editCitation = editCitation;
window.deleteCitation = deleteCitation;

// ============================================
// BOLO FUNCTIONS
// ============================================

async function loadBolos() {
    try {
        const response = await fetch(`${API_URL}/bolos`);
        bolos = await response.json();
        renderBolos(bolos);
    } catch (error) {
        console.error('Error loading BOLOs:', error);
    }
}

function renderBolos(data) {
    const tbody = document.getElementById('bolos-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No active BOLOs.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(bolo => `
        <tr>
            <td><strong>${bolo.bolo_number}</strong></td>
            <td>${bolo.game_nick}</td>
            <td>${bolo.reason}</td>
            <td>${bolo.last_known_location || 'Unknown'}</td>
            <td><span class="badge badge-${bolo.priority.toLowerCase()}">${bolo.priority}</span></td>
            <td><span class="badge ${getStatusBadgeClass(bolo.status)}">${bolo.status}</span></td>
            <td class="action-buttons">
                <button class="btn btn-success" onclick="editBolo(${bolo.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteBolo(${bolo.id}, '${bolo.bolo_number}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleBoloSubmit(e) {
    e.preventDefault();
    
    const boloData = {
        civilian_id: document.getElementById('bolo-civilian-select').value,
        reason: document.getElementById('bolo-reason').value,
        description: document.getElementById('bolo-description').value,
        last_known_location: document.getElementById('bolo-location').value,
        issuing_officer: document.getElementById('bolo-officer').value,
        department: document.getElementById('bolo-department').value,
        priority: document.getElementById('bolo-priority').value,
        status: document.getElementById('bolo-status').value
    };

    const boloId = document.getElementById('bolo-id').value;
    const url = boloId ? `${API_URL}/bolos/${boloId}` : `${API_URL}/bolos`;
    const method = boloId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(boloData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(boloId ? 'BOLO updated' : 'BOLO added', 'success');
            closeModal('bolo-modal');
            loadBolos();
            loadCivilians(); // Refresh to show BOLO badge
        } else {
            showNotification(result.error || 'Error saving BOLO', 'error');
        }
    } catch (error) {
        console.error('Error saving BOLO:', error);
        showNotification('Error saving BOLO', 'error');
    }
}

async function editBolo(id) {
    try {
        const bolo = bolos.find(b => b.id === id);
        if (!bolo) return;

        document.getElementById('bolo-id').value = bolo.id;
        document.getElementById('bolo-civilian-search').value = bolo.game_nick;
        document.getElementById('bolo-civilian-select').value = bolo.civilian_id;
        document.getElementById('bolo-reason').value = bolo.reason;
        document.getElementById('bolo-description').value = bolo.description || '';
        document.getElementById('bolo-location').value = bolo.last_known_location || '';
        document.getElementById('bolo-officer').value = bolo.issuing_officer || '';
        document.getElementById('bolo-department').value = bolo.department || '';
        document.getElementById('bolo-priority').value = bolo.priority || 'Medium';
        document.getElementById('bolo-status').value = bolo.status || 'Active';

        document.getElementById('bolo-modal-title').textContent = 'Edit BOLO';
        setupCivilianSearch('bolo-civilian-search', 'bolo-civilian-select', 'bolo-search-results');
        openModal('bolo-modal');
    } catch (error) {
        console.error('Error loading BOLO:', error);
    }
}

async function deleteBolo(id, boloNumber) {
    if (!confirm(`Delete BOLO ${boloNumber}?`)) return;

    try {
        const response = await fetch(`${API_URL}/bolos/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showNotification('BOLO deleted', 'success');
            loadBolos();
        }
    } catch (error) {
        console.error('Error deleting BOLO:', error);
    }
}

window.editBolo = editBolo;
window.deleteBolo = deleteBolo;

// ============================================
// AUDIO WARNING
// ============================================

function checkAndPlayWarning(civilian) {
    const warningFlags = (civilian.warning_flags || '').toLowerCase();
    const dangerousFlags = ['armed', 'dangerous', 'violent', 'mentally ill', 'suicidal', 'caution'];
    
    const hasDangerousFlag = dangerousFlags.some(flag => warningFlags.includes(flag));
    
    if (civilian.is_bolo || hasDangerousFlag) {
        try {
            const warningAudio = document.getElementById('warning-audio');
            warningAudio.currentTime = 0;
            warningAudio.play().catch(err => {
                console.log('Audio autoplay blocked:', err);
            });
        } catch (error) {
            console.error('Error playing warning audio:', error);
        }
    }
}

// ============================================
// UPDATE EVENT LISTENERS
// ============================================

// Add these to initializeEventListeners():

document.getElementById('add-citation-btn').addEventListener('click', () => {
    currentCitation = null;
    document.getElementById('citation-form').reset();
    document.getElementById('citation-id').value = '';
    document.getElementById('citation-modal-title').textContent = 'Add New Citation';
    setupCivilianSearch('citation-civilian-search', 'citation-civilian-select', 'citation-search-results');
    openModal('citation-modal');
});

document.getElementById('citation-form').addEventListener('submit', handleCitationSubmit);

document.getElementById('add-bolo-btn').addEventListener('click', () => {
    currentBolo = null;
    document.getElementById('bolo-form').reset();
    document.getElementById('bolo-id').value = '';
    document.getElementById('bolo-modal-title').textContent = 'Add New BOLO';
    setupCivilianSearch('bolo-civilian-search', 'bolo-civilian-select', 'bolo-search-results');
    openModal('bolo-modal');
});

document.getElementById('bolo-form').addEventListener('submit', handleBoloSubmit);

// UPDATE record modal to use search:
document.getElementById('add-record-btn').addEventListener('click', () => {
    currentRecord = null;
    document.getElementById('record-form').reset();
    document.getElementById('record-id').value = '';
    document.getElementById('record-modal-title').textContent = 'Add New Criminal Record';
    setupCivilianSearch('civilian-search', 'civilian-select', 'civilian-search-results');
    openModal('record-modal');
});

// ============================================
// UPDATE viewCivilianDetails
// ============================================

// Add this line at the start of viewCivilianDetails function:
// checkAndPlayWarning(civilian);

// Add citations and BOLOs to the Promise.all:
/*
const [civilianResponse, recordsResponse, citationsResponse, bolosResponse] = await Promise.all([
    fetch(`${API_URL}/civilians/${id}`),
    fetch(`${API_URL}/civilians/${id}/records`),
    fetch(`${API_URL}/civilians/${id}/citations`),
    fetch(`${API_URL}/civilians/${id}/bolos`)
]);

const civilian = await civilianResponse.json();
const civilianRecords = await recordsResponse.json();
const civilianCitations = await citationsResponse.json();
const civilianBolos = await bolosResponse.json();
*/

// Add warning alert at top of details:
/*
${civilian.is_bolo || civilian.warning_flags ? `
<div class="warning-alert" style="position: relative; margin-bottom: 2rem;">
    <h2>⚠️ WARNING ⚠️</h2>
    <p>${civilian.warning_flags || 'BOLO ACTIVE'}</p>
</div>
` : ''}
*/

// Add BOLOs section before criminal records:
/*
${civilianBolos.length > 0 ? `
<div class="details-section">
    <h4>Active BOLOs (${civilianBolos.length})</h4>
    ${civilianBolos.map(bolo => `
        <div class="record-item" style="border-left-color: var(--danger-color);">
            <div class="record-header">
                <span class="record-number">${bolo.bolo_number}</span>
                <span class="badge badge-${bolo.priority.toLowerCase()}">${bolo.priority}</span>
            </div>
            <div class="record-charges"><strong>Reason:</strong> ${bolo.reason}</div>
            ${bolo.description ? `<div class="record-meta"><strong>Description:</strong> ${bolo.description}</div>` : ''}
        </div>
    `).join('')}
</div>
` : ''}
*/

// Add citations section after criminal records:
/*
<div class="details-section">
    <h4>Citations (${civilianCitations.length})</h4>
    ${civilianCitations.length > 0 ? civilianCitations.map(citation => `
        <div class="record-item" style="border-left-color: var(--warning-color);">
            <div class="record-header">
                <span class="record-number">${citation.citation_number}</span>
                <span class="badge ${getStatusBadgeClass(citation.status)}">${citation.status}</span>
            </div>
            <div class="record-charges"><strong>Violation:</strong> ${citation.violation}</div>
            <div class="record-meta">
                <strong>Date:</strong> ${citation.citation_date} | 
                <strong>Fine:</strong> $${citation.fine_amount || '0.00'}
            </div>
        </div>
    `).join('') : '<p style="color: var(--text-secondary);">No citations found.</p>'}
</div>
*/
