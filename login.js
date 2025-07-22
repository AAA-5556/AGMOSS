document.addEventListener('DOMContentLoaded', () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    // بررسی اینکه آیا کاربر از قبل توکن معتبر دارد یا نه
    const userData = JSON.parse(localStorage.getItem('userData'));
    if(userData && userData.token){
        // اگر توکن وجود داشت، او را مستقیماً به صفحه مربوطه هدایت کن
        if (userData.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (userData.role === 'institute') {
            window.location.href = 'attendance.html';
        }
    }


    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        loginButton.disabled = true;
        loginButton.textContent = 'در حال بررسی...';
        errorMessage.textContent = '';

        const requestBody = {
            action: 'login',
            payload: {
                username: username,
                password: password
            }
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.status === 'success' && result.data.token) {
                // --- تغییر اصلی: ذخیره اطلاعات کاربر به همراه توکن در localStorage ---
                localStorage.setItem('userData', JSON.stringify(result.data));

                // هدایت کاربر به صفحه مناسب
                if (result.data.role === 'admin') {
                    window.location.href = 'admin.html';
                } else if (result.data.role === 'institute') {
                    window.location.href = 'attendance.html';
                }
            } else {
                errorMessage.textContent = result.message || "خطایی رخ داد.";
            }
        } catch (error) {
            console.error('Error during login:', error);
            errorMessage.textContent = 'خطا در ارتباط با سرور.';
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'ورود';
        }
    });
});
