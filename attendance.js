document.addEventListener('DOMContentLoaded', async () => {
    // ❗ مهم: لینک API خود را که از گوگل اسکریپت دریافت کردید، اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    const instituteNameEl = document.getElementById('institute-name');
    const currentDateEl = document.getElementById('current-date');
    const memberListBody = document.getElementById('member-list-body');
    const attendanceForm = document.getElementById('attendance-form');
    const submitButton = document.getElementById('submit-attendance');
    const statusMessage = document.getElementById('status-message');
    const logoutButton = document.getElementById('logout-button');

    // ۱. بررسی ورود کاربر
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    if (!userData || userData.role !== 'institute') {
        window.location.href = 'index.html';
        return;
    }

    // ۲. تنظیمات اولیه صفحه
    instituteNameEl.textContent = `موسسه: ${userData.username}`;
    currentDateEl.textContent = new Date().toLocaleDateString('fa-IR');
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // ۳. تابع اصلی برای بارگذاری و نمایش اطلاعات
    async function initializePage() {
        memberListBody.innerHTML = '<tr><td colspan="2">در حال بارگذاری...</td></tr>';

        try {
            // دریافت همزمان لیست اعضا و اطلاعات حضور و غیاب امروز
            const [membersResult, todaysAttendanceResult] = await Promise.all([
                fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMembers', payload: { institutionId: userData.institutionId } }) }).then(res => res.json()),
                fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTodaysAttendance', payload: { institutionId: userData.institutionId } }) }).then(res => res.json())
            ]);

            if (membersResult.status !== 'success') {
                throw new Error('خطا در دریافت لیست اعضا.');
            }

            const members = membersResult.data;
            let todaysAttendance = {};
            if (todaysAttendanceResult.status === 'success') {
                // ایجاد یک نقشه برای دسترسی سریع به وضعیت هر عضو
                todaysAttendanceResult.data.forEach(record => {
                    todaysAttendance[record.memberId] = record.status;
                });
            }

            // پاک کردن پیام بارگذاری و نمایش جدول
            memberListBody.innerHTML = '';
            if (members.length === 0) {
                memberListBody.innerHTML = `<tr><td colspan="2">هیچ عضوی برای این موسسه یافت نشد.</td></tr>`;
                return;
            }

            members.forEach(member => {
                const previousStatus = todaysAttendance[member.memberId]; // وضعیت قبلی عضو
                const isPresentChecked = previousStatus === 'حاضر' ? 'checked' : '';
                const isAbsentChecked = previousStatus === 'غایب' ? 'checked' : '';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${member.fullName}</td>
                    <td>
                        <input type="radio" id="present-${member.memberId}" name="status-${member.memberId}" value="حاضر" ${isPresentChecked} required>
                        <label for="present-${member.memberId}">حاضر</label>
                        
                        <input type="radio" id="absent-${member.memberId}" name="status-${member.memberId}" value="غایب" ${isAbsentChecked}>
                        <label for="absent-${member.memberId}">غایب</label>
                    </td>
                `;
                row.dataset.memberId = member.memberId;
                memberListBody.appendChild(row);
            });

        } catch (error) {
            console.error('Error initializing page:', error);
            memberListBody.innerHTML = '<tr><td colspan="2">خطا در بارگذاری اطلاعات. لطفاً صفحه را رفرش کنید.</td></tr>';
        }
    }

    // ۴. مدیریت ثبت نهایی فرم (این بخش بدون تغییر است)
    attendanceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        submitButton.disabled = true;
        submitButton.textContent = 'در حال ثبت...';
        statusMessage.textContent = '';

        const attendanceData = [];
        const rows = memberListBody.querySelectorAll('tr');

        rows.forEach(row => {
            const memberId = row.dataset.memberId;
            const checkedRadio = row.querySelector('input[type="radio"]:checked');
            if (memberId && checkedRadio) {
                attendanceData.push({ memberId: memberId, status: checkedRadio.value });
            }
        });

        if (attendanceData.length > 0 && attendanceData.length !== rows.length) {
            statusMessage.textContent = 'لطفاً وضعیت تمام اعضا را مشخص کنید.';
            submitButton.disabled = false;
            submitButton.textContent = 'ثبت نهایی';
            return;
        }

        const requestBody = {
            action: 'saveAttendance',
            payload: {
                institutionId: userData.institutionId,
                data: attendanceData
            }
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });
            const result = await response.json();

            if (result.status === 'success') {
                statusMessage.style.color = 'green';
                statusMessage.textContent = 'حضور و غیاب با موفقیت به‌روزرسانی شد!';
                submitButton.textContent = 'ثبت شد';
            } else {
                statusMessage.style.color = '#d93025';
                statusMessage.textContent = result.message || 'خطا در ثبت اطلاعات.';
                submitButton.disabled = false;
                submitButton.textContent = 'ثبت نهایی';
            }
        } catch(error) {
            console.error('Error saving attendance:', error);
            statusMessage.style.color = '#d93025';
            statusMessage.textContent = 'خطا در ارتباط با سرور.';
            submitButton.disabled = false;
            submitButton.textContent = 'ثبت نهایی';
        }
    });

    // اجرای تابع اصلی برای شروع کار صفحه
    initializePage();
});
