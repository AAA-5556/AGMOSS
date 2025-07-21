document.addEventListener('DOMContentLoaded', async () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- شناسایی عناصر ---
    const pageTitle = document.getElementById('manage-page-title');
    const addForm = document.getElementById('add-members-form');
    const membersTextarea = document.getElementById('members-textarea');
    const addStatusMessage = document.getElementById('add-status-message');
    const activeMembersBody = document.querySelector('#active-members-table tbody');
    const inactiveMembersBody = document.querySelector('#inactive-members-table tbody');

    // --- دریافت شناسه موسسه از آدرس URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const institutionId = urlParams.get('id');
    const institutionName = urlParams.get('name');

    if (!institutionId || !institutionName) {
        pageTitle.textContent = "خطا: موسسه مشخص نشده است.";
        return;
    }
    pageTitle.textContent = `مدیریت اعضای موسسه: ${institutionName}`;

    // --- توابع ---
    async function fetchAllMembers() {
        activeMembersBody.innerHTML = '<tr><td colspan="3">در حال بارگذاری...</td></tr>';
        inactiveMembersBody.innerHTML = '<tr><td colspan="3">در حال بارگذاری...</td></tr>';

        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getAllMembersForAdmin', payload: { institutionId } })
        });
        const result = await response.json();

        if (result.status === 'success') {
            renderTables(result.data);
        } else {
            alert('خطا در دریافت لیست اعضا.');
        }
    }

    function renderTables(members) {
        activeMembersBody.innerHTML = '';
        inactiveMembersBody.innerHTML = '';
        
        members.forEach(member => {
            const row = document.createElement('tr');
            if (member.isActive) {
                row.innerHTML = `
                    <td>${member.memberId}</td>
                    <td>${member.fullName}</td>
                    <td><button class="delete-btn" data-id="${member.memberId}">حذف</button></td>
                `;
                activeMembersBody.appendChild(row);
            } else {
                row.innerHTML = `
                    <td>${member.memberId}</td>
                    <td>${member.fullName}</td>
                    <td><button class="restore-btn" data-id="${member.memberId}">بازگردانی</button></td>
                `;
                inactiveMembersBody.appendChild(row);
            }
        });
    }
    
    // --- مدیریت رویدادها (Event Listeners) ---
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const namesString = membersTextarea.value.trim();
        if (!namesString) return;

        addStatusMessage.textContent = 'در حال افزودن...';
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addMembersBatch', payload: { institutionId, namesString } })
        });
        const result = await response.json();

        if (result.status === 'success') {
            addStatusMessage.style.color = 'green';
            membersTextarea.value = '';
        } else {
            addStatusMessage.style.color = 'red';
        }
        addStatusMessage.textContent = result.data ? result.data.message : result.message;
        fetchAllMembers(); // بازخوانی لیست
    });

    document.body.addEventListener('click', async (e) => {
        const memberId = e.target.dataset.id;
        if (!memberId) return;

        let action = '';
        if (e.target.classList.contains('delete-btn')) {
            action = 'deleteMember';
            if (!confirm(`آیا از حذف (غیرفعال کردن) این عضو مطمئن هستید؟`)) return;
        } else if (e.target.classList.contains('restore-btn')) {
            action = 'restoreMember';
        }

        if (action) {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action, payload: { institutionId, memberId } })
            });
            await response.json();
            fetchAllMembers(); // بازخوانی لیست
        }
    });

    // --- اجرای اولیه ---
    fetchAllMembers();
});
