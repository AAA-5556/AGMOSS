document.addEventListener('DOMContentLoaded', async () => {
    // ❗ Important: Paste your API URL here.
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- Element Selectors ---
    const dashboardContainer = document.getElementById('dashboard-container');
    const adminDataBody = document.getElementById('admin-data-body');
    const loadingMessage = document.getElementById('loading-message');
    const logoutButton = document.getElementById('logout-button');
    const institutionFilter = document.getElementById('institution-filter');
    const dateFilter = document.getElementById('date-filter');
    const resetFiltersButton = document.getElementById('reset-filters');
    const exportExcelButton = document.getElementById('export-excel');

    // --- Global State ---
    let allRecords = []; // Stores all attendance records
    let memberNames = {}; // Stores member names { memberId: "FullName" }
    let institutionNames = {}; // Stores institution names { institutionId: "Username" }

    // --- 1. Authentication & Logout ---
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    if (!userData || userData.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // --- 2. Rendering Functions ---
    function renderDashboard(stats) {
        dashboardContainer.innerHTML = '';
        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <h3>${stat.name}</h3>
                <p>Total Members: <span class="highlight">${stat.memberCount}</span></p>
                <p>Last Update: <span class="highlight">${stat.lastUpdate}</span></p>
                <p>
                    Last Day's Stats: 
                    <span class="highlight present">${stat.present} Present</span> / 
                    <span class="highlight absent">${stat.absent} Absent</span>
                </p>
            `;
            dashboardContainer.appendChild(card);
            // Also populate the institutionNames map for later use
            institutionNames[stat.id] = stat.name;
        });
        populateFilters(); // Populate the dropdown after getting names
    }

    function renderTable(records) {
        adminDataBody.innerHTML = '';
        if (records.length === 0) {
            adminDataBody.innerHTML = '<tr><td colspan="4">No records found matching your criteria.</td></tr>';
            return;
        }
        records.forEach(record => {
            const row = document.createElement('tr');
            const memberName = memberNames[record.memberId] || `(ID: ${record.memberId})`;
            const instName = institutionNames[record.institutionId] || `(ID: ${record.institutionId})`;
            
            row.innerHTML = `
                <td>${instName}</td>
                <td>${memberName}</td>
                <td>${record.date}</td>
                <td>${record.status}</td>
            `;
            adminDataBody.appendChild(row);
        });
    }

    // --- 3. Data Fetching ---
    async function initializeAdminPanel() {
        loadingMessage.textContent = 'Loading stats and reports...';
        try {
            // Fetch dashboard stats, all attendance records, and all members in parallel
            const [dashboardResult, adminDataResult, ...memberResults] = await Promise.all([
                fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardStats' }) }).then(res => res.json()),
                fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminData' }) }).then(res => res.json()),
                // Assuming institutions 1 through 5 exist
                ...[1, 2, 3, 4, 5].map(id => 
                    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMembers', payload: { institutionId: id } }) }).then(res => res.json())
                )
            ]);

            // Process dashboard data
            if (dashboardResult.status === 'success') {
                renderDashboard(dashboardResult.data);
            } else {
                dashboardContainer.innerHTML = '<p>Error loading dashboard.</p>';
            }

            // Process member names into a map for easy lookup
            memberResults.forEach(res => {
                if (res.status === 'success') {
                    res.data.forEach(member => {
                        memberNames[member.memberId] = member.fullName;
                    });
                }
            });

            // Process and render the main attendance table
            if (adminDataResult.status === 'success') {
                allRecords = adminDataResult.data.reverse(); // Show newest first
                renderTable(allRecords);
            } else {
                adminDataBody.innerHTML = '<tr><td colspan="4">Error loading reports.</td></tr>';
            }
            
            loadingMessage.style.display = 'none';

        } catch (error) {
            console.error('Error initializing admin panel:', error);
            loadingMessage.textContent = 'Error connecting to the server.';
        }
    }

    // --- 4. Filtering Logic ---
    function populateFilters() {
        // This is now called within renderDashboard
        Object.keys(institutionNames).forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = institutionNames[id];
            institutionFilter.appendChild(option);
        });
    }

    function applyFilters() {
        let filteredRecords = [...allRecords];

        const selectedInstitution = institutionFilter.value;
        if (selectedInstitution !== 'all') {
            filteredRecords = filteredRecords.filter(record => record.institutionId == selectedInstitution);
        }

        const selectedDate = dateFilter.value;
        if (selectedDate) {
            const persianDate = new Date(selectedDate).toLocaleDateString('fa-IR');
            filteredRecords = filteredRecords.filter(record => record.date === persianDate);
        }

        renderTable(filteredRecords);
    }

    institutionFilter.addEventListener('change', applyFilters);
    dateFilter.addEventListener('change', applyFilters);

    resetFiltersButton.addEventListener('click', () => {
        institutionFilter.value = 'all';
        dateFilter.value = '';
        renderTable(allRecords);
    });

    // --- 5. Excel Export ---
    exportExcelButton.addEventListener('click', () => {
        const tableRows = adminDataBody.querySelectorAll('tr');
        if (tableRows.length === 0 || tableRows[0].querySelector('td[colspan="4"]')) {
            alert("There is no data to export.");
            return;
        }

        const dataToExport = Array.from(tableRows).map(row => {
            const cells = row.querySelectorAll('td');
            return {
                "Institution": cells[0].textContent,
                "Member Name": cells[1].textContent,
                "Date": cells[2].textContent,
                "Status": cells[3].textContent,
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
        XLSX.writeFile(workbook, "AttendanceReport.xlsx");
    });

    // --- Initial Call ---
    initializeAdminPanel();
});
