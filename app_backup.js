const API_URL = 'http://localhost:3000/api';

// State management
let currentCivilian = null;
let currentRecord = null;
let civilians = [];
let records = [];
let vehicles = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeEventListeners();
    loadCivilians();
    loadRecords();
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
        loadCiviliansToSelect();
        openModal('record-modal');
    });

    document.getElementById('record-form').addEventListener('submit', handleRecordSubmit);

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
            <td><strong>${civilian.game_nick}</strong></td>
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
        notes: document.getElementById('notes').value
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
        const recordsResponse = await fetch(`${API_URL}/civilians/${civilian.id}/records`);
        const civilianRecords = await recordsResponse.json();

        resultsDiv.innerHTML = `
            <div class="result-card">
                <h4>${civilian.game_nick}</h4>
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
