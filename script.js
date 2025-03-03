const factContainer = document.getElementById('fact');
const newFactButton = document.getElementById('new-fact-button');

async function fetchFact() {
    try {
        const response = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
        const data = await response.json();
        factContainer.textContent = data.text;
    } catch (error) {
        factContainer.textContent = 'Oops! Something went wrong. Please try again.';
        console.error('Error fetching fact:', error);
    }
}

// Load an initial fact
fetchFact();

// Load a new fact when the button is clicked
newFactButton.addEventListener('click', fetchFact);
