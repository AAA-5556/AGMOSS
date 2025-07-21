document.addEventListener('DOMContentLoaded', async () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- شناسایی عناصر ---
    const instituteNameEl = document.getElementById('institute-name');
    const logoutButton = document.getElementById('logout-button');
    const historyTableBody = document.getElementById('history-table-body');
    const exportHistoryButton = document.getElementById('export-history-excel');
    const historyPaginationContainer = document.getElementById('history-pagination-container');
    const historyStatusFilters = document.querySelectorAll('#history-tab .filter-btn');

    // --- متغیرهای وضعیت ---
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    let membersMap = {};
    let fullHistory = [];
    let currentHistoryFilters = { status: 'all' };
    let currentHistoryPage = 1;
    const HISTORY_ITEMS_PER_PAGE = 30;

    // --- ۱. بررسی ورود و خروج ---
    if (!userData || userData.role !== 'institute') { window.location.href = 'index.html'; return; }
    instituteNameEl.textContent = `پنل موسسه (${userData.username})`;
    logoutButton.addEventListener('click', () => { sessionStorage.removeItem('userData'); window.location.href = 'index.html'; });

    // --- ۲. مدیریت تب‌ها ---
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab + '-tab').classList.add('active');
            
            if (button.dataset.tab === 'history' && fullHistory.length === 0) {
                fetchHistory();
            }
        });
    });

    // --- ۳. منطق تب تاریخچه ---
    function renderHistoryPage() {
        let filteredHistory = [...fullHistory];
        if (currentHistoryFilters.status !== 'all') {
            filteredHistory = filteredHistory.filter(r => r.status === currentHistoryFilters.status);
        }

        const totalPages = Math.ceil(filteredHistory.length / HISTORY_ITEMS_PER_PAGE);
        currentHistoryPage = Math.min(currentHistoryPage, totalPages || 1);
        const startIndex = (currentHistoryPage - 1) * HISTORY_ITEMS_PER_PAGE;
        const pageRecords = filteredHistory.slice(startIndex, startIndex + HISTORY_ITEMS_PER_PAGE);

        renderHistoryTable(pageRecords);
        renderHistoryPagination(totalPages);
    }

    function renderHistoryTable(records) {
        historyTableBody.innerHTML = '';
        let lastDate = null;
        if (records.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="3">سابقه‌ای یافت نشد.</td></tr>';
            return;
        }
        records.forEach(record => {
            const recordDate = record.date.split('،')[0].trim();
            if (recordDate !== lastDate) {
                const dateRow = document.createElement('tr');
                dateRow.innerHTML = `<td colspan="3" class="date-group-header">تاریخ: ${recordDate}</td>`;
                historyTableBody.appendChild(dateRow);
                lastDate = recordDate;
            }

            const row = document.createElement('tr');
            const memberName = membersMap[record.memberId] || `(شناسه: ${record.memberId})`;
            row.innerHTML = `<td>${record.date}</td><td>${memberName}</td><td>${record.status}</td>`;
            historyTableBody.appendChild(row);
        });
    }

    function renderHistoryPagination(totalPages) {
        historyPaginationContainer.innerHTML = '';
        if (totalPages <= 1) return;
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentHistoryPage) pageButton.classList.add('active');
            pageButton.addEventListener('click', () => { currentHistoryPage = i; renderHistoryPage(); });
            historyPaginationContainer.appendChild(pageButton);
        }
    }

    async function fetchHistory() {
        historyTableBody.innerHTML = '<tr><td colspan="3">در حال بارگذاری تاریخچه...</td></tr>';
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getInstitutionHistory', payload: { institutionId: userData.institutionId } }) });
        const result = await response.json();
        if (result.status === 'success') {
            // API از قبل داده‌ها را از جدید به قدیم مرتب می‌کند
            fullHistory = result.data; 
            currentHistoryPage = 1;
            renderHistoryPage();
        }
    }
    
    historyStatusFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            historyStatusFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHistoryFilters.status = btn.dataset.status;
            currentHistoryPage = 1;
            renderHistoryPage();
        });
    });
    
    exportHistoryButton.addEventListener('click', () => { 
        let filteredHistory = [...fullHistory]; 
        if (currentHistoryFilters.status !== 'all') { filteredHistory = filteredHistory.filter(r => r.status === currentHistoryFilters.status); } 
        if (filteredHistory.length === 0) { alert('داده‌ای برای خروجی گرفتن وجود ندارد.'); return; } 
        const dataToExport = filteredHistory.map(record => ({ "تاریخ": record.date, "نام عضو": membersMap[record.memberId] || `(شناسه: ${record.memberId})`, "وضعیت": record.status })); 
        const worksheet = XLSX.utils.json_to_sheet(dataToExport); 
        const workbook = XLSX.utils.book_new(); 
        XLSX.utils.book_append_sheet(workbook, worksheet, "تاریخچه حضور و غیاب"); 
        XLSX.writeFile(workbook, `History_${userData.username}.xlsx`); 
    });


    // --- ۴. منطق تب ثبت حضور و غیاب (بدون تغییر) ---
    const registerTabElements = {
        currentDateEl: document.getElementById('current-date'),
        memberListBody: document.getElementById('member-list-body'),
        attendanceForm: document.getElementById('attendance-form'),
        submitButton: document.getElementById('submit-attendance'),
        statusMessage: document.getElementById('status-message')
    };
    async function initializeRegisterTab() { registerTabElements.memberListBody.innerHTML = '<tr><td colspan="2">در حال بارگذاری...</td></tr>'; const [membersResult, todaysAttendanceResult] = await Promise.all([ fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMembers', payload: { institutionId: userData.institutionId } }) }).then(res => res.json()), fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTodaysAttendance', payload: { institutionId: userData.institutionId } }) }).then(res => res.json()) ]); if (membersResult.status !== 'success') { throw new Error('خطا در دریافت لیست اعضا.'); } const members = membersResult.data; members.forEach(m => membersMap[m.memberId] = m.fullName); let todaysAttendance = {}; if (todaysAttendanceResult.status === 'success') { todaysAttendanceResult.data.forEach(r => { todaysAttendance[r.memberId] = r.status; });} registerTabElements.memberListBody.innerHTML = ''; if (members.length === 0) { registerTabElements.memberListBody.innerHTML = `<tr><td colspan="2">هیچ عضوی یافت نشد.</td></tr>`; return; } members.forEach(member => { const previousStatus = todaysAttendance[member.memberId]; const isPresentChecked = previousStatus === 'حاضر' ? 'checked' : ''; const isAbsentChecked = previousStatus === 'غایب' ? 'checked' : ''; const row = document.createElement('tr'); row.innerHTML = `<td>${member.fullName}</td><td><input type="radio" id="present-${member.memberId}" name="status-${member.memberId}" value="حاضر" ${isPresentChecked} required><label for="present-${member.memberId}">حاضر</label><input type="radio" id="absent-${member.memberId}" name="status-${member.memberId}" value="غایب" ${isAbsentChecked}><label for="absent-${member.memberId}">غایب</label></td>`; row.dataset.memberId = member.memberId; registerTabElements.memberListBody.appendChild(row); }); }
    registerTabElements.attendanceForm.addEventListener('submit', async (event) => { event.preventDefault(); registerTabElements.submitButton.disabled = true; registerTabElements.submitButton.textContent = 'در حال ثبت...'; registerTabElements.statusMessage.textContent = ''; const attendanceData = []; const rows = registerTabElements.memberListBody.querySelectorAll('tr'); rows.forEach(row => { const memberId = row.dataset.memberId; const checkedRadio = row.querySelector('input[type="radio"]:checked'); if (memberId && checkedRadio) { attendanceData.push({ memberId: memberId, status: checkedRadio.value }); } }); if (attendanceData.length > 0 && attendanceData.length !== rows.length) { registerTabElements.statusMessage.textContent = 'لطفاً وضعیت تمام اعضا را مشخص کنید.'; registerTabElements.submitButton.disabled = false; registerTabElements.submitButton.textContent = 'ثبت نهایی'; return; } const requestBody = { action: 'saveAttendance', payload: { institutionId: userData.institutionId, data: attendanceData } }; try { const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(requestBody) }); const result = await response.json(); if (result.status === 'success') { registerTabElements.statusMessage.style.color = 'green'; registerTabElements.statusMessage.textContent = 'حضور و غیاب با موفقیت به‌روزرسانی شد!'; registerTabElements.submitButton.textContent = 'ثبت شد'; } else { registerTabElements.statusMessage.style.color = '#d9d3025'; registerTabElements.statusMessage.textContent = result.message || 'خطا در ثبت اطلاعات.'; registerTabElements.submitButton.disabled = false; registerTabElements.submitButton.textContent = 'ثبت نهایی'; } } catch(error) { registerTabElements.statusMessage.style.color = '#d93025'; registerTabElements.statusMessage.textContent = 'خطا در ارتباط با سرور.'; registerTabElements.submitButton.disabled = false; registerTabElements.submitButton.textContent = 'ثبت نهایی'; } });
    
    // --- اجرای اولیه ---
    initializeRegisterTab();
    
});
