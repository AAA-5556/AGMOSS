document.addEventListener('DOMContentLoaded', () => {
    // ... (بخش ۱: کد نگهبان مثل قبل) ...

    // --- توابع کمکی جدید ---
    const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    const arabicNumbers  = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    function normalizeNumbers(str) {
        if(typeof str !== 'string') return '';
        for(let i = 0; i < 10; i++) {
            str = str.replace(persianNumbers[i], i).replace(arabicNumbers[i], i);
        }
        return str;
    }
    
    function formatDateInput(input) {
        let value = normalizeNumbers(input.value).replace(/[^\d]/g, '');
        if (value.length > 4) {
            value = value.slice(0, 4) + '/' + value.slice(4);
        }
        if (value.length > 7) {
            value = value.slice(0, 7) + '/' + value.slice(7, 9);
        }
        input.value = value;
    }

    // ... (شناسایی عناصر و متغیرها مثل قبل) ...

    // --- منطق فیلترها (اصلاح شده) ---
    function applyFilters() {
        let filtered = [...allLogs];
        if (currentFilters.user) {
            filtered = filtered.filter(log => log.actor.toLowerCase().includes(currentFilters.user.toLowerCase()));
        }
        if (currentFilters.actionType !== 'all') {
            filtered = filtered.filter(log => log.type === currentFilters.actionType);
        }
        const startDate = normalizeNumbers(startDateFilter.value.trim());
        if (startDate) {
            filtered = filtered.filter(log => normalizeNumbers(log.timestamp.split(/,|،/)[0].trim()) >= startDate);
        }
        const endDate = normalizeNumbers(endDateFilter.value.trim());
        if (endDate) {
            filtered = filtered.filter(log => normalizeNumbers(log.timestamp.split(/,|،/)[0].trim()) <= endDate);
        }
        return filtered;
    }

    // --- مدیریت رویدادها (اصلاح شده) ---
    function setupEventListeners() {
        // رویداد برای فیلترهای متنی و کشویی
        userFilter.addEventListener('input', () => { currentFilters.user = userFilter.value; currentPage = 1; renderPage(); });
        actionTypeFilter.addEventListener('change', () => { currentFilters.actionType = actionTypeFilter.value; currentPage = 1; renderPage(); });

        // رویداد برای فیلترهای تاریخ با فرمت خودکار
        startDateFilter.addEventListener('input', () => { formatDateInput(startDateFilter); currentPage = 1; renderPage(); });
        endDateFilter.addEventListener('input', () => { formatDateInput(endDateFilter); currentPage = 1; renderPage(); });
        
        resetFiltersButton.addEventListener('click', () => {
            userFilter.value = ''; 
            actionTypeFilter.value = 'all';
            startDateFilter.value = '';
            endDateFilter.value = '';
            const changeEvent = new Event('input');
            userFilter.dispatchEvent(changeEvent); // یک رویداد کافی است تا همه فیلترها ریست شوند
        });

        exportExcelButton.addEventListener('click', () => { /* ... کد قبلی ... */ });
    }
    
    // ... (بقیه کد فایل مثل قبل است) ...
});
