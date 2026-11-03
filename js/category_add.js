function initCategoryForm() {
    const form = document.getElementById('categoryForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const description = document.getElementById('description').value.trim();
        const status = document.getElementById('status').value;

        if (name === "") {
            alert("Category name is required");
            return;
        }

        const formData = new URLSearchParams();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('status', status);

        // Fetch matches the Flutter http.post(api("category_add.php"))
        fetch('api/category_add.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            alert(result.message || "Saved");
            if (result.success) {
                form.reset();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Error: " + error);
        });
    });
}