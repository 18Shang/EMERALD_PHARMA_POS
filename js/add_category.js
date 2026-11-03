function showMessage(message){
let snackbar = document.getElementById("snackbar");
snackbar.innerText = message;
snackbar.className = "show";

setTimeout(function(){
snackbar.className = snackbar.className.replace("show","");
},3000);
}

function saveCategory(){

let name = document.getElementById("name").value.trim();
let description = document.getElementById("description").value.trim();
let status = document.getElementById("status").value;

if(name === ""){
showMessage("Category name is required");
return;
}

let formData = new FormData();
formData.append("name", name);
formData.append("description", description);
formData.append("status", status);

fetch("http://127.0.0.1:8080/api/category_add.php",{
method:"POST",
body:formData
})
.then(res => res.json())
.then(data => {

showMessage(data.message || "Saved");

if(data.success === true){
document.getElementById("categoryForm").reset();
}

})
.catch(err=>{
showMessage("Error: "+err);
});

}