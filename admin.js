document.addEventListener('DOMContentLoaded', async () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- شناسایی عناصر صفحه ---
    const dashboardContainer = document.getElementById('dashboard-container');
    const adminDataBody = document.getElementById('admin-data-body');
    const loadingMessage = document.getElementById('loading-message');
    const logoutButton = document.getElementById('logout-button');
    const institutionFilter = document.getElementById('institution-filter');
    const dateFilter = document.getElementById('date-filter');
    const resetFiltersButton = document.getElementById('reset-filters');
    const exportExcelButton = document.getElementById('export-excel');

    // --- متغیرهای سراسری برای نگهداری داده‌ها ---
    let allRecords = []; 
    let memberNames = {};
    let institutionNames = {};

    // --- ۱. بررسی هویت کاربر و خروج ---
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    if (!userData || userData.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // --- ۲. توابع مربوط به نمایش اطلاعات ---
    function renderDashboard(stats) {
        dashboardContainer.innerHTML = '';
        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <h3>${stat.name}</h3>
                <p>تعداد کل اعضا: <span class="highlight">${stat.memberCount}</span></p>
                <p>آخرین بروزرسانی: <span class="highlight">${stat.lastUpdate}</span></p>
                <p>
                    آمار آخرین روز: 
                    <span class="highlight present">${stat.present} حاضر</span> / 
                    <span class="highlight absent">${stat.absent} غایب</span>
                </p>
            `;
            dashboardContainer.appendChild(card);
            institutionNames[stat.id] = stat.name;
        });
        populateFilters();
    }

    function renderTable(records) {
        adminDataBody.innerHTML = '';
        if (records.length === 0) {
            adminDataBody.innerHTML = '<tr><td colspan="4">رکوردی مطابق با فیلتر شما یافت نشد.</td></tr>';
            return;
        }
        records.forEach(record => {
            const row = document.createElement('tr');
            const memberName = memberNames[record.memberId] || `(شناسه: ${record.memberId})`;
            const instName = institutionNames[record.institutionId] || `(شناسه: ${record.institutionId})`;
            
            row.innerHTML = `
                <td>${instName}</td>
                <td>${memberName}</td>
                <td>${record.date}</td>
                <td>${record.status}</td>
            `;
            adminDataBody.appendChild(row);
        });
    }

    // --- ۳. دریافت داده‌ها از سرور ---
    async function initializeAdminPanel() {
        loadingMessage.textContent = 'در حال بارگذاری آمار و گزارش‌ها...';
        try {
            const [dashboardResult, adminDataResult, ...memberResults] = await Promise.all([
                fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardStats' }) }).then(res => res.json()),
                fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminData' }) }).then(res => res.json()),
                ...[1, 2, 3, 4, 5].map(id => 
                    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMembers', payload: { institutionId: id } }) }).then(res => res.json())
                )
            ]);

            if (dashboardResult.status === 'success') {
                renderDashboard(dashboardResult.data);
            }

            memberResults.forEach(res => {
                if (res.status === 'success') {
                    res.data.forEach(member => {
                        memberNames[member.memberId] = member.fullName;
                    });
                }
            });

            if (adminDataResult.status === 'success') {
                allRecords = adminDataResult.data.reverse();
                renderTable(allRecords);
            }
            
            loadingMessage.style.display = 'none';

        } catch (error) {
            console.error('خطا در بارگذاری پنل مدیر:', error);
            loadingMessage.textContent = 'خطا در ارتباط با سرور.';
        }
    }

    // --- ۴. منطق فیلترها ---
    function populateFilters() {
        institutionFilter.innerHTML = '<option value="all">همه موسسات</option>';
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
            // اصلاح فیلتر تاریخ برای کار با فرمت جدید تاریخ و زمان
            const persianDate = new Date(selectedDate).toLocaleDateString('fa-IR');
            filteredRecords = filteredRecords.filter(record => record.date.startsWith(persianDate));
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

    // --- ۵. خروجی اکسل ---
    exportExcelButton.addEventListener('click', () => {
        const tableRows = adminDataBody.querySelectorAll('tr');
        if (tableRows.length === 0 || tableRows[0].querySelector('td[colspan="4"]')) {
            alert("داده‌ای برای خروجی گرفتن وجود ندارد.");
            return;
        }
        const dataToExport = Array.from(tableRows).map(row => {
            const cells = row.querySelectorAll('td');
            return {
                "موسسه": cells[0].textContent,
                "نام عضو": cells[1].textContent,
                "تاریخ و زمان": cells[2].textContent,
                "وضعیت": cells[3].textContent,
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش حضور و غیاب");
        XLSX.writeFile(workbook, "AttendanceReport.xlsx");
    });

    // --- اجرای اولیه ---
    initializeAdminPanel();
});
