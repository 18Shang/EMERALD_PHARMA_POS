// Function to navigate to PHP pages
function navigate(url) {
  window.location.href = url;
}

// Adjust hero height to always fill viewport
function adjustHeroHeight() {
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.style.height = window.innerHeight + 'px';
  }
}

window.addEventListener('resize', adjustHeroHeight);
window.addEventListener('load', adjustHeroHeight);