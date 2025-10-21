const API_URL = 'http://localhost:3000/api';

// State management
let currentCivilian = null;
let currentRecord = null;
let currentCitation = null;
let currentBolo = null;
let civilians = [];
let records = [];
let citations = [];
let bolos = [];
let vehicles = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeEventListeners();
    loadCivilians();
    loadRecords();
    loadCitations();
    loadBolos();
    loadVehicles();
});

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchView(viewName) {
    const views = document.querySelectorAll('.content-view');
    views.forEach(view => view.classList.remove('active'));
    
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
        
        // Update page title
        const titles = {
            'civilians': 'Civilians Database',
            'records': 'Criminal Records',
            'citations': 'Citations',
            'bolos': 'BOLOs - Be On the Lookout',
            'vehicles': 'Vehicles Database',
            'search': 'Quick Search'
        };
        document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';
    }
}

// Event Listeners
function initializeEventListeners() {
    // Civilian modal
    document.getElementById('add-civilian-btn').addEventListener('click', () => {
        currentCivilian = null;
        document.getElementById('civilian-form').reset();
        document.getElementById('civilian-id').value = '';
        document.getElementById('civilian-modal-title').textContent = 'Add New Civilian';
        openModal('civilian-modal');
    });

    document.getElementById('civilian-form').addEventListener('submit', handleCivilianSubmit);

    // Record modal
    document.getElementById('add-record-btn').addEventListener('click', () => {
        currentRecord = null;
        document.getElementById('record-form').reset();
        document.getElementById('record-id').value = '';
        document.getElementById('record-modal-title').textContent = 'Add New Criminal Record';
        setupCivilianSearch('civilian-search', 'civilian-select', 'civilian-search-results');
        openModal('record-modal');
    });

    document.getElementById('record-form').addEventListener('submit', handleRecordSubmit);

    // Citation modal
    document.getElementById('add-citation-btn').addEventListener('click', () => {
        currentCitation = null;
        document.getElementById('citation-form').reset();
        document.getElementById('citation-id').value = '';
        document.getElementById('citation-modal-title').textContent = 'Add New Citation';
        setupCivilianSearch('citation-civilian-search', 'citation-civilian-select', 'citation-search-results');
        openModal('citation-modal');
    });

    document.getElementById('citation-form').addEventListener('submit', handleCitationSubmit);

    // BOLO modal
    document.getElementById('add-bolo-btn').addEventListener('click', () => {
        currentBolo = null;
        document.getElementById('bolo-form').reset();
        document.getElementById('bolo-id').value = '';
        document.getElementById('bolo-modal-title').textContent = 'Add New BOLO';
        setupCivilianSearch('bolo-civilian-search', 'bolo-civilian-select', 'bolo-search-results');
        openModal('bolo-modal');
    });

    document.getElementById('bolo-form').addEventListener('submit', handleBoloSubmit);

    // Vehicle modal
    document.getElementById('add-vehicle-btn').addEventListener('click', () => {
        document.getElementById('vehicle-form').reset();
        loadCiviliansToVehicleSelect();
        openModal('vehicle-modal');
    });

    document.getElementById('vehicle-form').addEventListener('submit', handleVehicleSubmit);

    // Quick search
    document.getElementById('quick-search-btn').addEventListener('click', performQuickSearch);
    document.getElementById('quick-search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performQuickSearch();
        }
    });

    // Global search
    document.getElementById('global-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterCurrentView(searchTerm);
    });
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

// Make closeModal available globally
window.closeModal = closeModal;

// API Calls - Civilians
async function loadCivilians() {
    try {
        const response = await fetch(`${API_URL}/civilians`);
        civilians = await response.json();
        renderCivilians(civilians);
    } catch (error) {
        console.error('Error loading civilians:', error);
        showNotification('Error loading civilians', 'error');
    }
}

function renderCivilians(data) {
    const tbody = document.getElementById('civilians-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No civilians found. Add one to get started.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(civilian => `
        <tr>
            <td>
                <strong>${civilian.game_nick}</strong>
                ${civilian.is_bolo ? '<span class="badge badge-bolo" style="margin-left: 0.5rem;">BOLO</span>' : ''}
            </td>
            <td>${civilian.first_name || ''} ${civilian.last_name || ''}</td>
            <td>${civilian.date_of_birth || 'N/A'}</td>
            <td>${civilian.gender || 'N/A'}</td>
            <td><span class="badge ${getLicenseBadgeClass(civilian.license_status)}">${civilian.license_status}</span></td>
            <td class="action-buttons">
                <button class="btn btn-info" onclick="viewCivilianDetails(${civilian.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-success" onclick="editCivilian(${civilian.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteCivilian(${civilian.id}, '${civilian.game_nick}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleCivilianSubmit(e) {
    e.preventDefault();
    
    const civilianData = {
        game_nick: document.getElementById('game-nick').value,
        first_name: document.getElementById('first-name').value,
        last_name: document.getElementById('last-name').value,
        date_of_birth: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        address: document.getElementById('address').value,
        phone_number: document.getElementById('phone').value,
        license_status: document.getElementById('license-status').value,
        notes: document.getElementById('notes').value,
        is_bolo: document.getElementById('is-bolo').value,
        warning_flags: document.getElementById('warning-flags').value
    };

    const civilianId = document.getElementById('civilian-id').value;
    const url = civilianId ? `${API_URL}/civilians/${civilianId}` : `${API_URL}/civilians`;
    const method = civilianId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(civilianData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(civilianId ? 'Civilian updated successfully' : 'Civilian added successfully', 'success');
            closeModal('civilian-modal');
            loadCivilians();
        } else {
            showNotification(result.error || 'Error saving civilian', 'error');
        }
    } catch (error) {
        console.error('Error saving civilian:', error);
        showNotification('Error saving civilian', 'error');
    }
}

async function editCivilian(id) {
    try {
        const response = await fetch(`${API_URL}/civilians/${id}`);
        const civilian = await response.json();

        document.getElementById('civilian-id').value = civilian.id;
        document.getElementById('game-nick').value = civilian.game_nick;
        document.getElementById('first-name').value = civilian.first_name || '';
        document.getElementById('last-name').value = civilian.last_name || '';
        document.getElementById('dob').value = civilian.date_of_birth || '';
        document.getElementById('gender').value = civilian.gender || '';
        document.getElementById('address').value = civilian.address || '';
        document.getElementById('phone').value = civilian.phone_number || '';
        document.getElementById('license-status').value = civilian.license_status || 'Valid';
        document.getElementById('notes').value = civilian.notes || '';
        document.getElementById('is-bolo').value = civilian.is_bolo || 0;
        document.getElementById('warning-flags').value = civilian.warning_flags || '';

        document.getElementById('civilian-modal-title').textContent = 'Edit Civilian';
        openModal('civilian-modal');
    } catch (error) {
        console.error('Error loading civilian:', error);
        showNotification('Error loading civilian', 'error');
    }
}

async function deleteCivilian(id, gameNick) {
    if (!confirm(`Are you sure you want to delete ${gameNick}? This will also delete all associated criminal records.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/civilians/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Civilian deleted successfully', 'success');
            loadCivilians();
        } else {
            showNotification('Error deleting civilian', 'error');
        }
    } catch (error) {
        console.error('Error deleting civilian:', error);
        showNotification('Error deleting civilian', 'error');
    }
}

async function viewCivilianDetails(id) {
    try {
        const [civilianResponse, recordsResponse] = await Promise.all([
            fetch(`${API_URL}/civilians/${id}`),
            fetch(`${API_URL}/civilians/${id}/records`)
        ]);

        const civilian = await civilianResponse.json();
        const civilianRecords = await recordsResponse.json();

        const detailsContent = document.getElementById('civilian-details-content');
        document.getElementById('civilian-details-title').textContent = `${civilian.game_nick} - Details`;

        detailsContent.innerHTML = `
            <div class="details-section">
                <h4>Personal Information</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Game Nick</span>
                        <span class="detail-value">${civilian.game_nick}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Full Name</span>
                        <span class="detail-value">${civilian.first_name || ''} ${civilian.last_name || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date of Birth</span>
                        <span class="detail-value">${civilian.date_of_birth || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Gender</span>
                        <span class="detail-value">${civilian.gender || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone Number</span>
                        <span class="detail-value">${civilian.phone_number || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">License Status</span>
                        <span class="detail-value"><span class="badge ${getLicenseBadgeClass(civilian.license_status)}">${civilian.license_status}</span></span>
                    </div>
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <span class="detail-label">Address</span>
                        <span class="detail-value">${civilian.address || 'N/A'}</span>
                    </div>
                    ${civilian.notes ? `
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <span class="detail-label">Notes</span>
                        <span class="detail-value">${civilian.notes}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="details-section">
                <h4>Criminal Records (${civilianRecords.length})</h4>
                ${civilianRecords.length > 0 ? civilianRecords.map(record => `
                    <div class="record-item">
                        <div class="record-header">
                            <span class="record-number">${record.record_number}</span>
                            <span class="badge ${getStatusBadgeClass(record.status)}">${record.status}</span>
                        </div>
                        <div class="record-charges"><strong>Charges:</strong> ${record.charges}</div>
                        <div class="record-meta">
                            <strong>Date:</strong> ${record.incident_date} ${record.incident_time || ''} | 
                            <strong>Location:</strong> ${record.location || 'N/A'} | 
                            <strong>Officer:</strong> ${record.arresting_officer || 'N/A'}
                        </div>
                        ${record.narrative ? `<div class="record-meta" style="margin-top: 0.5rem;"><strong>Narrative:</strong> ${record.narrative}</div>` : ''}
                    </div>
                `).join('') : '<p style="color: var(--text-secondary);">No criminal records found.</p>'}
            </div>
        `;

        openModal('civilian-details-modal');
    } catch (error) {
        console.error('Error loading civilian details:', error);
        showNotification('Error loading civilian details', 'error');
    }
}

// Make functions available globally
window.editCivilian = editCivilian;
window.deleteCivilian = deleteCivilian;
window.viewCivilianDetails = viewCivilianDetails;

// API Calls - Criminal Records
async function loadRecords() {
    try {
        const response = await fetch(`${API_URL}/records`);
        records = await response.json();
        renderRecords(records);
    } catch (error) {
        console.error('Error loading records:', error);
        showNotification('Error loading records', 'error');
    }
}

function renderRecords(data) {
    const tbody = document.getElementById('records-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No records found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(record => `
        <tr>
            <td><strong>${record.record_number}</strong></td>
            <td>${record.game_nick}</td>
            <td>${record.incident_date}</td>
            <td>${record.charges.substring(0, 50)}${record.charges.length > 50 ? '...' : ''}</td>
            <td>${record.arresting_officer || 'N/A'}</td>
            <td><span class="badge ${getStatusBadgeClass(record.status)}">${record.status}</span></td>
            <td class="action-buttons">
                <button class="btn btn-success" onclick="editRecord(${record.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteRecord(${record.id}, '${record.record_number}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadCiviliansToSelect() {
    try {
        const response = await fetch(`${API_URL}/civilians`);
        const civiliansList = await response.json();
        
        const select = document.getElementById('civilian-select');
        select.innerHTML = '<option value="">Select a civilian...</option>' + 
            civiliansList.map(c => `<option value="${c.id}">${c.game_nick} - ${c.first_name || ''} ${c.last_name || ''}</option>`).join('');
    } catch (error) {
        console.error('Error loading civilians:', error);
    }
}

async function handleRecordSubmit(e) {
    e.preventDefault();
    
    const recordData = {
        civilian_id: document.getElementById('civilian-select').value,
        incident_date: document.getElementById('incident-date').value,
        incident_time: document.getElementById('incident-time').value,
        location: document.getElementById('location').value,
        arresting_officer: document.getElementById('arresting-officer').value,
        department: document.getElementById('department').value,
        charges: document.getElementById('charges').value,
        narrative: document.getElementById('narrative').value,
        status: document.getElementById('record-status').value,
        flags: document.getElementById('flags').value
    };

    const recordId = document.getElementById('record-id').value;
    const url = recordId ? `${API_URL}/records/${recordId}` : `${API_URL}/records`;
    const method = recordId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recordData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(recordId ? 'Record updated successfully' : 'Record added successfully', 'success');
            closeModal('record-modal');
            loadRecords();
        } else {
            showNotification(result.error || 'Error saving record', 'error');
        }
    } catch (error) {
        console.error('Error saving record:', error);
        showNotification('Error saving record', 'error');
    }
}

async function editRecord(id) {
    try {
        const response = await fetch(`${API_URL}/records/${id}`);
        const record = await response.json();

        await loadCiviliansToSelect();

        document.getElementById('record-id').value = record.id;
        document.getElementById('civilian-select').value = record.civilian_id;
        document.getElementById('incident-date').value = record.incident_date;
        document.getElementById('incident-time').value = record.incident_time || '';
        document.getElementById('location').value = record.location || '';
        document.getElementById('arresting-officer').value = record.arresting_officer || '';
        document.getElementById('department').value = record.department || '';
        document.getElementById('charges').value = record.charges;
        document.getElementById('narrative').value = record.narrative || '';
        document.getElementById('record-status').value = record.status || 'Active';
        document.getElementById('flags').value = record.flags || '';

        document.getElementById('record-modal-title').textContent = 'Edit Criminal Record';
        openModal('record-modal');
    } catch (error) {
        console.error('Error loading record:', error);
        showNotification('Error loading record', 'error');
    }
}

async function deleteRecord(id, recordNumber) {
    if (!confirm(`Are you sure you want to delete record ${recordNumber}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/records/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Record deleted successfully', 'success');
            loadRecords();
        } else {
            showNotification('Error deleting record', 'error');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showNotification('Error deleting record', 'error');
    }
}

// Make functions available globally
window.editRecord = editRecord;
window.deleteRecord = deleteRecord;

// API Calls - Vehicles
async function loadVehicles() {
    try {
        const response = await fetch(`${API_URL}/vehicles`);
        vehicles = await response.json();
        renderVehicles(vehicles);
    } catch (error) {
        console.error('Error loading vehicles:', error);
        showNotification('Error loading vehicles', 'error');
    }
}

function renderVehicles(data) {
    const tbody = document.getElementById('vehicles-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No vehicles found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(vehicle => `
        <tr>
            <td><strong>${vehicle.plate}</strong></td>
            <td>${vehicle.model}</td>
            <td>${vehicle.color || 'N/A'}</td>
            <td>${vehicle.game_nick || 'Unregistered'}</td>
            <td><span class="badge ${getStatusBadgeClass(vehicle.registration_status)}">${vehicle.registration_status}</span></td>
            <td class="action-buttons">
                <button class="btn btn-info" onclick="viewVehicleDetails(${vehicle.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadCiviliansToVehicleSelect() {
    try {
        const response = await fetch(`${API_URL}/civilians`);
        const civiliansList = await response.json();
        
        const select = document.getElementById('vehicle-civilian');
        select.innerHTML = '<option value="">Select owner...</option>' + 
            civiliansList.map(c => `<option value="${c.id}">${c.game_nick}</option>`).join('');
    } catch (error) {
        console.error('Error loading civilians:', error);
    }
}

async function handleVehicleSubmit(e) {
    e.preventDefault();
    
    const vehicleData = {
        civilian_id: document.getElementById('vehicle-civilian').value || null,
        plate: document.getElementById('plate').value,
        model: document.getElementById('model').value,
        color: document.getElementById('color').value,
        registration_status: document.getElementById('registration-status').value,
        insurance_status: document.getElementById('insurance-status').value,
        notes: document.getElementById('vehicle-notes').value
    };

    try {
        const response = await fetch(`${API_URL}/vehicles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vehicleData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Vehicle added successfully', 'success');
            closeModal('vehicle-modal');
            loadVehicles();
        } else {
            showNotification(result.error || 'Error saving vehicle', 'error');
        }
    } catch (error) {
        console.error('Error saving vehicle:', error);
        showNotification('Error saving vehicle', 'error');
    }
}

function viewVehicleDetails(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    alert(`Vehicle Details:\nPlate: ${vehicle.plate}\nModel: ${vehicle.model}\nColor: ${vehicle.color || 'N/A'}\nOwner: ${vehicle.game_nick || 'Unregistered'}\nRegistration: ${vehicle.registration_status}\nInsurance: ${vehicle.insurance_status}`);
}

// Make functions available globally
window.viewVehicleDetails = viewVehicleDetails;

// Quick Search
async function performQuickSearch() {
    const searchInput = document.getElementById('quick-search-input').value.trim();
    const resultsDiv = document.getElementById('search-results');

    if (!searchInput) {
        resultsDiv.innerHTML = '<p style="color: var(--text-secondary);">Please enter a game nick to search.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/civilians/search/${encodeURIComponent(searchInput)}`);
        
        if (!response.ok) {
            resultsDiv.innerHTML = '<p style="color: var(--danger-color);">No civilian found with that game nick.</p>';
            return;
        }

        const civilian = await response.json();
        
        // Fetch all related data
        const [recordsResponse, citationsResponse, bolosResponse] = await Promise.all([
            fetch(`${API_URL}/civilians/${civilian.id}/records`),
            fetch(`${API_URL}/civilians/${civilian.id}/citations`),
            fetch(`${API_URL}/civilians/${civilian.id}/bolos`)
        ]);
        
        const civilianRecords = await recordsResponse.json();
        const civilianCitations = await citationsResponse.json();
        const civilianBolos = await bolosResponse.json();

        // Check for warnings and play audio
        checkAndPlayWarning(civilian);

        resultsDiv.innerHTML = `
            <div class="result-card">
                ${civilian.is_bolo || civilian.warning_flags ? `
                <div class="warning-alert" style="position: relative; margin-bottom: 1.5rem;">
                    <h2>⚠️ WARNING ⚠️</h2>
                    <p>${civilian.warning_flags || 'BOLO ACTIVE'}</p>
                </div>
                ` : ''}
                
                <h4>
                    ${civilian.game_nick}
                    ${civilian.is_bolo ? '<span class="badge badge-bolo" style="margin-left: 0.5rem;">BOLO</span>' : ''}
                </h4>
                
                <div class="result-info">
                    <div class="info-item">
                        <span class="info-label">Full Name</span>
                        <span class="info-value">${civilian.first_name || ''} ${civilian.last_name || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date of Birth</span>
                        <span class="info-value">${civilian.date_of_birth || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Gender</span>
                        <span class="info-value">${civilian.gender || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">License Status</span>
                        <span class="info-value"><span class="badge ${getLicenseBadgeClass(civilian.license_status)}">${civilian.license_status}</span></span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Phone</span>
                        <span class="info-value">${civilian.phone_number || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Address</span>
                        <span class="info-value">${civilian.address || 'N/A'}</span>
                    </div>
                </div>

                ${civilianBolos.length > 0 ? `
                <div class="records-section">
                    <h5 style="color: var(--danger-color);">⚠️ Active BOLOs (${civilianBolos.length})</h5>
                    ${civilianBolos.map(bolo => `
                        <div class="record-item" style="border-left: 4px solid var(--danger-color); background-color: rgba(239, 68, 68, 0.1);">
                            <div class="record-header">
                                <span class="record-number">${bolo.bolo_number}</span>
                                <span class="badge badge-${bolo.priority.toLowerCase()}">${bolo.priority}</span>
                            </div>
                            <div class="record-charges"><strong>Reason:</strong> ${bolo.reason}</div>
                            ${bolo.description ? `<div class="record-meta"><strong>Description:</strong> ${bolo.description}</div>` : ''}
                            <div class="record-meta">
                                <strong>Last Known:</strong> ${bolo.last_known_location || 'Unknown'} | 
                                <strong>Officer:</strong> ${bolo.issuing_officer || 'N/A'} | 
                                <strong>Status:</strong> ${bolo.status}
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <div class="records-section">
                    <h5>Criminal Records (${civilianRecords.length})</h5>
                    ${civilianRecords.length > 0 ? civilianRecords.map(record => `
                        <div class="record-item">
                            <div class="record-header">
                                <span class="record-number">${record.record_number}</span>
                                <span class="badge ${getStatusBadgeClass(record.status)}">${record.status}</span>
                            </div>
                            <div class="record-charges"><strong>Charges:</strong> ${record.charges}</div>
                            <div class="record-meta">
                                <strong>Date:</strong> ${record.incident_date} | 
                                <strong>Location:</strong> ${record.location || 'N/A'} | 
                                <strong>Officer:</strong> ${record.arresting_officer || 'N/A'}
                            </div>
                        </div>
                    `).join('') : '<p style="color: var(--text-secondary); margin-top: 0.5rem;">No criminal records found.</p>'}
                </div>

                ${civilianCitations.length > 0 ? `
                <div class="records-section">
                    <h5>Citations (${civilianCitations.length})</h5>
                    ${civilianCitations.map(citation => `
                        <div class="record-item" style="border-left: 4px solid var(--warning-color);">
                            <div class="record-header">
                                <span class="record-number">${citation.citation_number}</span>
                                <span class="badge ${getStatusBadgeClass(citation.status)}">${citation.status}</span>
                            </div>
                            <div class="record-charges"><strong>Violation:</strong> ${citation.violation}</div>
                            <div class="record-meta">
                                <strong>Date:</strong> ${citation.citation_date} | 
                                <strong>Fine:</strong> $${citation.fine_amount || '0.00'} | 
                                <strong>Officer:</strong> ${citation.issuing_officer || 'N/A'}
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error performing search:', error);
        resultsDiv.innerHTML = '<p style="color: var(--danger-color);">Error performing search. Please try again.</p>';
    }
}

// Filter current view
function filterCurrentView(searchTerm) {
    const activeView = document.querySelector('.content-view.active');
    if (!activeView) return;

    const viewId = activeView.id;

    if (viewId === 'civilians-view') {
        const filtered = civilians.filter(c => 
            c.game_nick.toLowerCase().includes(searchTerm) ||
            (c.first_name && c.first_name.toLowerCase().includes(searchTerm)) ||
            (c.last_name && c.last_name.toLowerCase().includes(searchTerm))
        );
        renderCivilians(filtered);
    } else if (viewId === 'records-view') {
        const filtered = records.filter(r => 
            r.record_number.toLowerCase().includes(searchTerm) ||
            r.game_nick.toLowerCase().includes(searchTerm) ||
            r.charges.toLowerCase().includes(searchTerm)
        );
        renderRecords(filtered);
    } else if (viewId === 'vehicles-view') {
        const filtered = vehicles.filter(v => 
            v.plate.toLowerCase().includes(searchTerm) ||
            v.model.toLowerCase().includes(searchTerm) ||
            (v.game_nick && v.game_nick.toLowerCase().includes(searchTerm))
        );
        renderVehicles(filtered);
    }
}

// Utility functions
function getLicenseBadgeClass(status) {
    const statusMap = {
        'Valid': 'badge-success',
        'Suspended': 'badge-warning',
        'Revoked': 'badge-danger',
        'Expired': 'badge-warning'
    };
    return statusMap[status] || 'badge-info';
}

function getStatusBadgeClass(status) {
    const statusMap = {
        'Active': 'badge-danger',
        'Closed': 'badge-success',
        'Pending': 'badge-warning',
        'Dismissed': 'badge-info'
    };
    return statusMap[status] || 'badge-info';
}

function showNotification(message, type = 'info') {
    // Simple console notification - can be enhanced with a toast library
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
}

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
            loadCivilians();
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
            if (warningAudio) {
                warningAudio.currentTime = 0;
                warningAudio.play().catch(err => {
                    console.log('Audio autoplay blocked:', err);
                });
            }
        } catch (error) {
            console.error('Error playing warning audio:', error);
        }
    }
}
