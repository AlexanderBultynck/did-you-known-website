const factContainer = document.getElementById('fact');
const newFactButton = document.getElementById('new-fact-button');
const copyButton = document.getElementById('copy-button');
const shareButton = document.getElementById('share-button');
const spinner = document.getElementById('loading-spinner');
const statusMessage = document.getElementById('status-message');

const FACT_URL = 'https://uselessfacts.jsph.pl/random.json?language=en';

let prefetched = null; // store a prefetched fact
let isLoading = false;

function setLoading(val) {
    isLoading = val;
    spinner.setAttribute('aria-hidden', String(!val));
}

async function getFactFromApi() {
    const res = await fetch(FACT_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
}

async function fetchFact(usePrefetch = true) {
    if (isLoading) return;
    setLoading(true);
    statusMessage.textContent = '';

    try {
        let data;
        if (usePrefetch && prefetched) {
            data = prefetched;
            prefetched = null;
            // kick off a new prefetch in background
            prefetchFact().catch(() => { });
        } else {
            data = await getFactFromApi();
        }

        // reveal animation
        factContainer.textContent = data.text || 'No fact received.';
        factContainer.classList.remove('reveal');
        // force reflow then add class to restart animation
        void factContainer.offsetWidth;
        factContainer.classList.add('reveal');
        statusMessage.textContent = '';
    } catch (err) {
        console.error('Error fetching fact:', err);
        factContainer.textContent = 'Oops! Something went wrong. Try again.';
        statusMessage.textContent = 'Failed to load a fact. Check your connection.';
    } finally {
        setLoading(false);
    }
}

async function prefetchFact() {
    try {
        const data = await getFactFromApi();
        prefetched = data;
    } catch (e) {
        // ignore prefetch errors, we'll try again later
        prefetched = null;
    }
}

async function copyFact() {
    const text = factContainer.textContent.trim();
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        statusMessage.textContent = 'Copied to clipboard!';
        setTimeout(() => { if (statusMessage.textContent === 'Copied to clipboard!') statusMessage.textContent = ''; }, 2000);
    } catch (e) {
        statusMessage.textContent = 'Copy failed. Try selecting the text.';
    }
}

async function shareFact() {
    const text = factContainer.textContent.trim();
    if (!text) return;
    if (navigator.share) {
        try {
            await navigator.share({ title: 'Did You Know?', text });
        } catch (e) {
            // user probably cancelled
        }
    } else {
        // fallback: copy to clipboard and notify
        await copyFact();
    }
}

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.code === 'Space') {
        e.preventDefault();
        fetchFact();
    }
    if (e.key.toLowerCase() === 'c') {
        copyFact();
    }
    if (e.key.toLowerCase() === 's') {
        shareFact();
    }
});

// Wire up buttons
newFactButton.addEventListener('click', () => fetchFact());
copyButton.addEventListener('click', copyFact);
shareButton.addEventListener('click', shareFact);

// initial load
fetchFact(false).then(() => prefetchFact());

// periodic prefetch to keep things snappy
setInterval(() => { if (!prefetched) prefetchFact(); }, 30_000);
