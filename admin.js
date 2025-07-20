document.addEventListener('DOMContentLoaded', async () => {
    // ❗ Important: Paste the API URL you got from Google Script here.
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    const adminDataBody = document.getElementById('admin-data-body');
    const loadingMessage = document.getElementById('loading-message');
    const logoutButton = document.getElementById('logout-button');
    const institutionFilter = document.getElementById('institution-filter');
    const dateFilter = document.getElementById('date-filter');
    const resetFiltersButton = document.getElementById('reset-filters');
    const exportExcelButton = document.getElementById('export-excel');

    let allRecords = []; // To store all fetched records
    let memberNames = {}; // To store member names { memberId: "FullName" }
    let institutionNames = {}; // To store institution names { institutionId: "Username" }

    // --- 1. Authentication Check ---
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    if (!userData || userData.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    // --- 2. Logout ---
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // --- 3. Fetch All Data ---
    async function fetchAllData() {
        try {
            // A. Fetch all attendance records
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'getAdminData' })
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error('Failed to fetch admin data');
            allRecords = result.data;
            
            // B. Fetch all members from all institutions to get their names
            // Note: In a real-world app with many institutions, this would be optimized.
            const memberPromises = [];
            // Assuming we have users user1 to user5 with IDs 1 to 5 from our Google Sheet.
            const allUsers = [ // We need a way to get user info. For now, we hardcode it.
                { username: 'user1', institutionId: 1 }, { username: 'user2', institutionId: 2 },
                { username: 'user3', institutionId: 3 }, { username: 'user4', institutionId: 4 },
                { username: 'user5', institutionId: 5 }
            ];

            allUsers.forEach(user => {
                institutionNames[user.institutionId] = user.username; // Store institution name
                const memberPromise = fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'getMembers', payload: { institutionId: user.institutionId } })
                }).then(res => res.json());
                memberPromises.push(memberPromise);
            });

            const memberResults = await Promise.all(memberPromises);
            memberResults.forEach(res => {
                if (res.status === 'success') {
                    res.data.forEach(member => {
                        memberNames[member.memberId] = member.fullName;
                    });
                }
            });

            // C. Populate filters and render the table
            populateFilters();
            renderTable(allRecords);
            loadingMessage.style.display = 'none';

        } catch (error) {
            console.error('Error fetching all data:', error);
            loadingMessage.textContent = 'خطا در بارگذاری اطلاعات.';
        }
    }

    // --- 4. Render Table ---
    function renderTable(records) {
        adminDataBody.innerHTML = '';
        if (records.length === 0) {
            adminDataBody.innerHTML = '<tr><td colspan="4">هیچ رکوردی برای نمایش یافت نشد.</td></tr>';
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

    // --- 5. Filtering ---
    function populateFilters() {
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

        const selectedDate = dateFilter.value; // Date in YYYY-MM-DD format
        if (selectedDate) {
            // Convert to Persian date string for comparison
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
    
    // --- 6. Excel Export ---
    exportExcelButton.addEventListener('click', () => {
        const rows = adminDataBody.querySelectorAll('tr');
        const dataToExport = [];
        
        if(rows.length > 0 && !rows[0].querySelector('td[colspan="4"]')) {
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                dataToExport.push({
                    "موسسه": cells[0].textContent,
                    "نام عضو": cells[1].textContent,
                    "تاریخ": cells[2].textContent,
                    "وضعیت": cells[3].textContent,
                });
            });
        }

        if(dataToExport.length === 0) {
            alert("داده ای برای خروجی گرفتن وجود ندارد.");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش حضور و غیاب");
        XLSX.writeFile(workbook, "AttendanceReport.xlsx");
    });

    // --- Initial Call ---
    fetchAllData();
});
