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
    const paginationContainer = document.getElementById('pagination-container');
    const statusFilterButtons = document.querySelectorAll('.filter-btn');
    const memberProfileView = document.getElementById('member-profile-view');
    const memberProfileName = document.getElementById('member-profile-name');
    const memberProfileCard = document.getElementById('member-profile-card');

    // --- متغیرهای وضعیت ---
    let allRecords = []; 
    let memberNames = {};
    let institutionNames = {};
    let currentFilters = {
        institution: 'all',
        date: '',
        status: 'all',
        memberId: null
    };
    let currentPage = 1;
    const ITEMS_PER_PAGE = 30;

    // --- ۱. بررسی هویت و خروج ---
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    if (!userData || userData.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    document.querySelector('.page-header h2').textContent = `پنل مدیریت (${userData.username})`;

    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // --- ۲. توابع نمایش ---
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
    
    function populateFilters() {
        institutionFilter.innerHTML = '<option value="all">همه موسسات</option>';
        Object.keys(institutionNames).forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = institutionNames[id];
            institutionFilter.appendChild(option);
        });
    }

    function renderPage() {
        memberProfileView.style.display = currentFilters.memberId ? 'block' : 'none';
        const filteredRecords = applyAllFilters();
        
        const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
        currentPage = Math.min(currentPage, totalPages || 1);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageRecords = filteredRecords.slice(startIndex, endIndex);

        renderTable(pageRecords);
        renderPagination(totalPages);
    }

    function renderTable(records) {
        adminDataBody.innerHTML = '';
        let lastDate = null;
        if (records.length === 0) {
            adminDataBody.innerHTML = '<tr><td colspan="4">رکوردی یافت نشد.</td></tr>';
            return;
        }

        records.forEach(record => {
            const recordDate = record.date.split('،')[0].trim();
            if (recordDate !== lastDate && !currentFilters.memberId) {
                const dateRow = document.createElement('tr');
                dateRow.innerHTML = `<td colspan="4" class="date-group-header">تاریخ: ${recordDate}</td>`;
                adminDataBody.appendChild(dateRow);
                lastDate = recordDate;
            }

            const row = document.createElement('tr');
            const memberName = memberNames[record.memberId] || `(شناسه: ${record.memberId})`;
            const instName = institutionNames[record.institutionId] || `(شناسه: ${record.institutionId})`;
            row.innerHTML = `
                <td>${instName}</td>
                <td><a href="#" class="clickable-member" data-member-id="${record.memberId}">${memberName}</a></td>
                <td>${record.date}</td>
                <td>${record.status}</td>
            `;
            adminDataBody.appendChild(row);
        });
    }

    function renderPagination(totalPages) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const createButton = (text, page, isDisabled = false, isActive = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.disabled = isDisabled;
            if (isActive) button.classList.add('active');
            button.addEventListener('click', () => {
                currentPage = page;
                renderPage();
            });
            return button;
        };

        paginationContainer.appendChild(createButton('قبلی', currentPage - 1, currentPage === 1));
        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
        }
        paginationContainer.appendChild(createButton('بعدی', currentPage + 1, currentPage === totalPages));
    }

    // --- ۳. منطق فیلترها ---
    function applyAllFilters() {
        let filtered = [...allRecords];
        if (currentFilters.institution !== 'all') {
            filtered = filtered.filter(r => r.institutionId == currentFilters.institution);
        }
        if (currentFilters.date) {
            const persianDate = new Date(currentFilters.date).toLocaleDateString('fa-IR');
            filtered = filtered.filter(r => r.date.startsWith(persianDate));
        }
        if (currentFilters.status !== 'all') {
            filtered = filtered.filter(r => r.status === currentFilters.status);
        }
        if (currentFilters.memberId) {
            filtered = filtered.filter(r => r.memberId == currentFilters.memberId);
        }
        return filtered;
    }

    // --- ۴. تنظیم Event Listeners ---
    institutionFilter.addEventListener('change', (e) => {
        currentFilters.institution = e.target.value;
        currentFilters.memberId = null; 
        currentPage = 1;
        renderPage();
    });

    dateFilter.addEventListener('change', (e) => {
        currentFilters.date = e.target.value;
        currentPage = 1;
        renderPage();
    });

    statusFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            statusFilterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.status = btn.dataset.status;
            currentPage = 1;
            renderPage();
        });
    });

    adminDataBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('clickable-member')) {
            e.preventDefault();
            const memberId = e.target.dataset.memberId;
            currentFilters.memberId = memberId;
            memberProfileName.textContent = `پروفایل عضو: ${e.target.textContent}`;
            memberProfileCard.innerHTML = `<p>در حال دریافت آمار...</p>`;
            memberProfileView.style.display = 'block';
            currentPage = 1;
            renderPage();

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'getMemberProfile', payload: { memberId: memberId } })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    const profile = result.data;
                    memberProfileCard.innerHTML = `
                        <p>تاریخ ثبت نام: <span class="highlight">${profile.creationDate || 'ثبت نشده'}</span></p>
                        <p>تعداد کل حضور: <span class="highlight present">${profile.totalPresents}</span></p>
                        <p>تعداد کل غیبت: <span class="highlight absent">${profile.totalAbsents}</span></p>
                        <p>آخرین حضور: <span class="highlight">${profile.lastPresent}</span></p>
                        <p>آخرین غیبت: <span class="highlight">${profile.lastAbsent}</span></p>
                    `;
                } else {
                    memberProfileCard.innerHTML = `<p class="error-message">${result.message}</p>`;
                }
            } catch (error) {
                memberProfileCard.innerHTML = `<p class="error-message">خطا در دریافت اطلاعات پروفایل.</p>`;
            }
        }
    });

    resetFiltersButton.addEventListener('click', () => {
        institutionFilter.value = 'all';
        dateFilter.value = '';
        statusFilterButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-status="all"]').classList.add('active');
        currentFilters = { institution: 'all', date: '', status: 'all', memberId: null };
        currentPage = 1;
        renderPage();
    });

    // --- ۵. خروجی اکسل ---
    exportExcelButton.addEventListener('click', () => {
        const dataToExport = applyAllFilters().map(record => ({
            "موسسه": institutionNames[record.institutionId] || `(شناسه: ${record.institutionId})`,
            "نام عضو": memberNames[record.memberId] || `(شناسه: ${record.memberId})`,
            "تاریخ و زمان": record.date,
            "وضعیت": record.status,
        }));
        if (dataToExport.length === 0) {
            alert("داده‌ای برای خروجی گرفتن وجود ندارد.");
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش حضور و غیاب");
        XLSX.writeFile(workbook, "AttendanceReport.xlsx");
    });
    
    // --- ۶. بارگذاری اولیه ---
    async function initializeAdminPanel() {
        loadingMessage.textContent = 'در حال بارگذاری...';
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
                if (res.status === 'success') { res.data.forEach(member => { memberNames[member.memberId] = member.fullName; }); }
            });
            if (adminDataResult.status === 'success') {
                allRecords = adminDataResult.data.reverse(); // مرتب‌سازی از جدید به قدیم
                renderPage();
            }
            
            loadingMessage.style.display = 'none';
        } catch (error) {
            console.error('خطا در بارگذاری پنل مدیر:', error);
            loadingMessage.textContent = 'خطا در ارتباط با سرور.';
        }
    }
    
    initializeAdminPanel();
});
