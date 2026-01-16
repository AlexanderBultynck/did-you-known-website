const factContainer = document.getElementById('fact');
const newFactButton = document.getElementById('new-fact-button');
const copyButton = document.getElementById('copy-button');
const shareButton = document.getElementById('share-button');
const spinner = document.getElementById('loading-spinner');
const statusMessage = document.getElementById('status-message');

const FACT_URL = 'https://uselessfacts.jsph.pl/random.json?language=en';

let prefetched = null; // store a prefetched fact
let isLoading = false;
let currentController = null;

async function getFactFromApi(signal) {
    const res = await fetch(FACT_URL, { cache: 'no-store', signal });
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
}

async function fetchFact(usePrefetch = true) {
    if (isLoading) return;
    setLoading(true);
    statusMessage.textContent = '';
    // abort any in-flight fetch for a fresh one
    if (currentController) {
        try { currentController.abort(); } catch (e) { }
    }
    currentController = new AbortController();
    const { signal } = currentController;
    try {
        let data;
        if (usePrefetch && prefetched) {
            data = prefetched;
            prefetched = null;
            // kick off a new prefetch in background
            prefetchFact().catch(() => { });
        } else {
            data = await getFactFromApi(signal);
        }

        // reveal animation and announce to assistive tech
        factContainer.textContent = data.text || 'No fact received.';
        factContainer.classList.remove('reveal');
        void factContainer.offsetWidth;
        factContainer.classList.add('reveal');
        statusMessage.textContent = '';
        // focus the fact for screen reader users only when the page isn't focused on another control
        if (document.activeElement === document.body) {
            try { factContainer.focus({ preventScroll: true }); } catch (e) { }
        }
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
        const controller = new AbortController();
        const data = await getFactFromApi(controller.signal);
        prefetched = data;
    } catch (e) {
        prefetched = null;
    }
}

async function copyFact() {
    const text = factContainer.textContent.trim();
    if (!text) return;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                // fallthrough to execCommand fallback
                console.debug('clipboard.writeText failed, falling back to execCommand', e);
                throw e;
            }
        } else {
            // execCommand fallback for older browsers / insecure contexts
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('aria-hidden', 'true');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = (window.scrollY || 0) + 'px';
            textarea.readOnly = true; // for iOS
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            textarea.setSelectionRange(0, textarea.value.length);
            const ok = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (!ok) throw new Error('execCommand failed');
        }
        statusMessage.textContent = 'Copied to clipboard!';
        setTimeout(() => { if (statusMessage.textContent === 'Copied to clipboard!') statusMessage.textContent = ''; }, 2000);
        return true;
    } catch (e) {
        console.error('Copy failed:', e);
        const msg = (e && (e.name === 'NotAllowedError' || e.message && e.message.toLowerCase().includes('permission'))) ?
            'Copy failed (permission denied). Use manual copy.' :
            'Copy failed. Try selecting the text.';
        statusMessage.textContent = msg;
        return false;
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
        // fallback: try to copy; if that fails, show a prompt so user can copy manually
        const copied = await copyFact();
        if (!copied) {
            try {
                window.prompt('Copy the fact below (Ctrl+C/Cmd+C):', text);
            } catch (e) {
                statusMessage.textContent = 'Unable to share. Please copy the text manually.';
            }
        } else {
            statusMessage.textContent = 'Fact copied — paste it to share!';
            setTimeout(() => { if (statusMessage.textContent.startsWith('Fact copied')) statusMessage.textContent = ''; }, 2000);
        }
    }
}

// Keyboard shortcuts (avoid overriding native behavior on interactive elements)
window.addEventListener('keydown', (e) => {
    const target = e.target;
    if (target && target instanceof Element) {
        if (target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
    }
    if (e.code === 'Space') {
        e.preventDefault();
        fetchFact();
        return;
    }
    if (e.key.toLowerCase() === 'c') {
        copyFact();
        return;
    }
    if (e.key.toLowerCase() === 's') {
        shareFact();
        return;
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

// enable/disable controls while loading
function setLoading(val) {
    isLoading = val;
    spinner.setAttribute('aria-hidden', String(!val));
    newFactButton.disabled = val;
    copyButton.disabled = val;
    shareButton.disabled = val;
}
