document.addEventListener('DOMContentLoaded', async () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- شناسایی عناصر ---
    const archiveTableBody = document.getElementById('archive-table-body');
    const loadingMessage = document.getElementById('loading-archive');

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

    // --- تابع برای نمایش داده‌ها ---
    function renderTable(archivedInstitutions) {
        archiveTableBody.innerHTML = '';
        if (archivedInstitutions.length === 0) {
            archiveTableBody.innerHTML = '<tr><td colspan="6">هیچ موسسه آرشیو شده‌ای یافت نشد.</td></tr>';
            return;
        }

        archivedInstitutions.forEach(inst => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${inst.username}</td>
                <td>${inst.creationDate || '-'}</td>
                <td>${inst.createdBy || '-'}</td>
                <td>${inst.archiveDate || '-'}</td>
                <td>${inst.archivedBy || '-'}</td>
                <td><button class="restore-btn" data-id="${inst.institutionId}" data-name="${inst.username}">بازگردانی</button></td>
            `;
            archiveTableBody.appendChild(row);
        });
    }

    // --- بارگذاری اولیه ---
    async function fetchArchived() {
        const result = await apiCall('getArchivedInstitutions', {});
        if (result.status === 'success') {
            loadingMessage.style.display = 'none';
            renderTable(result.data);
        } else {
            loadingMessage.textContent = 'خطا در بارگذاری اطلاعات: ' + result.message;
        }
    }

    // --- مدیریت رویداد کلیک برای بازگردانی ---
    archiveTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('restore-btn')) {
            const instId = e.target.dataset.id;
            const instName = e.target.dataset.name;

            if (confirm(`آیا از بازگردانی موسسه "${instName}" مطمئن هستید؟`)) {
                e.target.disabled = true;
                e.target.textContent = 'در حال بازگردانی...';
                
                const result = await apiCall('restoreInstitution', { institutionId: instId });
                if (result.status === 'success') {
                    alert(result.data.message);
                    fetchArchived(); // بازخوانی لیست بایگانی
                } else {
                    alert('خطا در بازگردانی: ' + result.message);
                    e.target.disabled = false;
                    e.target.textContent = 'بازگردانی';
                }
            }
        }
    });

    // --- اجرای اولیه ---
    fetchArchived();
});
