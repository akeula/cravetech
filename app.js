/**
 * InverterHub Repair History Tracker
 * Core Application Engine & State (Upgraded with Notification System & Client Chat)
 */

const app = (function() {
    
    // Default PIN for admin configuration
    const DEFAULT_PIN = "1234";

    // Demo / Sample Data for testing/evaluation
    const DEMO_STAFF = [
        { id: "staff-1", name: "Sarah Jenkins", role: "Receptionist" },
        { id: "staff-2", name: "Michael Carter", role: "Receptionist" },
        { id: "staff-3", name: "Dave Miller", role: "Technician" },
        { id: "staff-4", name: "Elena Rostova", role: "Technician" },
        { id: "staff-5", name: "Alistair Vance", role: "Technician" },
        { id: "staff-6", name: "Marcus Brody", role: "Manager" }
    ];

    const DEMO_TICKETS = [
        {
            id: "INV-2026-0001",
            customer: { name: "Robert Henderson", phone: "555-0143", email: "robert.h@outlook.com" },
            inverter: { brand: "Victron Energy", model: "MultiPlus-II 48/3000", serial: "HQ2405RTS87", capacity: "3.0 kVA" },
            status: "Collected",
            broughtInDate: "2026-06-08T09:15:00",
            registeredBy: "Sarah Jenkins",
            reportedFault: "Unit shuts down under load. Red overload LED blinking even with 100W load.",
            technician: "Dave Miller",
            diagnosticNotes: "Inspected internal power board. Found failed output current sensor (ACS724). Replaced current sensor, cleaned cooling fan, and load tested with 2.5kW load for 2 hours.",
            fixedDate: "2026-06-09T14:30:00",
            collectedDate: "2026-06-10T16:40:00",
            collectedBy: "Robert Henderson (Self)",
            laborCost: 120.00,
            partsCost: 35.00,
            history: [
                { timestamp: "2026-06-08T09:15:00", action: "Ticket registered by Sarah Jenkins (Intake)" },
                { timestamp: "2026-06-08T14:00:00", action: "Technician Dave Miller assigned by Marcus Brody" },
                { timestamp: "2026-06-09T14:30:00", action: "Status changed to Ready for Collection by Dave Miller. Labor: ₦120.00, Parts: ₦35.00." },
                { timestamp: "2026-06-10T16:40:00", action: "Inverter collected by Robert Henderson. Logged by Michael Carter." }
            ]
        },
        {
            id: "INV-2026-0002",
            customer: { name: "Claire Sterling", phone: "555-0182", email: "claire@sterlingdesigns.co" },
            inverter: { brand: "Growatt", model: "SPF 5000 ES", serial: "GWSPF5024098", capacity: "5.0 kW" },
            status: "Collected",
            broughtInDate: "2026-06-10T10:00:00",
            registeredBy: "Michael Carter",
            reportedFault: "No display, completely dead after a local power surge.",
            technician: "Elena Rostova",
            diagnosticNotes: "Main input fuse blown. Replaced short-circuited MOSFETs on the DC-DC boost stage (4x FDA59N25) and gate driver IC.",
            fixedDate: "2026-06-12T11:20:00",
            collectedDate: "2026-06-12T15:00:00",
            collectedBy: "Claire Sterling",
            laborCost: 180.00,
            partsCost: 65.00,
            history: [
                { timestamp: "2026-06-10T10:00:00", action: "Ticket registered by Michael Carter (Intake)" },
                { timestamp: "2026-06-10T16:15:00", action: "Technician Elena Rostova assigned by Marcus Brody" },
                { timestamp: "2026-06-12T11:20:00", action: "Status changed to Ready for Collection by Elena Rostova. Labor: ₦180.00, Parts: ₦65.00." },
                { timestamp: "2026-06-12T15:00:00", action: "Inverter collected by Claire Sterling. Logged by Sarah Jenkins." }
            ]
        },
        {
            id: "INV-2026-0003",
            customer: { name: "Alhaji Ndiaye", phone: "555-0121", email: "a.ndiaye@gmail.com" },
            inverter: { brand: "Luminous", model: "Cruze+ 4.0 kVA", serial: "LMCRU261054", capacity: "4.0 kVA" },
            status: "Ready for Collection",
            broughtInDate: "2026-06-14T11:30:00",
            registeredBy: "Sarah Jenkins",
            reportedFault: "Inverter mode works fine, but does not switch to charging grid mode when mains power returns.",
            technician: "Alistair Vance",
            diagnosticNotes: "Mains sense circuitry was damaged. Replaced faulty optocoupler (MCT2E) and a burnt 10k ohm sense resistor on the control card.",
            fixedDate: "2026-06-16T15:45:00",
            collectedDate: null,
            collectedBy: "",
            laborCost: 90.00,
            partsCost: 12.50,
            history: [
                { timestamp: "2026-06-14T11:30:00", action: "Ticket registered by Sarah Jenkins (Intake)" },
                { timestamp: "2026-06-15T09:30:00", action: "Technician Alistair Vance assigned by Marcus Brody" },
                { timestamp: "2026-06-16T15:45:00", action: "Status changed to Ready for Collection by Alistair Vance. Labor: ₦90.00, Parts: ₦12.50." }
            ]
        }
    ];

    // Core States (Starts as a blank slate)
    let tickets = [];
    let staff = [];
    let adminPin = DEFAULT_PIN;
    let companyName = "Cravetech Power Solution";
    let companyPhone = "2348031234567"; // helpline phone (must contain country code)
    let companyCountryCode = "234"; // Default country code (e.g. Nigeria code)
    let companyLogo = ""; // Base64 image string
    
    let currentActiveTicket = null;
    let isAdminAuthenticated = false;
    let currentMode = "staff"; // 'staff' or 'client'

    const BUCKET_ID = "EPnpSMcktKppQpMFVW3dM2";

    // Generate a unique deterministic database key based on the company name to ensure all devices share the same database
    function getDatabaseKey() {
        return "inverter_db_cravetech_power_solution";
    }

    // Save local data to the online cloud bucket
    function syncOnline() {
        const payload = {
            tickets: tickets,
            staff: staff,
            adminPin: adminPin,
            companyName: companyName,
            companyPhone: companyPhone,
            companyCountryCode: companyCountryCode,
            companyLogo: companyLogo,
            updatedAt: new Date().toISOString()
        };
        const dbKey = getDatabaseKey();
        const url = `https://kvdb.io/${BUCKET_ID}/${dbKey}`;
        
        fetch(url, { 
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(res => res.text())
        .then(data => {
            console.log("Cloud database synchronized (KVdb):", data);
        })
        .catch(err => {
            console.error("Cloud database synchronization failed (KVdb):", err);
        });
    }

    // Fetch and load database from the online cloud bucket
    function loadOnlineData(callback) {
        const dbKey = getDatabaseKey();
        const url = `https://kvdb.io/${BUCKET_ID}/${dbKey}`;
        
        fetch(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error("HTTP status " + res.status);
                }
                return res.json();
            })
            .then(payload => {
                if (payload && payload.tickets) {
                    tickets = payload.tickets || [];
                    staff = payload.staff || [];
                    adminPin = payload.adminPin || DEFAULT_PIN;
                    companyName = payload.companyName || "Cravetech Power Solution";
                    companyPhone = payload.companyPhone || "2348031234567";
                    companyCountryCode = payload.companyCountryCode || "234";
                    companyLogo = payload.companyLogo || "";
                    
                    // Save locally without triggering resync
                    localStorage.setItem('inverter_repair_tickets', JSON.stringify(tickets));
                    localStorage.setItem('inverter_repair_staff', JSON.stringify(staff));
                    localStorage.setItem('inverter_admin_pin', adminPin);
                    localStorage.setItem('inverter_company_name', companyName);
                    localStorage.setItem('inverter_company_phone', companyPhone);
                    localStorage.setItem('inverter_country_code', companyCountryCode);
                    localStorage.setItem('inverter_company_logo', companyLogo);
                    
                    // Sync inputs in admin settings
                    const nameInput = document.getElementById('company-name-input');
                    if (nameInput) nameInput.value = companyName;

                    const phoneInput = document.getElementById('company-phone-input');
                    if (phoneInput) phoneInput.value = companyPhone;

                    const countryInput = document.getElementById('country-code-input');
                    if (countryInput) countryInput.value = companyCountryCode;

                    renderBrandLogo();
                    populateDropdowns();
                }
                if (callback) callback();
            })
            .catch(err => {
                console.error("Error loading cloud database (KVdb):", err);
                if (callback) callback();
            });
    }

    // Initialize application
    function init() {
        loadData();
        setupEventListeners();
        populateDropdowns();
        renderBrandLogo();
        
        // Auto routing verification: Parse search params for Client Lookup link tracking
        const urlParams = new URLSearchParams(window.location.search);
        const trackId = urlParams.get('track');
        const trackPhone = urlParams.get('phone');
        
        // Sync with the shared cloud database on load
        loadOnlineData(() => {
            if (trackId && trackPhone) {
                document.getElementById('cust-track-id').value = trackId;
                document.getElementById('cust-track-phone').value = trackPhone;
                switchToClientMode(true);
                handleCustomerLookup();
            } else {
                const storedMode = localStorage.getItem('inverter_app_mode');
                if (storedMode === 'client') {
                    switchToClientMode(true);
                } else {
                    switchView('dashboard-view');
                }
            }
        });
    }

    // Load Data from LocalStorage
    function loadData() {
        const storedTickets = localStorage.getItem('inverter_repair_tickets');
        const storedStaff = localStorage.getItem('inverter_repair_staff');
        const storedPin = localStorage.getItem('inverter_admin_pin');
        const storedName = localStorage.getItem('inverter_company_name');
        const storedPhone = localStorage.getItem('inverter_company_phone');
        const storedCountryCode = localStorage.getItem('inverter_country_code');
        const storedLogo = localStorage.getItem('inverter_company_logo');
        
        tickets = storedTickets ? JSON.parse(storedTickets) : [];
        staff = storedStaff ? JSON.parse(storedStaff) : [];
        adminPin = storedPin ? storedPin : DEFAULT_PIN;
        companyName = storedName ? storedName : "Cravetech Power Solution";
        companyPhone = storedPhone ? storedPhone : "2348031234567";
        companyCountryCode = storedCountryCode ? storedCountryCode : "234";
        companyLogo = storedLogo ? storedLogo : "";

        // Sync inputs in admin settings
        const nameInput = document.getElementById('company-name-input');
        if (nameInput) nameInput.value = companyName;

        const phoneInput = document.getElementById('company-phone-input');
        if (phoneInput) phoneInput.value = companyPhone;

        const countryInput = document.getElementById('country-code-input');
        if (countryInput) countryInput.value = companyCountryCode;
    }

    // Save Data to LocalStorage & Sync to Cloud
    function saveData() {
        localStorage.setItem('inverter_repair_tickets', JSON.stringify(tickets));
        localStorage.setItem('inverter_repair_staff', JSON.stringify(staff));
        localStorage.setItem('inverter_admin_pin', adminPin);
        localStorage.setItem('inverter_company_name', companyName);
        localStorage.setItem('inverter_company_phone', companyPhone);
        localStorage.setItem('inverter_country_code', companyCountryCode);
        localStorage.setItem('inverter_company_logo', companyLogo);
        
        syncOnline();
    }

    // Clean and format phone numbers for direct WhatsApp web links
    function formatWhatsAppNumber(phone) {
        let clean = phone.replace(/[^0-9]/g, ''); // strip all non-numbers
        
        // If the number starts with 0, replace it with the country code (standard regional format)
        if (clean.startsWith('0')) {
            clean = companyCountryCode + clean.substring(1);
        } else if (!clean.startsWith(companyCountryCode) && clean.length <= 10) {
            // If it doesn't start with country code and is a standard short number, append country code
            clean = companyCountryCode + clean;
        }
        
        return clean;
    }

    // Populate Select elements dynamically
    function populateDropdowns() {
        const intakeStaffSelect = document.getElementById('intake-staff');
        const editTechSelect = document.getElementById('edit-tech');
        const editDiagStaffSelect = document.getElementById('edit-diagnosed-by');
        const filterTechSelect = document.getElementById('filter-tech');
        
        if (!intakeStaffSelect) return; 

        intakeStaffSelect.innerHTML = '<option value="">Select Registered Staff</option>';
        editTechSelect.innerHTML = '<option value="">Select Technician</option>';
        editDiagStaffSelect.innerHTML = '<option value="">Select Staff Name</option>';
        filterTechSelect.innerHTML = '<option value="">All Technicians</option>';
        
        const filterBrandSelect = document.getElementById('filter-brand');
        filterBrandSelect.innerHTML = '<option value="">All Brands</option>';
        const brands = new Set();
        tickets.forEach(t => brands.add(t.inverter.brand));
        ['Luminous', 'Growatt', 'Victron Energy', 'SMA', 'Schneider Electric', 'Fronius', 'Sunsynk', 'Deye', 'Other'].forEach(b => brands.add(b));
        
        Array.from(brands).sort().forEach(brand => {
            filterBrandSelect.innerHTML += `<option value="${brand}">${brand}</option>`;
        });

        staff.forEach(member => {
            if (member.role === 'Receptionist' || member.role === 'Manager') {
                intakeStaffSelect.innerHTML += `<option value="${member.name}">${member.name} (${member.role})</option>`;
            }
            if (member.role === 'Technician') {
                editTechSelect.innerHTML += `<option value="${member.name}">${member.name}</option>`;
                filterTechSelect.innerHTML += `<option value="${member.name}">${member.name}</option>`;
            }
            editDiagStaffSelect.innerHTML += `<option value="${member.name}">${member.name} (${member.role})</option>`;
        });
    }

    // Setup Event Listeners
    function setupEventListeners() {
        // Mobile Sidebar toggles
        const sidebarToggle = document.getElementById('btn-sidebar-toggle');
        const sidebarClose = document.getElementById('mobile-sidebar-close');
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function() {
                document.body.classList.add('sidebar-open');
            });
        }
        if (sidebarClose) {
            sidebarClose.addEventListener('click', function() {
                document.body.classList.remove('sidebar-open');
            });
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                document.body.classList.remove('sidebar-open');
                e.preventDefault();
                const viewId = this.getAttribute('data-view');
                if (viewId) {
                    switchView(viewId, this);
                }
            });
        });

        document.getElementById('search-query').addEventListener('input', renderRegistry);
        document.getElementById('filter-status').addEventListener('change', renderRegistry);
        document.getElementById('filter-brand').addEventListener('change', renderRegistry);
        document.getElementById('filter-tech').addEventListener('change', renderRegistry);

        document.getElementById('checkin-form').addEventListener('submit', function(e) {
            e.preventDefault();
            handleCheckInSubmit();
        });

        document.getElementById('edit-ticket-form').addEventListener('submit', function(e) {
            e.preventDefault();
            handleEditSubmit();
        });

        document.getElementById('add-staff-form').addEventListener('submit', function(e) {
            e.preventDefault();
            handleAddStaffSubmit();
        });

        document.getElementById('admin-auth-form').addEventListener('submit', function(e) {
            e.preventDefault();
            handleAdminLogin();
        });

        document.getElementById('cust-lookup-form').addEventListener('submit', function(e) {
            e.preventDefault();
            handleCustomerLookup();
        });

        document.getElementById('admin-escape-form').addEventListener('submit', function(e) {
            e.preventDefault();
            handleEscapeVerification();
        });

        document.getElementById('company-logo-input').addEventListener('change', function(e) {
            handleLogoUpload(e);
        });

        document.getElementById('btn-print-gate-pass').addEventListener('click', function() {
            if (currentActiveTicket) {
                triggerPrintView(currentActiveTicket);
            }
        });

        document.getElementById('btn-edit-ticket').addEventListener('click', function() {
            if (currentActiveTicket) {
                openEditModal(currentActiveTicket);
            }
        });
    }

    // View Switcher Router
    function switchView(viewId, navElement = null) {
        if (currentMode === "client" && viewId !== "customer-view") {
            viewId = "customer-view";
        }

        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        if (navElement) {
            navElement.classList.add('active');
        } else {
            const item = document.querySelector(`.nav-item[data-view="${viewId}"]`);
            if (item) item.classList.add('active');
        }

        document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active-view'));
        const activeSection = document.getElementById(viewId);
        if (activeSection) {
            activeSection.classList.add('active-view');
        }

        if (viewId === 'dashboard-view') {
            renderDashboard();
        } else if (viewId === 'registry-view') {
            renderRegistry();
        } else if (viewId === 'settings-view') {
            checkAdminState();
        } else if (viewId === 'checkin-view') {
            const dtField = document.getElementById('intake-date-display');
            if (dtField) dtField.value = formatDateTime(new Date().toISOString());
        }
    }

    // Format ISO string to readable string
    function formatDateTime(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        const pad = (num) => String(num).padStart(2, '0');
        
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // Toast Alert
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor = type === 'success' ? 'var(--status-ready-text)' : 'var(--primary)';
        
        let iconSvg = '<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>';
        if (type === 'success') {
            iconSvg = '<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--status-ready-text);fill:none;stroke-width:2;"><path d="M5 13l4 4L19 7"/></svg>';
        }
        
        toast.innerHTML = `${iconSvg}<span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- DASHBOARD CALCULATOR & RENDERER ---
    function renderDashboard() {
        const activeRepairsCount = tickets.filter(t => t.status !== 'Collected' && t.status !== 'Cancelled').length;
        const readyRepairsCount = tickets.filter(t => t.status === 'Ready for Collection').length;
        const completedCount = tickets.filter(t => t.status === 'Collected').length;
        
        const finishedTickets = tickets.filter(t => t.fixedDate && t.broughtInDate);
        let totalHours = 0;
        finishedTickets.forEach(t => {
            const start = new Date(t.broughtInDate);
            const end = new Date(t.fixedDate);
            totalHours += (end - start) / (1000 * 60 * 60);
        });
        const avgTurnaround = finishedTickets.length > 0 ? (totalHours / finishedTickets.length).toFixed(1) : '0.0';

        document.getElementById('kpi-active-repairs').textContent = activeRepairsCount;
        document.getElementById('kpi-ready-repairs').textContent = readyRepairsCount;
        document.getElementById('kpi-completed-repairs').textContent = completedCount;
        document.getElementById('kpi-turnaround-time').textContent = `${avgTurnaround} hrs`;

        const activityList = document.getElementById('dashboard-activity-list');
        activityList.innerHTML = '';

        let activities = [];
        tickets.forEach(ticket => {
            ticket.history.forEach(h => {
                activities.push({
                    ticketId: ticket.id,
                    inverter: `${ticket.inverter.brand} (${ticket.inverter.model})`,
                    timestamp: h.timestamp,
                    action: h.action
                });
            });
        });

        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestActivities = activities.slice(0, 8);

        if (latestActivities.length === 0) {
            activityList.innerHTML = '<div class="activity-desc" style="text-align:center; padding: 2.5rem 0;">No operational history logged yet.</div>';
        } else {
            latestActivities.forEach(act => {
                let strokeColor = 'var(--text-muted)';
                let dotIcon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>';
                
                if (act.action.includes('registered') || act.action.includes('Intake')) {
                    strokeColor = 'var(--accent-blue)';
                    dotIcon = '<svg viewBox="0 0 24 24"><path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
                } else if (act.action.includes('Ready')) {
                    strokeColor = 'var(--status-ready-text)';
                    dotIcon = '<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/></svg>';
                } else if (act.action.includes('released') || act.action.includes('Collected')) {
                    strokeColor = 'var(--status-collected-text)';
                    dotIcon = '<svg viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>';
                }

                activityList.innerHTML += `
                    <div class="activity-item">
                        <div class="activity-dot" style="border-color:${strokeColor}; color:${strokeColor};">
                            ${dotIcon}
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">${act.ticketId} - ${act.inverter}</div>
                            <div class="activity-desc">${act.action}</div>
                            <div class="activity-time">${formatDateTime(act.timestamp)}</div>
                        </div>
                    </div>
                `;
            });
        }

        renderBrandChart();
    }

    function renderBrandChart() {
        const totalTickets = tickets.length;
        document.getElementById('chart-total-repairs-count').textContent = totalTickets;
        
        const brandCounts = {};
        tickets.forEach(t => {
            const b = t.inverter.brand;
            brandCounts[b] = (brandCounts[b] || 0) + 1;
        });

        const brandColors = {
            'Victron Energy': '#4f46e5',
            'Growatt': '#f59e0b',
            'Luminous': '#0ea5e9',
            'SMA': '#10b981',
            'Schneider Electric': '#8b5cf6',
            'Fronius': '#ec4899',
            'Sunsynk': '#3b82f6',
            'Deye': '#14b8a6',
            'Other': '#64748b'
        };

        const legendContainer = document.getElementById('brand-chart-legend');
        legendContainer.innerHTML = '';

        if (totalTickets === 0) {
            legendContainer.innerHTML = '<div class="legend-lbl" style="justify-content:center; width:100%; text-align:center;">No records registered.</div>';
            document.getElementById('brand-chart-segment').setAttribute('stroke-dasharray', '0 100');
            return;
        }

        const sortedBrands = Object.keys(brandCounts).sort((a,b) => brandCounts[b] - brandCounts[a]);
        sortedBrands.forEach((brand, idx) => {
            const count = brandCounts[brand];
            const pct = (count / totalTickets) * 100;
            const color = brandColors[brand] || '#64748b';
            
            legendContainer.innerHTML += `
                <div class="legend-item">
                    <span class="legend-lbl">
                        <span class="legend-color" style="background:${color};"></span>
                        ${brand}
                    </span>
                    <span class="legend-val">${count} (${pct.toFixed(0)}%)</span>
                </div>
            `;

            if (idx === 0) {
                const strokeDashString = `${pct.toFixed(0)} ${100 - pct.toFixed(0)}`;
                document.getElementById('brand-chart-segment').setAttribute('stroke', color);
                document.getElementById('brand-chart-segment').setAttribute('stroke-dasharray', strokeDashString);
            }
        });
    }

    // --- REGISTRY LIST RENDERER ---
    function renderRegistry() {
        const query = document.getElementById('search-query').value.toLowerCase().trim();
        const statusFilter = document.getElementById('filter-status').value;
        const brandFilter = document.getElementById('filter-brand').value;
        const techFilter = document.getElementById('filter-tech').value;
        
        const tableBody = document.getElementById('repairs-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';

        const filtered = tickets.filter(t => {
            const matchQuery = !query || 
                t.id.toLowerCase().includes(query) ||
                t.customer.name.toLowerCase().includes(query) ||
                t.customer.phone.toLowerCase().includes(query) ||
                t.inverter.serial.toLowerCase().includes(query) ||
                t.inverter.model.toLowerCase().includes(query);
            
            const matchStatus = !statusFilter || t.status === statusFilter;
            const matchBrand = !brandFilter || t.inverter.brand === brandFilter;
            const matchTech = !techFilter || t.technician === techFilter;

            return matchQuery && matchStatus && matchBrand && matchTech;
        });

        filtered.sort((a, b) => b.id.localeCompare(a.id));

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:3.5rem 0; color:var(--text-muted);">
                        No inverter repairs registered matching the filters.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(t => {
            let badgeClass = 'status-checked-in';
            if (t.status === 'In Progress') badgeClass = 'status-progress';
            if (t.status === 'Ready for Collection') badgeClass = 'status-ready';
            if (t.status === 'Collected') badgeClass = 'status-collected';
            if (t.status === 'Cancelled') badgeClass = 'status-cancelled';

            tableBody.innerHTML += `
                <tr>
                    <td style="font-weight:700; color:#fff;">${t.id}</td>
                    <td>
                        <div style="font-weight:600; color:#fff;">${t.inverter.brand}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${t.inverter.model} | Sn: ${t.inverter.serial}</div>
                    </td>
                    <td>
                        <div style="font-weight:600; color:#fff;">${t.customer.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${t.customer.phone}</div>
                    </td>
                    <td style="font-size:0.85rem;">
                        <div>Brought in: ${formatDateTime(t.broughtInDate)}</div>
                        <div style="color:var(--text-muted);">By: ${t.registeredBy}</div>
                    </td>
                    <td>
                        <span class="status-badge ${badgeClass}">${t.status}</span>
                    </td>
                    <td style="font-weight:500;">
                        ${t.technician ? t.technician : '<span style="color:var(--text-muted); font-style:italic;">Unassigned</span>'}
                    </td>
                    <td style="text-align:right;">
                        <button class="btn btn-icon" title="View Details" onclick="app.showTicketDetails('${t.id}')">
                            <svg viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                        <button class="btn btn-icon" title="Update Repair Status" onclick="app.openEditModal('${t.id}')">
                            <svg viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    // --- CHECK-IN HANDLER ---
    function handleCheckInSubmit() {
        if (staff.length === 0) {
            alert("Administrative Lock: No staff members have been registered in the system settings yet. An administrator must register staff before checking in devices.");
            switchView('settings-view');
            return;
        }

        const name = document.getElementById('cust-name').value.trim();
        const phone = document.getElementById('cust-phone').value.trim();
        const email = document.getElementById('cust-email').value.trim();
        const brand = document.getElementById('inv-brand').value;
        const model = document.getElementById('inv-model').value.trim();
        const serial = document.getElementById('inv-serial').value.trim();
        const capacity = document.getElementById('inv-capacity').value.trim();
        const staffName = document.getElementById('intake-staff').value;
        const fault = document.getElementById('intake-fault').value.trim();

        // Increment ID INV-2026-0001
        let lastIdNum = 0;
        tickets.forEach(t => {
            const parts = t.id.split('-');
            if (parts.length === 3) {
                const num = parseInt(parts[2]);
                if (!isNaN(num) && num > lastIdNum) lastIdNum = num;
            }
        });
        const nextIdNum = lastIdNum + 1;
        const ticketId = `INV-2026-${String(nextIdNum).padStart(4, '0')}`;
        const nowIsoString = new Date().toISOString();

        const newTicket = {
            id: ticketId,
            customer: { name, phone, email },
            inverter: { brand, model, serial, capacity },
            status: "Checked In",
            broughtInDate: nowIsoString,
            registeredBy: staffName,
            reportedFault: fault,
            technician: "",
            diagnosticNotes: "",
            fixedDate: null,
            collectedDate: null,
            collectedBy: "",
            laborCost: 0,
            partsCost: 0,
            history: [
                { timestamp: nowIsoString, action: `Ticket registered by receptionist ${staffName} (Intake).` }
            ]
        };

        tickets.push(newTicket);
        saveData();
        populateDropdowns();
        
        document.getElementById('checkin-form').reset();
        showToast(`Inverter Checked In successfully! ID: ${ticketId}`, 'success');
        
        // Open Notification prompt modal automatically
        openNotificationModal(newTicket);
        
        switchView('registry-view');
    }

    // --- VIEW DETAILS MODAL ---
    function showTicketDetails(ticketId) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        currentActiveTicket = ticket;

        document.getElementById('modal-ticket-id').textContent = `Ticket Details - ${ticket.id}`;
        document.getElementById('det-cust-name').textContent = ticket.customer.name;
        document.getElementById('det-cust-phone').textContent = ticket.customer.phone;
        document.getElementById('det-cust-email').textContent = ticket.customer.email || 'N/A';
        
        document.getElementById('det-inv-brand').textContent = ticket.inverter.brand;
        document.getElementById('det-inv-model').textContent = ticket.inverter.model;
        document.getElementById('det-inv-serial').textContent = ticket.inverter.serial;
        document.getElementById('det-inv-capacity').textContent = ticket.inverter.capacity;

        document.getElementById('det-brought-in').textContent = formatDateTime(ticket.broughtInDate);
        document.getElementById('det-registered-by').textContent = ticket.registeredBy;
        document.getElementById('det-reported-fault').textContent = ticket.reportedFault;

        let badgeClass = 'status-checked-in';
        if (ticket.status === 'In Progress') badgeClass = 'status-progress';
        if (ticket.status === 'Ready for Collection') badgeClass = 'status-ready';
        if (ticket.status === 'Collected') badgeClass = 'status-collected';
        if (ticket.status === 'Cancelled') badgeClass = 'status-cancelled';
        
        document.getElementById('det-status-badge').className = `status-badge ${badgeClass}`;
        document.getElementById('det-status-badge').textContent = ticket.status;

        document.getElementById('det-technician').textContent = ticket.technician || 'Not assigned';
        document.getElementById('det-fixed-date').textContent = formatDateTime(ticket.fixedDate);
        document.getElementById('det-diagnostic-notes').textContent = ticket.diagnosticNotes || 'No notes added.';

        document.getElementById('det-labor-cost').textContent = `₦${Number(ticket.laborCost).toFixed(2)}`;
        document.getElementById('det-parts-cost').textContent = `₦${Number(ticket.partsCost).toFixed(2)}`;
        const total = Number(ticket.laborCost) + Number(ticket.partsCost);
        document.getElementById('det-total-cost').textContent = `₦${total.toFixed(2)}`;

        const collectionSec = document.getElementById('det-collection-section');
        if (ticket.status === 'Collected') {
            collectionSec.style.display = 'block';
            document.getElementById('det-collected-date').textContent = formatDateTime(ticket.collectedDate);
            document.getElementById('det-collected-by').textContent = ticket.collectedBy || 'Customer';
        } else {
            collectionSec.style.display = 'none';
        }

        const timeline = document.getElementById('det-audit-timeline');
        timeline.innerHTML = '';
        const sortedHistory = [...ticket.history].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        sortedHistory.forEach(h => {
            timeline.innerHTML += `
                <div class="timeline-event">
                    <div class="timeline-event-dot"></div>
                    <div class="timeline-event-content">
                        <div class="timeline-event-desc">${h.action}</div>
                        <div class="timeline-event-time">${formatDateTime(h.timestamp)}</div>
                    </div>
                </div>
            `;
        });

        openModal('details-modal');
    }

    // --- UPDATE REPAIR ---
    function openEditModal(ticketIdOrObj) {
        let ticket = ticketIdOrObj;
        if (typeof ticketIdOrObj === 'string') {
            ticket = tickets.find(t => t.id === ticketIdOrObj);
        }
        if (!ticket) return;

        closeModal('details-modal');

        document.getElementById('edit-modal-title').textContent = `Update Ticket - ${ticket.id}`;
        document.getElementById('edit-ticket-idx').value = ticket.id;

        document.getElementById('edit-status').value = ticket.status;
        document.getElementById('edit-tech').value = ticket.technician;
        document.getElementById('edit-notes').value = ticket.diagnosticNotes;
        document.getElementById('edit-labor-cost').value = ticket.laborCost || '';
        document.getElementById('edit-parts-cost').value = ticket.partsCost || '';
        document.getElementById('edit-collected-by-name').value = ticket.collectedBy || '';
        document.getElementById('edit-diagnosed-by').value = ''; 

        handleEditStatusChange(ticket.status);
        openModal('edit-modal');
    }

    function handleEditStatusChange(status) {
        const collectedGroup = document.getElementById('edit-collected-group');
        if (status === 'Collected') {
            collectedGroup.style.display = 'block';
            document.getElementById('edit-collected-by-name').setAttribute('required', 'true');
        } else {
            collectedGroup.style.display = 'none';
            document.getElementById('edit-collected-by-name').removeAttribute('required');
        }
    }

    function handleEditSubmit() {
        const ticketId = document.getElementById('edit-ticket-idx').value;
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const oldStatus = ticket.status;
        const oldTech = ticket.technician;
        
        const newStatus = document.getElementById('edit-status').value;
        const newTech = document.getElementById('edit-tech').value;
        const diagNotes = document.getElementById('edit-notes').value.trim();
        const labor = parseFloat(document.getElementById('edit-labor-cost').value) || 0;
        const parts = parseFloat(document.getElementById('edit-parts-cost').value) || 0;
        const operatorName = document.getElementById('edit-diagnosed-by').value;
        const collectedBy = document.getElementById('edit-collected-by-name').value.trim();

        const nowIsoString = new Date().toISOString();
        let historyLogs = [];

        if (oldStatus !== newStatus) {
            historyLogs.push(`Status changed from "${oldStatus}" to "${newStatus}" by ${operatorName}.`);
            if (newStatus === 'Ready for Collection') {
                ticket.fixedDate = nowIsoString;
            } else if (newStatus === 'Collected') {
                ticket.collectedDate = nowIsoString;
                ticket.collectedBy = collectedBy;
                historyLogs.push(`Device released to customer representative: ${collectedBy}.`);
            } else {
                ticket.fixedDate = null;
                ticket.collectedDate = null;
                ticket.collectedBy = "";
            }
        }

        if (oldTech !== newTech) {
            historyLogs.push(newTech ? `Technician "${newTech}" assigned to ticket by ${operatorName}.` : `Technician unassigned by ${operatorName}.`);
        }

        if (diagNotes && ticket.diagnosticNotes !== diagNotes) {
            historyLogs.push(`Technical diagnostic notes updated by ${operatorName}.`);
        }

        if (ticket.laborCost !== labor || ticket.partsCost !== parts) {
            historyLogs.push(`Financial billing updated. Labor: ₦${labor.toFixed(2)}, Parts: ₦${parts.toFixed(2)}.`);
        }

        // Apply
        ticket.status = newStatus;
        ticket.technician = newTech;
        ticket.diagnosticNotes = diagNotes;
        ticket.laborCost = labor;
        ticket.partsCost = parts;
        
        if (historyLogs.length === 0) {
            historyLogs.push(`Ticket verified and updated by ${operatorName}.`);
        }

        historyLogs.forEach(log => {
            ticket.history.push({ timestamp: nowIsoString, action: log });
        });

        saveData();
        closeModal('edit-modal');
        showToast(`Ticket ${ticketId} updated.`, 'success');
        
        renderDashboard();
        renderRegistry();

        // Open Client notification sender modal
        openNotificationModal(ticket);
    }

    // --- CLIENT NOTIFICATION DISPATCH TEMPLATE ---
    function openNotificationModal(ticket) {
        const totalCost = Number(ticket.laborCost) + Number(ticket.partsCost);
        let detailNote = ticket.reportedFault;
        if (ticket.status === 'Ready for Collection' || ticket.status === 'Collected') {
            detailNote = ticket.diagnosticNotes || 'Repairs completed successfully.';
        } else if (ticket.status === 'In Progress') {
            detailNote = ticket.diagnosticNotes || 'Unit is on the service bench undergoing diagnostics and testing.';
        }

        // Build pre-formatted client message (including track parameter url)
        const hostUrl = window.location.origin + window.location.pathname;
        const trackingLink = `${hostUrl}?track=${ticket.id}&phone=${ticket.customer.phone}`;

        const rawMessage = `🛠️ *${companyName} Service Update*\n\nHello *${ticket.customer.name}*,\nYour inverter repair status has been updated:\n\n• *Ticket Ref:* ${ticket.id}\n• *Inverter:* ${ticket.inverter.brand} ${ticket.inverter.model}\n• *Current Stage:* ${ticket.status}\n• *Service Update:* ${detailNote}\n• *Total Bill:* ₦${totalCost.toFixed(2)}\n\n🌐 *Track Online:* ${trackingLink}\n\nThank you for choosing ${companyName}!`;

        // Update modal DOM
        document.getElementById('notification-ticket-ref').textContent = `Send Notification - ${ticket.id}`;
        document.getElementById('notification-message-preview').textContent = rawMessage;

        // Clean and format phone number internationally to force correct chat loading
        const cleanPhone = formatWhatsAppNumber(ticket.customer.phone);

        // Bind WhatsApp click using the standard api.whatsapp.com/send endpoint (highly reliable)
        const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(rawMessage)}`;
        document.getElementById('btn-dispatch-whatsapp').href = waLink;

        // Bind Email Mailto click
        const emailSubject = `Inverter Repair Update: ${ticket.id} - ${ticket.status}`;
        const textForEmail = rawMessage.replace(/\*/g, '');
        const mailLink = `mailto:${ticket.customer.email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(textForEmail)}`;
        document.getElementById('btn-dispatch-email').href = mailLink;

        openModal('notification-modal');
    }

    // --- STAFF DIRECTORY RENDERER ---
    function renderStaffList() {
        const tbody = document.getElementById('staff-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (staff.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No staff registered yet.</td></tr>';
            return;
        }

        staff.forEach(member => {
            const isRegisteredInTickets = tickets.some(t => t.registeredBy === member.name || t.technician === member.name);
            const deleteBtn = isRegisteredInTickets 
                ? `<span style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Active (Locked)</span>`
                : `<button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size:0.75rem; border-color:#f87171; color:#f87171;" onclick="app.removeStaff('${member.id}')">Delete</button>`;

            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:600; color:#fff;">${member.name}</td>
                    <td>
                        <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">${member.role}</span>
                    </td>
                    <td style="text-align:right;">
                        ${deleteBtn}
                    </td>
                </tr>
            `;
        });
    }

    function handleAddStaffSubmit() {
        const name = document.getElementById('staff-name').value.trim();
        const role = document.getElementById('staff-role').value;

        const exists = staff.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            alert(`Error: Staff member "${name}" is already registered.`);
            return;
        }

        const id = `staff-${Date.now()}`;
        staff.push({ id, name, role });
        saveData();
        populateDropdowns();
        renderStaffList();
        
        document.getElementById('add-staff-form').reset();
        showToast(`Registered staff member "${name}".`, 'success');
    }

    function removeStaff(staffId) {
        const member = staff.find(s => s.id === staffId);
        if (!member) return;

        if (confirm(`Are you sure you want to remove staff member: ${member.name}?`)) {
            staff = staff.filter(s => s.id !== staffId);
            saveData();
            populateDropdowns();
            renderStaffList();
            showToast(`Staff member removed.`, 'info');
        }
    }

    // --- CLIENT PORTAL LOOKUP LOGIC ---
    function handleCustomerLookup() {
        const btnQuery = document.querySelector('#cust-lookup-form button[type="submit"]');
        const originalBtnText = btnQuery ? btnQuery.innerHTML : "Query Status";
        
        if (btnQuery) {
            btnQuery.disabled = true;
            btnQuery.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width: 16px; height: 16px; animation: rotate 2s linear infinite; stroke: currentColor; fill: none; stroke-width: 5; margin-right: 8px; display: inline-block; vertical-align: middle;"><circle cx="25" cy="25" r="20" stroke-dasharray="90, 150" stroke-dashoffset="0" stroke-linecap="round"></circle></svg> Querying...`;
        }

        const ticketId = document.getElementById('cust-track-id').value.trim().toUpperCase();
        const phone = document.getElementById('cust-track-phone').value.trim();
        const errorBanner = document.getElementById('cust-lookup-error');
        const statusBoard = document.getElementById('cust-status-board');
        
        // Fetch latest online data first before searching
        loadOnlineData(() => {
            // Restore button state
            if (btnQuery) {
                btnQuery.disabled = false;
                btnQuery.innerHTML = originalBtnText;
            }

            const ticket = tickets.find(t => t.id.toUpperCase() === ticketId && t.customer.phone.replace(/[^0-9]/g, '').includes(phone.replace(/[^0-9]/g, '')));
            
            if (!ticket) {
                errorBanner.style.display = 'block';
                statusBoard.style.display = 'none';
                document.getElementById('cust-whatsapp-float').style.display = 'none';
                return;
            }

            errorBanner.style.display = 'none';

            // Render customer status board details
            document.getElementById('cust-board-ticket-id').textContent = ticket.id;
            document.getElementById('cust-board-inv-name').textContent = `${ticket.inverter.brand} ${ticket.inverter.model}`;
            document.getElementById('cust-board-inv-specs').textContent = `Serial: ${ticket.inverter.serial} | Capacity: ${ticket.inverter.capacity}`;
            document.getElementById('cust-board-brought-in').textContent = formatDateTime(ticket.broughtInDate);
            
            const totalCost = Number(ticket.laborCost) + Number(ticket.partsCost);
            document.getElementById('cust-board-total-cost').textContent = totalCost > 0 ? `₦${totalCost.toFixed(2)}` : 'Quotation Pending';

            if (ticket.status === 'Checked In') {
                document.getElementById('cust-board-notes').textContent = "Device received at intake. Awaiting diagnostic engineering inspection.";
            } else if (ticket.status === 'In Progress') {
                document.getElementById('cust-board-notes').textContent = ticket.diagnosticNotes || "Inverter is currently on the diagnostic workbench under active repair.";
            } else if (ticket.status === 'Ready for Collection') {
                document.getElementById('cust-board-notes').textContent = `Repair Completed! Replaced parts have been tested successfully. The unit is ready for pick-up. Final charges: ₦${totalCost.toFixed(2)}. ${ticket.diagnosticNotes ? '\nResolution: ' + ticket.diagnosticNotes : ''}`;
            } else if (ticket.status === 'Collected') {
                document.getElementById('cust-board-notes').textContent = `Handover Complete. Released on ${formatDateTime(ticket.collectedDate)} to ${ticket.collectedBy || 'Customer'}. Thank you for your business.`;
            } else if (ticket.status === 'Cancelled') {
                document.getElementById('cust-board-notes').textContent = "Repair order has been cancelled. Please contact the front service desk.";
            }

            let badgeClass = 'status-checked-in';
            if (ticket.status === 'In Progress') badgeClass = 'status-progress';
            if (ticket.status === 'Ready for Collection') badgeClass = 'status-ready';
            if (ticket.status === 'Collected') badgeClass = 'status-collected';
            if (ticket.status === 'Cancelled') badgeClass = 'status-cancelled';
            document.getElementById('cust-board-status-badge').className = `status-badge ${badgeClass}`;
            document.getElementById('cust-board-status-badge').textContent = ticket.status;

            const steps = [
                document.getElementById('step-0'),
                document.getElementById('step-1'),
                document.getElementById('step-2'),
                document.getElementById('step-3')
            ];
            steps.forEach(s => {
                s.className = 'step-circle';
            });

            const fill = document.getElementById('cust-pipeline-fill');
            
            if (ticket.status === 'Checked In') {
                steps[0].classList.add('active');
                fill.style.width = '0%';
            } else if (ticket.status === 'In Progress') {
                steps[0].classList.add('completed');
                steps[1].classList.add('active');
                fill.style.width = '33%';
            } else if (ticket.status === 'Ready for Collection') {
                steps[0].classList.add('completed');
                steps[1].classList.add('completed');
                steps[2].classList.add('active');
                fill.style.width = '66%';
            } else if (ticket.status === 'Collected') {
                steps[0].classList.add('completed');
                steps[1].classList.add('completed');
                steps[2].classList.add('completed');
                steps[3].classList.add('completed');
                fill.style.width = '100%';
            } else {
                fill.style.width = '0%'; 
            }

            // Configure and Show floating WhatsApp chat support widget
            const cleanSupportPhone = formatWhatsAppNumber(companyPhone);
            const chatMessage = `Hi, I have an enquiry regarding my inverter repair ticket: ${ticket.id}`;
            document.getElementById('cust-whatsapp-link').href = `https://api.whatsapp.com/send?phone=${cleanSupportPhone}&text=${encodeURIComponent(chatMessage)}`;
            document.getElementById('cust-whatsapp-float').style.display = 'block';

            // Switch card display
            document.getElementById('cust-search-card').style.display = 'none';
            statusBoard.style.display = 'block';
        });
    }

    // Reset customer lookup view
    function resetCustomerLookup() {
        document.getElementById('cust-lookup-form').reset();
        document.getElementById('cust-search-card').style.display = 'block';
        document.getElementById('cust-status-board').style.display = 'none';
        document.getElementById('cust-lookup-error').style.display = 'none';
        document.getElementById('cust-whatsapp-float').style.display = 'none';
    }

    // Mode toggling rules (Staff <-> Client)
    function switchToClientMode(silent = false) {
        currentMode = "client";
        localStorage.setItem('inverter_app_mode', 'client');
        
        document.body.classList.add('client-portal-active');
        
        closeModal('details-modal');
        closeModal('edit-modal');

        resetCustomerLookup();
        switchView('customer-view');
        
        if (!silent) showToast("Switched to Public Customer Portal Mode.", "info");
    }

    function openAdminEscapeGate(e) {
        if (e) e.preventDefault();
        document.getElementById('escape-pin-input').value = '';
        document.getElementById('escape-pin-error').style.display = 'none';
        openModal('admin-escape-modal');
    }

    function handleEscapeVerification() {
        const pin = document.getElementById('escape-pin-input').value;
        if (pin === adminPin) {
            closeModal('admin-escape-modal');
            currentMode = "staff";
            localStorage.setItem('inverter_app_mode', 'staff');
            
            document.body.classList.remove('client-portal-active');
            
            showToast("Authenticated. Welcome back, staff.", "success");
            switchView('dashboard-view');
        } else {
            document.getElementById('escape-pin-error').style.display = 'block';
        }
    }

    // --- SETTINGS ADMIN GATE ---
    function checkAdminState() {
        const authPanel = document.getElementById('admin-auth-gate');
        const unlockedPanel = document.getElementById('admin-unlocked-settings');
        
        if (isAdminAuthenticated) {
            authPanel.style.display = 'none';
            unlockedPanel.style.display = 'block';
            renderStaffList();
            renderSettingsLogoPreview();
        } else {
            authPanel.style.display = 'block';
            unlockedPanel.style.display = 'none';
            document.getElementById('admin-pin-input').value = '';
        }
    }

    function handleAdminLogin() {
        const pin = document.getElementById('admin-pin-input').value;
        if (pin === adminPin) {
            isAdminAuthenticated = true;
            checkAdminState();
            showToast("Settings Panel Unlocked.", "success");
        } else {
            alert("Invalid Administrator PIN. Access Denied.");
            document.getElementById('admin-pin-input').value = '';
        }
    }

    function lockAdminSettings() {
        isAdminAuthenticated = false;
        checkAdminState();
    }

    // --- LOGO UPLOADER HANDLERS (BASE64) ---
    function handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { 
            alert("File size exceeds 2MB limit. Please upload a smaller image.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            companyLogo = e.target.result;
            saveData();
            renderBrandLogo();
            renderSettingsLogoPreview();
            showToast("Brand logo uploaded and updated.", "success");
        };
        reader.readAsDataURL(file);
    }

    function removeLogo() {
        if (confirm("Reset to default system logo?")) {
            companyLogo = "";
            saveData();
            renderBrandLogo();
            renderSettingsLogoPreview();
            showToast("Logo reset to default.", "info");
        }
    }

    function renderBrandLogo() {
        const defaultLogo = document.getElementById('default-logo-svg');
        const logoImg = document.getElementById('company-logo-img');
        
        const custDefault = document.getElementById('cust-default-logo');
        const custLogoImg = document.getElementById('cust-logo-img');

        // Apply brand names
        document.getElementById('company-name-display').textContent = companyName;
        document.getElementById('cust-company-name').textContent = companyName;
        document.getElementById('print-company-name').textContent = companyName.toUpperCase() + " SERVICE DESK";
        
        const footers = document.querySelectorAll('.print-footer-company-name');
        footers.forEach(el => el.textContent = companyName);

        if (companyLogo) {
            if (defaultLogo) defaultLogo.style.display = 'none';
            if (logoImg) {
                logoImg.src = companyLogo;
                logoImg.style.display = 'block';
            }
            
            if (custDefault) custDefault.style.display = 'none';
            if (custLogoImg) {
                custLogoImg.src = companyLogo;
                custLogoImg.style.display = 'block';
            }

            document.getElementById('print-logo-box').style.display = 'flex';
            document.getElementById('print-logo-img').src = companyLogo;
        } else {
            if (defaultLogo) defaultLogo.style.display = 'flex';
            if (logoImg) logoImg.style.display = 'none';
            
            if (custDefault) custDefault.style.display = 'flex';
            if (custLogoImg) custLogoImg.style.display = 'none';

            document.getElementById('print-logo-box').style.display = 'none';
        }
    }

    function renderSettingsLogoPreview() {
        const previewPlaceholder = document.getElementById('logo-preview-placeholder');
        const previewImg = document.getElementById('logo-preview-img');

        if (companyLogo) {
            if (previewPlaceholder) previewPlaceholder.style.display = 'none';
            if (previewImg) {
                previewImg.src = companyLogo;
                previewImg.style.display = 'block';
            }
        } else {
            if (previewPlaceholder) previewPlaceholder.style.display = 'block';
            if (previewImg) previewImg.style.display = 'none';
        }
    }

    function updateBrandAndSecurity() {
        const newName = document.getElementById('company-name-input').value.trim();
        const newPhone = document.getElementById('company-phone-input').value.trim();
        const newCountry = document.getElementById('country-code-input').value.trim();
        const newPin = document.getElementById('admin-pin-change').value.trim();

        if (!newName) {
            alert("Company Name cannot be empty.");
            return;
        }

        companyName = newName;
        companyPhone = newPhone || "2348031234567";
        companyCountryCode = newCountry || "234";
        
        if (newPin) {
            if (newPin.length < 4) {
                alert("Security PIN must be at least 4 digits.");
                return;
            }
            adminPin = newPin;
            document.getElementById('admin-pin-change').value = '';
        }

        saveData();
        renderBrandLogo();
        showToast("Configuration saved.", "success");
    }

    // --- GATE PASS PRINT GENERATOR ---
    function triggerPrintView(ticket) {
        document.getElementById('print-ticket-id').textContent = ticket.id;
        document.getElementById('print-brought-in').textContent = formatDateTime(ticket.broughtInDate);
        document.getElementById('print-registered-by').textContent = ticket.registeredBy;
        document.getElementById('print-status').textContent = ticket.status.toUpperCase();
        
        document.getElementById('print-cust-name').textContent = ticket.customer.name;
        document.getElementById('print-cust-phone').textContent = ticket.customer.phone;
        
        document.getElementById('print-inv-spec').textContent = `${ticket.inverter.brand} / ${ticket.inverter.model}`;
        document.getElementById('print-inv-serial').textContent = ticket.inverter.serial;
        document.getElementById('print-inv-capacity').textContent = ticket.inverter.capacity;
        
        document.getElementById('print-reported-fault').textContent = ticket.reportedFault;
        document.getElementById('print-resolution').textContent = ticket.diagnosticNotes || 'Diagnostics/repairs currently ongoing.';
        
        document.getElementById('print-labor-cost').textContent = `₦${Number(ticket.laborCost).toFixed(2)}`;
        document.getElementById('print-parts-cost').textContent = `₦${Number(ticket.partsCost).toFixed(2)}`;
        const total = Number(ticket.laborCost) + Number(ticket.partsCost);
        document.getElementById('print-total-cost').textContent = `₦${total.toFixed(2)}`;

        const relTitle = document.getElementById('print-signee-title');
        const docTypeTitle = document.getElementById('print-document-type');
        if (ticket.status === 'Collected') {
            relTitle.textContent = `Customer Handover: ${ticket.collectedBy}`;
            docTypeTitle.textContent = "COMPLETED REPAIR GATE PASS";
        } else {
            relTitle.textContent = "Customer Signature (Intake Verify)";
            docTypeTitle.textContent = "DEVICE INTAKE / SERVICE SLIP";
        }

        window.print();
    }

    // --- DEVELOPER / AUDIT SANDBOX CONTROLS ---
    function injectDemoData() {
        if (confirm("This will inject historical mock inverters and demo staff. Proceed?")) {
            tickets = [...DEMO_TICKETS];
            staff = [...DEMO_STAFF];
            saveData();
            populateDropdowns();
            renderDashboard();
            renderRegistry();
            renderStaffList();
            showToast("Mock data injected successfully.", "success");
        }
    }

    function wipeAllData() {
        if (confirm("Wipe all local records? This clears all staff settings, company configurations, and tickets.")) {
            tickets = [];
            staff = [];
            adminPin = DEFAULT_PIN;
            companyName = "Cravetech Power Solution";
            companyPhone = "2348031234567";
            companyCountryCode = "234";
            companyLogo = "";
            
            saveData();
            populateDropdowns();
            renderBrandLogo();
            renderDashboard();
            renderRegistry();
            renderStaffList();
            
            isAdminAuthenticated = false;
            checkAdminState();
            
            showToast("All data wiped to a fresh blank slate.", "info");
        }
    }

    // Modal helpers
    function openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        if (modalId === 'details-modal') currentActiveTicket = null;
    }

    function resetFilters() {
        document.getElementById('search-query').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-brand').value = '';
        document.getElementById('filter-tech').value = '';
        renderRegistry();
    }


    function showCheckInView() {
        switchView('checkin-view');
    }

    function showDashboardView() {
        switchView('dashboard-view');
    }

    window.addEventListener('DOMContentLoaded', init);

    return {
        showTicketDetails,
        openEditModal,
        openModal,
        closeModal,
        removeStaff,
        handleEditStatusChange,
        showCheckInView,
        showDashboardView,
        resetFilters,
        
        // Brand & Logo settings
        removeLogo,
        updateBrandAndSecurity,
        lockAdminSettings,
        
        // Mode control
        switchToClientMode,
        openAdminEscapeGate,
        resetCustomerLookup,
        
        
        // Dev operations
        injectDemoData,
        wipeAllData
    };

})();
