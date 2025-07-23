document.addEventListener('DOMContentLoaded', () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- ۱. کد نگهبان و بررسی هویت ---
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData || !userData.token || userData.role !== 'admin') {
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
        return;
    }

    // --- شناسایی عناصر ---
    const logTableBody = document.getElementById('log-table-body');
    const loadingMessage = document.getElementById('loading-log');
    const userFilter = document.getElementById('user-filter');
    const actionTypeFilter = document.getElementById('action-type-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const resetFiltersButton = document.getElementById('reset-filters-log');
    const exportExcelButton = document.getElementById('export-excel');
    const paginationContainer = document.getElementById('pagination-container');

    // --- متغیرهای وضعیت ---
    let allLogs = [];
    let currentFilters = { user: '', actionType: 'all', startDate: '', endDate: '' };
    let currentPage = 1;
    const ITEMS_PER_PAGE = 30;
    
    // --- تابع کمکی برای تماس با API ---
    async function apiCall(action, payload) {
        try {
            const token = userData.token;
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action, payload, token })
            });
            const result = await response.json();
            if (result.status === 'error' && (result.message.includes('منقضی') || result.message.includes('نامعتبر'))) {
                alert(result.message);
                localStorage.removeItem('userData');
                window.location.href = 'index.html';
            }
            return result;
        } catch (error) {
            return { status: 'error', message: 'خطا در ارتباط با سرور.' };
        }
    }

    // --- توابع نمایش ---
    function renderPage() { const filteredLogs = applyFilters(); const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE); currentPage = Math.min(currentPage, totalPages || 1); const startIndex = (currentPage - 1) * ITEMS_PER_PAGE; const pageRecords = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE); renderTable(pageRecords); renderPagination(totalPages); }
    function renderTable(logs) { logTableBody.innerHTML = ''; if (logs.length === 0) { logTableBody.innerHTML = '<tr><td colspan="5">رکوردی یافت نشد.</td></tr>'; return; } logs.forEach(log => { const row = document.createElement('tr'); row.innerHTML = `<td>${log.timestamp}</td><td>${log.actor}</td><td>${log.role === 'admin' ? 'مدیر' : 'موسسه'}</td><td>${log.type}</td><td>${log.desc}</td>`; logTableBody.appendChild(row); }); }
    function renderPagination(totalPages) { paginationContainer.innerHTML = ''; if (totalPages <= 1) return; for (let i = 1; i <= totalPages; i++) { const pageButton = document.createElement('button'); pageButton.textContent = i; if (i === currentPage) pageButton.classList.add('active'); pageButton.addEventListener('click', () => { currentPage = i; renderPage(); }); paginationContainer.appendChild(pageButton); } }
    function populateActionFilter(logs) { const actionTypes = [...new Set(logs.map(log => log.type))]; actionTypes.forEach(type => { const option = document.createElement('option'); option.value = type; option.textContent = type; actionTypeFilter.appendChild(option); }); }

    // --- منطق فیلترها ---
    function applyFilters() {
        let filtered = [...allLogs];
        if (currentFilters.user) {
            filtered = filtered.filter(log => log.actor.toLowerCase().includes(currentFilters.user.toLowerCase()));
        }
        if (currentFilters.actionType !== 'all') {
            filtered = filtered.filter(log => log.type === currentFilters.actionType);
        }
        if (startDateFilter.value.trim()) {
            filtered = filtered.filter(log => log.timestamp.split(/,|،/)[0].trim() >= startDateFilter.value.trim());
        }
        if (endDateFilter.value.trim()) {
            filtered = filtered.filter(log => log.timestamp.split(/,|،/)[0].trim() <= endDateFilter.value.trim());
        }
        return filtered;
    }

    // --- مدیریت رویدادها ---
    function setupEventListeners() {
        const filters = [userFilter, actionTypeFilter, startDateFilter, endDateFilter];
        filters.forEach(filter => {
            filter.addEventListener('input', () => {
                currentFilters.user = userFilter.value;
                currentFilters.actionType = actionTypeFilter.value;
                currentPage = 1;
                renderPage();
            });
        });
        
        resetFiltersButton.addEventListener('click', () => {
            userFilter.value = ''; 
            actionTypeFilter.value = 'all';
            startDateFilter.value = '';
            endDateFilter.value = '';
            const changeEvent = new Event('input');
            userFilter.dispatchEvent(changeEvent);
        });

        exportExcelButton.addEventListener('click', () => {
            const dataToExport = applyFilters().map(log => ({ "تاریخ و زمان": log.timestamp, "کاربر": log.actor, "نقش": log.role === 'admin' ? 'مدیر' : 'موسسه', "نوع عمل": log.type, "توضیحات": log.desc }));
            if (dataToExport.length === 0) { alert("داده‌ای برای خروجی گرفتن وجود ندارد."); return; }
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "تاریخچه تغییرات");
            XLSX.writeFile(workbook, "ActionLog.xlsx");
        });
    }
    
    // --- بارگذاری اولیه ---
    async function fetchActionLog() {
        const result = await apiCall('getActionLog', {});
        if (result.status === 'success') {
            loadingMessage.style.display = 'none';
            allLogs = result.data;
            populateActionFilter(allLogs);
            renderPage();
        } else {
            loadingMessage.textContent = 'خطا در بارگذاری تاریخچه: ' + result.message;
        }
    }

    setupEventListeners();
    fetchActionLog();
});
