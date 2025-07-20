document.addEventListener('DOMContentLoaded', () => {
    // ❗مهم: لینک API خود را که از گوگل اسکریپت دریافت کردید، اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // جلوگیری از رفرش شدن صفحه

        // گرفتن مقادیر از فرم
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // غیرفعال کردن دکمه ورود و نمایش پیام "در حال بررسی"
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
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // برای سازگاری با گوگل اسکریپت
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.status === 'success') {
                // ذخیره اطلاعات کاربر در حافظه موقت مرورگر
                sessionStorage.setItem('userData', JSON.stringify(result.data));

                // هدایت کاربر به صفحه مناسب بر اساس نقش
                if (result.data.role === 'admin') {
                    window.location.href = 'admin.html';
                } else if (result.data.role === 'institute') {
                    window.location.href = 'attendance.html';
                }
            } else {
                // نمایش پیام خطا
                errorMessage.textContent = result.message;
            }
        } catch (error) {
            console.error('Error during login:', error);
            errorMessage.textContent = 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
        } finally {
            // فعال کردن مجدد دکمه ورود
            loginButton.disabled = false;
            loginButton.textContent = 'ورود';
        }
    });
});
