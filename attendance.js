document.addEventListener('DOMContentLoaded', async () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- شناسایی عناصر صفحه ---
    const instituteNameEl = document.getElementById('institute-name');
    const logoutButton = document.getElementById('logout-button');
    // عناصر تب ثبت
    const registerTab = document.getElementById('register-tab');
    const currentDateEl = document.getElementById('current-date');
    const memberListBody = document.getElementById('member-list-body');
    const attendanceForm = document.getElementById('attendance-form');
    const submitButton = document.getElementById('submit-attendance');
    const statusMessage = document.getElementById('status-message');
    // عناصر تب تاریخچه
    const historyTab = document.getElementById('history-tab');
    const historyTableBody = document.getElementById('history-table-body');
    const exportHistoryButton = document.getElementById('export-history-excel');

    // --- بررسی ورود کاربر ---
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    if (!userData || userData.role !== 'institute') {
        window.location.href = 'index.html';
        return;
    }

    // --- متغیرهای سراسری ---
    let membersMap = {}; // برای نگهداری نام اعضا {id: name}
    let fullHistory = []; // برای نگهداری کل تاریخچه جهت اکسپورت

    // --- تنظیمات اولیه ---
    instituteNameEl.textContent = `موسسه: ${userData.username}`;
    currentDateEl.textContent = new Date().toLocaleDateString('fa-IR');
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // --- مدیریت تب‌ها ---
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab + '-tab').classList.add('active');
            
            if (button.dataset.tab === 'history' && historyTableBody.children.length === 0) {
                fetchHistory();
            }
        });
    });

    // --- توابع مربوط به تب ثبت نام ---
    async function initializeRegisterTab() {
        // ... (کد این بخش مشابه قبل است، برای سادگی خلاصه شده)
        // ... این تابع لیست اعضا و وضعیت امروز را گرفته و فرم را پر می‌کند ...
        memberListBody.innerHTML = '<tr><td colspan="2">در حال بارگذاری...</td></tr>';
        const [membersResult, todaysAttendanceResult] = await Promise.all([
            fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMembers', payload: { institutionId: userData.institutionId } }) }).then(res => res.json()),
            fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTodaysAttendance', payload: { institutionId: userData.institutionId } }) }).then(res => res.json())
        ]);
        if (membersResult.status !== 'success') { throw new Error('خطا در دریافت لیست اعضا.'); }
        const members = membersResult.data;
        members.forEach(m => membersMap[m.memberId] = m.fullName); // ذخیره نام اعضا
        let todaysAttendance = {};
        if (todaysAttendanceResult.status === 'success') { todaysAttendanceResult.data.forEach(r => { todaysAttendance[r.memberId] = r.status; });}
        memberListBody.innerHTML = '';
        if (members.length === 0) { memberListBody.innerHTML = `<tr><td colspan="2">هیچ عضوی یافت نشد.</td></tr>`; return; }
        members.forEach(member => {
            const previousStatus = todaysAttendance[member.memberId];
            const isPresentChecked = previousStatus === 'حاضر' ? 'checked' : '';
            const isAbsentChecked = previousStatus === 'غایب' ? 'checked' : '';
            const row = document.createElement('tr');
            row.innerHTML = `<td>${member.fullName}</td><td><input type="radio" id="present-${member.memberId}" name="status-${member.memberId}" value="حاضر" ${isPresentChecked} required><label for="present-${member.memberId}">حاضر</label><input type="radio" id="absent-${member.memberId}" name="status-${member.memberId}" value="غایب" ${isAbsentChecked}><label for="absent-${member.memberId}">غایب</label></td>`;
            row.dataset.memberId = member.memberId;
            memberListBody.appendChild(row);
        });
    }

    attendanceForm.addEventListener('submit', async (event) => { /* ... کد این بخش دقیقاً مثل قبل است ... */ event.preventDefault(); submitButton.disabled = true; submitButton.textContent = 'در حال ثبت...'; statusMessage.textContent = ''; const attendanceData = []; const rows = memberListBody.querySelectorAll('tr'); rows.forEach(row => { const memberId = row.dataset.memberId; const checkedRadio = row.querySelector('input[type="radio"]:checked'); if (memberId && checkedRadio) { attendanceData.push({ memberId: memberId, status: checkedRadio.value }); } }); if (attendanceData.length > 0 && attendanceData.length !== rows.length) { statusMessage.textContent = 'لطفاً وضعیت تمام اعضا را مشخص کنید.'; submitButton.disabled = false; submitButton.textContent = 'ثبت نهایی'; return; } const requestBody = { action: 'saveAttendance', payload: { institutionId: userData.institutionId, data: attendanceData } }; try { const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(requestBody) }); const result = await response.json(); if (result.status === 'success') { statusMessage.style.color = 'green'; statusMessage.textContent = 'حضور و غیاب با موفقیت به‌روزرسانی شد!'; submitButton.textContent = 'ثبت شد'; } else { statusMessage.style.color = '#d93025'; statusMessage.textContent = result.message || 'خطا در ثبت اطلاعات.'; submitButton.disabled = false; submitButton.textContent = 'ثبت نهایی'; } } catch(error) { statusMessage.style.color = '#d93025'; statusMessage.textContent = 'خطا در ارتباط با سرور.'; submitButton.disabled = false; submitButton.textContent = 'ثبت نهایی'; } });


    // --- توابع مربوط به تب تاریخچه ---
    async function fetchHistory() {
        historyTableBody.innerHTML = '<tr><td colspan="3">در حال بارگذاری تاریخچه...</td></tr>';
        
        const requestBody = {
            action: 'getInstitutionHistory',
            payload: { institutionId: userData.institutionId }
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });
            const result = await response.json();

            if (result.status === 'success') {
                fullHistory = result.data; // ذخیره تاریخچه کامل برای اکسپورت
                historyTableBody.innerHTML = '';
                if (fullHistory.length === 0) {
                    historyTableBody.innerHTML = '<tr><td colspan="3">هیچ سابقه‌ای یافت نشد.</td></tr>';
                    return;
                }
                fullHistory.forEach(record => {
                    const row = document.createElement('tr');
                    const memberName = membersMap[record.memberId] || `(ID: ${record.memberId})`;
                    row.innerHTML = `
                        <td>${record.date}</td>
                        <td>${memberName}</td>
                        <td>${record.status}</td>
                    `;
                    historyTableBody.appendChild(row);
                });
            } else {
                historyTableBody.innerHTML = `<tr><td colspan="3">${result.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            historyTableBody.innerHTML = '<tr><td colspan="3">خطا در بارگذاری تاریخچه.</td></tr>';
        }
    }

    exportHistoryButton.addEventListener('click', () => {
        if (fullHistory.length === 0) {
            alert('داده‌ای برای خروجی گرفتن وجود ندارد.');
            return;
        }

        const dataToExport = fullHistory.map(record => ({
            "تاریخ": record.date,
            "نام عضو": membersMap[record.memberId] || `(ID: ${record.memberId})`,
            "وضعیت": record.status
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "تاریخچه حضور و غیاب");
        XLSX.writeFile(workbook, `History_${userData.username}.xlsx`);
    });

    // --- اجرای اولیه ---
    initializeRegisterTab();
});
