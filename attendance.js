document.addEventListener('DOMContentLoaded', () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- شناسایی عناصر عمومی ---
    const instituteNameEl = document.getElementById('institute-name');
    const logoutButton = document.getElementById('logout-button');
    const manageMembersLink = document.getElementById('manage-members-link');
    const changeCredentialsBtn = document.getElementById('change-credentials-btn');

    // --- متغیرهای عمومی ---
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    let membersMap = {}; // {memberId: "FullName"}

    // --- بررسی اولیه ورود کاربر ---
    if (!userData || userData.role !== 'institute') {
        window.location.href = 'index.html';
        return;
    }

    // --- تابع کمکی برای تماس با API ---
    async function apiCall(action, payload) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action, payload })
            });
            return await response.json();
        } catch (error) {
            console.error('API Call Error:', error);
            return { status: 'error', message: 'خطا در ارتباط با سرور.' };
        }
    }
    
    // =================================================================
    // بخش ۱: منطق و عناصر عمومی صفحه
    // =================================================================
    function setupPage() {
        instituteNameEl.textContent = `پنل موسسه (${userData.username})`;
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('userData');
            window.location.href = 'index.html';
        });

        checkPermissions();
        setupTabs();
        setupModals();
        initializeRegisterTab(); // تب پیش‌فرض را بارگذاری کن
    }

    async function checkPermissions() {
        const result = await apiCall('getSettings', {});
        if (result.status === 'success') {
            const settings = result.data;
            if (settings.allowMemberManagement === true) {
                manageMembersLink.style.display = 'inline-block';
                manageMembersLink.href = `manage-members.html?id=${userData.institutionId}&name=${encodeURIComponent(userData.username)}`;
            }
            if (settings.allowUsernameChange === true || settings.allowPasswordChange === true) {
                changeCredentialsBtn.style.display = 'inline-block';
                document.getElementById('change-username').disabled = !settings.allowUsernameChange;
                document.getElementById('change-password').disabled = !settings.allowPasswordChange;
            }
        }
    }

    function setupTabs() {
        const historyTableBody = document.querySelector('#history-table-body');
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab + '-tab').classList.add('active');
                
                if (button.dataset.tab === 'history' && historyTableBody.innerHTML === '') {
                    initializeHistoryTab();
                }
            });
        });
    }

    function setupModals() {
        const changeCredentialsModal = document.getElementById('change-credentials-modal');
        const changeCredentialsForm = document.getElementById('change-credentials-form');

        changeCredentialsBtn.addEventListener('click', () => {
            changeCredentialsModal.style.display = 'flex';
            document.getElementById('change-creds-status').textContent = '';
            changeCredentialsForm.reset();
        });

        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                changeCredentialsModal.style.display = 'none';
            });
        });

        changeCredentialsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = document.getElementById('change-username').value.trim();
            const newPassword = document.getElementById('change-password').value.trim();
            const statusEl = document.getElementById('change-creds-status');
            if (!newUsername && !newPassword) return;

            const result = await apiCall('changeMyCredentials', { institutionId: userData.institutionId, newUsername, newPassword });

            if (result.status === 'success') {
                statusEl.style.color = 'green';
                statusEl.textContent = 'اطلاعات با موفقیت تغییر کرد. لطفاً دوباره وارد شوید.';
                setTimeout(() => { sessionStorage.removeItem('userData'); window.location.href = 'index.html'; }, 3000);
            } else {
                statusEl.style.color = 'red';
                statusEl.textContent = result.message;
            }
        });
    }

    // =================================================================
    // بخش ۲: منطق تب ثبت حضور و غیاب
    // =================================================================
    async function initializeRegisterTab() { 
        const elements = {
            currentDateEl: document.getElementById('current-date'),
            memberListBody: document.getElementById('member-list-body'),
        };
        elements.currentDateEl.textContent = new Date().toLocaleDateString('fa-IR');
        elements.memberListBody.innerHTML = '<tr><td colspan="2">در حال بارگذاری...</td></tr>'; 
        
        const [membersResult, todaysAttendanceResult] = await Promise.all([ 
            apiCall('getMembers', { institutionId: userData.institutionId }), 
            apiCall('getTodaysAttendance', { institutionId: userData.institutionId }) 
        ]); 
        
        if (membersResult.status !== 'success') { elements.memberListBody.innerHTML = '<tr><td colspan="2">خطا در دریافت لیست اعضا.</td></tr>'; return; } 
        
        const members = membersResult.data; 
        members.forEach(m => membersMap[m.memberId] = m.fullName); 
        let todaysAttendance = {}; 
        if (todaysAttendanceResult.status === 'success') { todaysAttendanceResult.data.forEach(r => { todaysAttendance[r.memberId] = r.status; });} 
        
        elements.memberListBody.innerHTML = ''; 
        if (members.length === 0) { elements.memberListBody.innerHTML = `<tr><td colspan="2">هیچ عضو فعالی یافت نشد.</td></tr>`; return; } 
        
        members.forEach(member => { 
            const previousStatus = todaysAttendance[member.memberId]; 
            const isPresentChecked = previousStatus === 'حاضر' ? 'checked' : ''; 
            const isAbsentChecked = previousStatus === 'غایب' ? 'checked' : ''; 
            const row = document.createElement('tr'); 
            row.innerHTML = `<td>${member.fullName}</td><td><input type="radio" id="present-${member.memberId}" name="status-${member.memberId}" value="حاضر" ${isPresentChecked} required><label for="present-${member.memberId}">حاضر</label><input type="radio" id="absent-${member.memberId}" name="status-${member.memberId}" value="غایب" ${isAbsentChecked}><label for="absent-${member.memberId}">غایب</label></td>`; 
            row.dataset.memberId = member.memberId; 
            elements.memberListBody.appendChild(row); 
        }); 
    }
    
    document.getElementById('attendance-form').addEventListener('submit', async (event) => { 
        event.preventDefault(); 
        const saveButton = document.getElementById('submit-attendance');
        const statusMessage = document.getElementById('status-message');
        saveButton.disabled = true; saveButton.textContent = 'در حال ثبت...'; statusMessage.textContent = ''; 
        const attendanceData = []; 
        const rows = document.getElementById('member-list-body').querySelectorAll('tr'); 
        rows.forEach(row => { 
            const memberId = row.dataset.memberId; 
            const checkedRadio = row.querySelector('input[type="radio"]:checked'); 
            if (memberId && checkedRadio) { attendanceData.push({ memberId: memberId, status: checkedRadio.value }); } 
        }); 
        if (rows.length > 0 && attendanceData.length !== rows.length) { 
            statusMessage.textContent = 'لطفاً وضعیت تمام اعضا را مشخص کنید.'; 
            saveButton.disabled = false; saveButton.textContent = 'ثبت نهایی'; 
            return; 
        } 
        const result = await apiCall('saveAttendance', { institutionId: userData.institutionId, data: attendanceData });
        if (result.status === 'success') { 
            statusMessage.style.color = 'green'; 
            statusMessage.textContent = 'حضور و غیاب با موفقیت به‌روزرسانی شد!'; 
            saveButton.textContent = 'ثبت شد'; 
        } else { 
            statusMessage.style.color = '#d93025'; 
            statusMessage.textContent = result.message || 'خطا در ثبت اطلاعات.'; 
            saveButton.disabled = false; saveButton.textContent = 'ثبت نهایی'; 
        } 
    });
    
    // =================================================================
    // بخش ۳: منطق تب تاریخچه
    // =================================================================
    function initializeHistoryTab() {
        let fullHistory = [];
        let currentHistoryFilters = { status: 'all' };
        let currentHistoryPage = 1;
        const historyTableBody = document.getElementById('history-table-body');
        const historyPaginationContainer = document.getElementById('history-pagination-container');
        
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
            historyTableBody.innerHTML = ''; let lastDate = null; if (records.length === 0) { historyTableBody.innerHTML = '<tr><td colspan="3">سابقه‌ای یافت نشد.</td></tr>'; return; }
            records.forEach(record => {
                const recordDate = record.date.split(/,|،/)[0].trim();
                if (recordDate !== lastDate) { const dateRow = document.createElement('tr'); dateRow.innerHTML = `<td colspan="3" class="date-group-header">تاریخ: ${recordDate}</td>`; historyTableBody.appendChild(dateRow); lastDate = recordDate; }
                const row = document.createElement('tr'); const memberName = membersMap[record.memberId] || `(شناسه: ${record.memberId})`;
                row.innerHTML = `<td>${record.date}</td><td>${memberName}</td><td>${record.status}</td>`;
                historyTableBody.appendChild(row);
            });
        }

        function renderHistoryPagination(totalPages) {
            historyPaginationContainer.innerHTML = ''; if (totalPages <= 1) return;
            for (let i = 1; i <= totalPages; i++) {
                const pageButton = document.createElement('button'); pageButton.textContent = i;
                if (i === currentHistoryPage) pageButton.classList.add('active');
                pageButton.addEventListener('click', () => { currentHistoryPage = i; renderHistoryPage(); });
                historyPaginationContainer.appendChild(pageButton);
            }
        }

        async function fetchHistory() {
            historyTableBody.innerHTML = '<tr><td colspan="3">در حال بارگذاری تاریخچه...</td></tr>';
            const result = await apiCall('getInstitutionHistory', { institutionId: userData.institutionId });
            if (result.status === 'success') {
                fullHistory = result.data;
                renderHistoryPage();
            } else {
                 historyTableBody.innerHTML = `<tr><td colspan="3">خطا در بارگذاری تاریخچه.</td></tr>`;
            }
        }
        
        document.querySelectorAll('#history-tab .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#history-tab .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentHistoryFilters.status = btn.dataset.status;
                currentHistoryPage = 1;
                renderHistoryPage();
            });
        });
        
        document.getElementById('export-history-excel').addEventListener('click', () => { 
            let filteredHistory = [...fullHistory]; 
            if (currentHistoryFilters.status !== 'all') { filteredHistory = filteredHistory.filter(r => r.status === currentHistoryFilters.status); } 
            if (filteredHistory.length === 0) { alert('داده‌ای برای خروجی گرفتن وجود ندارد.'); return; } 
            const dataToExport = filteredHistory.map(record => ({ "تاریخ و زمان": record.date, "نام عضو": membersMap[record.memberId] || `(شناسه: ${record.memberId})`, "وضعیت": record.status })); 
            const worksheet = XLSX.utils.json_to_sheet(dataToExport); 
            const workbook = XLSX.utils.book_new(); 
            XLSX.utils.book_append_sheet(workbook, worksheet, "تاریخچه حضور و غیاب"); 
            XLSX.writeFile(workbook, `History_${userData.username}.xlsx`); 
        });

        fetchHistory();
    }

    // --- اجرای اولیه ---
    setupPage();
});
