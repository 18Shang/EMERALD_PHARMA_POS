// ── Particles (pure JS, no library) ──────────────────
(function() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = 1.5 + Math.random() * 3;
        p.style.cssText = `
            left:${Math.random()*100}%;
            bottom:${Math.random()*10}%;
            width:${size}px; height:${size}px;
            animation-duration:${7+Math.random()*12}s;
            animation-delay:${Math.random()*12}s;
        `;
        container.appendChild(p);
    }
})();

// ── Login form ────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.getElementById('role').value;
    const btn      = document.getElementById('loginBtn');
    const errEl    = document.getElementById('errorMsg');

    errEl.classList.remove('show');
    btn.textContent = 'Signing in...';
    btn.disabled    = true;

    try {
        const res  = await fetch("api/login.php", {
            method:  "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body:    `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });
        const data = await res.json();

        if (data.status === "success") {
            const serverRole = data.role.toLowerCase().trim();
            if (serverRole !== role) {
                showError("Incorrect role selected for this account.");
            } else {
                btn.textContent = "✓ Redirecting...";
                setTimeout(() => {
                    window.location.href = `${serverRole}/${serverRole}_dashboard.php`;
                }, 500);
                return;
            }
        } else {
            showError(data.message || "Invalid username or password.");
        }
    } catch(err) {
        showError("Connection error. Please try again.");
    }

    btn.textContent = "SIGN IN";
    btn.disabled    = false;
});

function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = '. ' + msg;
    el.classList.remove('show');
    void el.offsetWidth; // restart animation
    el.classList.add('show');
}

// ── Password toggle ───────────────────────────────────
document.getElementById('togglePassword').addEventListener('click', function() {
    const pwd   = document.getElementById('password');
    const isHid = pwd.type === 'password';
    pwd.type        = isHid ? 'text' : 'password';
    this.textContent = isHid ? '.' : '👁';
});