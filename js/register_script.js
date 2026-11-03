document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const regBtn = document.getElementById('regBtn');

    // 1. Toggle Password Visibility (The Eye Icon)
    togglePassword.addEventListener('click', () => {
        // Switch input type
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Switch the FontAwesome icon classes
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
    });

    // 2. Handle Form Submission (AJAX Fetch)
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get current values from the form fields
        const fullname = document.getElementById('fullname').value;
        const username = document.getElementById('username').value;
        const password = passwordInput.value;
        const role = document.getElementById('role').value;

        // UI Feedback: Disable button and show loading status
        regBtn.innerText = "REGISTERING...";
        regBtn.disabled = true;

        try {
            // Send data to the PHP file in the 'api' folder
            const response = await fetch('api/register_process.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-form-urlencoded' },
                body: new URLSearchParams({
                    'fullname': fullname,
                    'username': username,
                    'password': password,
                    'role': role
                })
            });

            // Parse the JSON response from PHP
            const data = await response.json();

            if (data.status === 'success') {
                alert("Registered successfully!");
                window.location.href = 'login.php'; // Redirect to login page
            } else {s
                alert(data.message || "Registration failed.");
                resetButton(); // Allow the user to try again
            }
        } catch (error) {
            console.error('Error:', error);
            alert("Connection error. Please check if your Apache/MySQL server is running.");
            resetButton(); // Allow the user to try again
        }
    });

    // Function to restore the button to its original state
    function resetButton() {
        regBtn.innerText = "REGISTER";
        regBtn.disabled = false;
    }
});