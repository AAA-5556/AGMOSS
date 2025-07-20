document.addEventListener('DOMContentLoaded', async () => {
    // ❗ Important: Paste the API URL you got from Google Script here.
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    const instituteNameEl = document.getElementById('institute-name');
    const currentDateEl = document.getElementById('current-date');
    const memberListBody = document.getElementById('member-list-body');
    const attendanceForm = document.getElementById('attendance-form');
    const submitButton = document.getElementById('submit-attendance');
    const statusMessage = document.getElementById('status-message');
    const logoutButton = document.getElementById('logout-button');

    // --- 1. Check for logged-in user ---
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    if (!userData || userData.role !== 'institute') {
        // If not logged in or not an institute, redirect to login page
        window.location.href = 'index.html';
        return; // Stop script execution
    }

    // --- 2. Initial page setup ---
    instituteNameEl.textContent = `موسسه: ${userData.username}`;
    currentDateEl.textContent = new Date().toLocaleDateString('fa-IR');

    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    // --- 3. Fetch members and populate table ---
    async function fetchMembers() {
        memberListBody.innerHTML = '<tr><td colspan="2">در حال بارگذاری لیست اعضا...</td></tr>';
        
        const requestBody = {
            action: 'getMembers',
            payload: {
                institutionId: userData.institutionId
            }
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(requestBody)
            });
            const result = await response.json();

            if (result.status === 'success' && result.data.length > 0) {
                memberListBody.innerHTML = ''; // Clear loading message
                result.data.forEach(member => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${member.fullName}</td>
                        <td>
                            <input type="radio" id="present-${member.memberId}" name="status-${member.memberId}" value="حاضر" required>
                            <label for="present-${member.memberId}">حاضر</label>
                            
                            <input type="radio" id="absent-${member.memberId}" name="status-${member.memberId}" value="غایب">
                            <label for="absent-${member.memberId}">غایب</label>
                        </td>
                    `;
                    row.dataset.memberId = member.memberId; // Store memberId on the row
                    memberListBody.appendChild(row);
                });
            } else {
                 memberListBody.innerHTML = `<tr><td colspan="2">${result.data.length === 0 ? 'هیچ عضوی برای این موسسه یافت نشد.' : result.message}</td></tr>`;
            }

        } catch (error) {
            console.error('Error fetching members:', error);
            memberListBody.innerHTML = '<tr><td colspan="2">خطا در بارگذاری لیست اعضا.</td></tr>';
        }
    }

    // --- 4. Handle form submission ---
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
                attendanceData.push({
                    memberId: memberId,
                    status: checkedRadio.value
                });
            }
        });

        if (attendanceData.length !== rows.length) {
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
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(requestBody)
            });
            const result = await response.json();

            if (result.status === 'success') {
                statusMessage.style.color = 'green';
                statusMessage.textContent = 'حضور و غیاب با موفقیت ثبت شد!';
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

    // --- Initial call to fetch members ---
    fetchMembers();
});
