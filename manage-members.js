document.addEventListener('DOMContentLoaded', async () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- شناسایی عناصر ---
    const pageTitle = document.getElementById('manage-page-title');
    const addForm = document.getElementById('add-members-form');
    const namesTextarea = document.getElementById('names-textarea');
    const idsTextarea = document.getElementById('ids-textarea');
    const mobilesTextarea = document.getElementById('mobiles-textarea');
    const addStatusMessage = document.getElementById('add-status-message');
    const activeMembersBody = document.querySelector('#active-members-table tbody');
    const inactiveMembersBody = document.querySelector('#inactive-members-table tbody');
    
    const editModal = document.getElementById('edit-member-modal');
    const editForm = document.getElementById('edit-member-form');
    const cancelEditBtn = document.getElementById('cancel-member-edit');

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

    async function fetchAllMembers() {
        activeMembersBody.innerHTML = '<tr><td colspan="5">در حال بارگذاری...</td></tr>';
        inactiveMembersBody.innerHTML = '<tr><td colspan="5">در حال بارگذاری...</td></tr>';

        const result = await apiCall('getAllMembersForAdmin', { institutionId });

        if (result.status === 'success') {
            renderTables(result.data);
        } else {
            alert('خطا در دریافت لیست اعضا: ' + result.message);
        }
    }

    function renderTables(members) {
        activeMembersBody.innerHTML = '';
        inactiveMembersBody.innerHTML = '';
        
        members.forEach(member => {
            const row = document.createElement('tr');
            row.dataset.member = JSON.stringify(member);
            
            if (member.isActive) {
                row.innerHTML = `
                    <td>${member.memberId}</td>
                    <td>${member.fullName}</td>
                    <td>${member.nationalId}</td>
                    <td>${member.mobile}</td>
                    <td>
                        <button class="edit-btn" data-id="${member.memberId}">ویرایش</button>
                        <button class="delete-btn" data-id="${member.memberId}">حذف</button>
                    </td>
                `;
                activeMembersBody.appendChild(row);
            } else {
                row.innerHTML = `
                    <td>${member.memberId}</td>
                    <td>${member.fullName}</td>
                    <td>${member.nationalId}</td>
                    <td>${member.mobile}</td>
                    <td><button class="restore-btn" data-id="${member.memberId}">بازگردانی</button></td>
                `;
                inactiveMembersBody.appendChild(row);
            }
        });
    }
    
    // --- مدیریت رویدادها ---
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            institutionId,
            namesString: namesTextarea.value.trim(),
            idsString: idsTextarea.value.trim(),
            mobilesString: mobilesTextarea.value.trim()
        };
        if (!payload.namesString) return;

        addStatusMessage.textContent = 'در حال افزودن...';
        const result = await apiCall('addMembersBatch', payload);

        if (result.status === 'success') {
            addStatusMessage.style.color = 'green';
            addForm.reset();
        } else {
            addStatusMessage.style.color = 'red';
        }
        addStatusMessage.textContent = result.data ? result.data.message : result.message;
        fetchAllMembers();
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
        } else if (e.target.classList.contains('edit-btn')) {
            const memberData = JSON.parse(e.target.closest('tr').dataset.member);
            document.getElementById('edit-member-id').value = memberData.memberId;
            document.getElementById('edit-fullname').value = memberData.fullName;
            document.getElementById('edit-nationalid').value = memberData.nationalId;
            document.getElementById('edit-mobile').value = memberData.mobile;
            editModal.style.display = 'flex';
            return;
        }

        if (action) {
            await apiCall(action, { institutionId, memberId });
            fetchAllMembers();
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            institutionId,
            memberId: document.getElementById('edit-member-id').value,
            fullName: document.getElementById('edit-fullname').value,
            nationalId: document.getElementById('edit-nationalid').value,
            mobile: document.getElementById('edit-mobile').value
        };
        await apiCall('updateMemberDetails', payload);
        editModal.style.display = 'none';
        fetchAllMembers();
    });

    // --- اجرای اولیه ---
    fetchAllMembers();
});
