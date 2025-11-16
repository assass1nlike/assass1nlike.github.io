document.querySelector('.toggle-details').addEventListener('click', function(event) {
    event.preventDefault();
    const details = document.querySelector('.details');
    if (details.style.display === "none") {
        details.style.display = "block";
    } else {
        details.style.display = "none";
    }
});
