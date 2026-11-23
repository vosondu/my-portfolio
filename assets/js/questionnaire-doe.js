// Brand discovery questionnaire, Daughter of Ellen (DoE) edition.
// NGO wording (funders, partners and the people served instead of customers and price), plus a section H for DoE specifics.
// Links:
//   /questionnaire-doe                 sections A to H (default)
//   /questionnaire-doe?tier=lite       sections A to F + H
//   /questionnaire-doe?tier=full       sections A to H, plus a "role" field (send one per decision-maker)
//
// Pre-filled answers (optional):
//   If a file defining window.DOE_PREFILL loads BEFORE this script, matching questions open with a draft answer
//   for the client to confirm or correct. Keys are the question ids below (A1, A2, ... H7).
//   This file itself contains no content from DoE's guidelines. The draft answers live in questionnaire-doe-prefill.js.
//
// To change a question, edit the text below. Keep it in sync with the NGO Brand Discovery Questionnaire doc.
// Drafts save under their own key, so this never overwrites the standard or generic NGO questionnaire on the same device.

(function () {
	const SECTIONS = [
		{ key: 'A', title: 'A. The organisation', questions: [
			{ id: 'A1', q: 'In one or two sentences, what does Daughter of Ellen do, and for whom?' },
			{ id: 'A2', q: 'Why was it started? What injustice or gap were you responding to?' },
			{ id: 'A3', q: 'Where do you want Daughter of Ellen to be in 3 years? Be as specific as you can (regions, people reached, programmes, funding, policy outcomes).' },
			{ id: 'A4', q: 'What are the 3 values you would refuse to compromise on, even if it cost you a donor or a partnership?' },
			{ id: 'A5', q: 'What programmes do you run, and how is each one funded? Which reaches the most people, and which brings in the most funding?' },
		] },
		{ key: 'B', title: 'B. The problem', questions: [
			{ id: 'B1', q: 'Why are you redesigning the logo now? What changed, and who first raised it?' },
			{ id: 'B2', q: 'What is the current logo and brand costing you? For example: weaker donor trust, looking smaller than you are, being confused with another organisation, partners not taking you seriously.' },
			{ id: 'B3', q: 'If this project succeeds, what will be different in 12 months? How will you know?' },
			{ id: 'B4', q: 'What has already been tried, and why didn’t it work?' },
		] },
		{ key: 'C', title: 'C. Audiences', questions: [
			{ id: 'C1', q: 'Describe the people you serve most: who they are, what they care about, and how they found you.', help: 'Please don’t include names or identifying details of the people you serve, especially children, unless they have given consent.' },
			{ id: 'C2', q: 'Describe your most important funders and partners: who they are, why they back you, and what they need to see from you.' },
			{ id: 'C3', q: 'Which of these groups do you want more of? Is that different from who you reach now?' },
			{ id: 'C4', q: 'Where do people find you, and where do they ask about you (Instagram, WhatsApp, referrals, Google, conferences, events)?' },
			{ id: 'C5', q: 'What do people say when they recommend you? Quote them if you can.' },
		] },
		{ key: 'D', title: 'D. The landscape', questions: [
			{ id: 'D1', q: 'Name 3 to 5 peer organisations, whether they compete for the same funding, serve the same people, or work on the same cause. Include Instagram handles or websites if possible. Is there any you do not want to be confused with?' },
			{ id: 'D2', q: 'What do they do better than you? Be honest.' },
			{ id: 'D3', q: 'What do you do that none of them can easily copy, and how do you know?' },
			{ id: 'D4', q: 'Name 1 or 2 brands (any sector, anywhere in the world) whose presence you admire. What specifically do you admire?' },
		] },
		{ key: 'E', title: 'E. Current brand and voice', questions: [
			{ id: 'E1', q: 'Please share everything you currently use: logo, social pages, flyers, reports, signage, website, merchandise.', help: 'Paste links (Instagram, website, or a Google Drive folder). You can also send photos to me on WhatsApp.' },
			{ id: 'E2', q: 'What works about the current logo and brand, and what embarrasses you?' },
			{ id: 'E3', q: 'Pick 3 words you want people to use when describing Daughter of Ellen, and 3 words you never want associated with it.' },
			{ id: 'E4', q: 'If your brand were a person walking into a room, how would they speak and carry themselves?' },
			{ id: 'E5', q: 'Is there anything you are attached to and want to keep (a name, a colour, a symbol)? Why?' },
			{ id: 'E6', q: 'Are there words, images, or symbols that the community you serve finds outdated or disrespectful? Who should be shown in your imagery, and who decides?', help: 'For example: symbols, phrases, or pictures that feel patronising, or that people you serve have asked you to stop using.' },
		] },
		{ key: 'F', title: 'F. Project scope and practicalities', questions: [
			{ id: 'F1', q: 'Where will the new logo appear first? List the touchpoints that matter most in the next 6 months, including funding proposals, reports, and event materials.' },
			{ id: 'F2', q: 'Who makes the final decision on this project? Who else (board, founder, community representatives) needs to be consulted?' },
			{ id: 'F3', q: 'Are there any fixed deadlines (a conference, a grant submission, a campaign, a launch)?' },
			{ id: 'F4', q: 'Do any funders or partners require co-branding, logo placement, or approval of your materials?' },
			{ id: 'F5', q: 'Is there anything else I should know that these questions didn’t cover?', optional: true },
		] },
		{ key: 'G', title: 'G. Going deeper', questions: [
			{ id: 'G1', q: 'What does Daughter of Ellen stand for beyond its programmes? If it disappeared tomorrow, who would lose what?' },
			{ id: 'G2', q: 'How do you want to be seen next to your peers: grassroots, professional institution, movement, or a mix? Is that where you are now?' },
			{ id: 'G3', q: 'What doubts or objections do donors, partners, or communities raise before backing you?' },
			{ id: 'G4', q: 'Can you connect me with 3 to 5 people (partners, volunteers, caregivers, or past donors) for a 15-minute chat?', help: 'Names and phone numbers are enough, and only with their consent. I’ll reach out politely and keep it brief.', optional: true },
			{ id: 'G5', q: 'What does internal decision-making look like? Has a previous creative project stalled, and why?' },
			{ id: 'G6', q: 'Are there plans that will affect the brand soon: new regions, new programmes, formal registration, sub-brands, partnerships, mergers?' },
			{ id: 'G7', q: 'What budget is set aside for rolling out the new brand after this project (printing, signage, ads, website)? Is any of it restricted grant money with spending rules?' },
		] },
		{ key: 'H', title: 'H. Daughter of Ellen specifics', questions: [
			{ id: 'H1', q: 'Who is Ellen, and how much of that story should the brand carry: the name only, a visual hint, or the full story? Does anyone need to give permission for it to be used?' },
			{ id: 'H2', q: 'Is formal NGO registration complete? What is the exact legal name that should appear on the logo and on official documents?' },
			{ id: 'H3', q: 'How should the Evon Anthony Brand appear with the logo: always (as part of the logo lockup), only on some materials, or never?' },
			{ id: 'H4', q: 'Today TENDE has its own logo, while DOE Academy and Early Explorers materials use the Daughter of Ellen logo. Should that stay the same after the redesign? Should the TENDE logo change to work with the new main logo, and how should “by DOE” appear?' },
			{ id: 'H5', q: 'Does the identity need to be neurodiversity-friendly (strong contrast, plain language, calm layouts)? Have the people you serve told you what works or does not work for them visually?', help: 'For example: low vision, dyslexia, sensory sensitivity, or visual cues the community dislikes.' },
			{ id: 'H6', q: 'The guidelines and the master logo do not fully match each other (which logo version is official, clear space, which colours are official, gradients). Which version is final?' },
			{ id: 'H7', q: 'Please send the original logo files (vector or editable source if you have them) and any earlier versions. Which parts of the current logo are fixed and which are open to change: the symbol, the ring, the wordmark? Do you also need simplified versions for small sizes and one-colour use?' },
		] },
	];

	const TIERS = {
		lite: { label: 'Lite', keys: ['A', 'B', 'C', 'D', 'E', 'F', 'H'], role: false },
		standard: { label: 'Standard', keys: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], role: false },
		full: { label: 'Full', keys: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], role: true },
	};

	// Draft answers to confirm, if questionnaire-doe-prefill.js was loaded first
	const PREFILL = window.DOE_PREFILL || {};
	const PREFILL_MARKER = '[Draft for you to confirm. Please correct or replace anything that is wrong, then delete this line.]\n\n';

	// Web3Forms emails you a copy of every submission (same key as the contact form)
	const WEB3FORMS_KEY = '6f7eea82-8ff3-4fec-aff4-9cf417bcae4c';

	// Saved drafts are stored per DRAFT_VERSION. Bump it when you change the pre-filled text or the questions
	// BEFORE the client has started, so nobody is shown an old saved copy. Do not bump it once she has begun, or her saved answers are hidden.
	const DRAFT_VERSION = 'v6';

	// Standard is the default here: this page is sent to one client, so there is no reason to default to lite
	const tierKey = (new URLSearchParams(window.location.search).get('tier') || 'standard').toLowerCase();
	const tier = TIERS[tierKey] || TIERS.standard;

	const form = document.getElementById('q-form');
	const holder = document.getElementById('q-sections');
	const roleField = document.getElementById('q-role-field');
	const statusEl = document.getElementById('form-status');
	const submitBtn = document.getElementById('form-submit');
	const successEl = document.getElementById('q-success');
	if (!form || !holder) return;

	if (tier.role) {
		roleField.hidden = false;
		document.getElementById('q-role').required = true;
	}

	// Build the questions for this tier, numbered continuously
	let n = 1;
	SECTIONS.filter(function (s) { return tier.keys.indexOf(s.key) !== -1; }).forEach(function (section) {
		const fieldset = document.createElement('fieldset');
		fieldset.className = 'q-section';
		const legend = document.createElement('legend');
		legend.className = 'q-section-title white';
		legend.textContent = section.title;
		fieldset.appendChild(legend);

		section.questions.forEach(function (item) {
			const id = 'q' + n;
			const wrap = document.createElement('div');
			wrap.className = 'field';
			const label = document.createElement('label');
			label.setAttribute('for', id);
			label.textContent = n + '. ' + item.q + (item.optional ? ' (optional)' : '');
			wrap.appendChild(label);
			if (item.help) {
				const help = document.createElement('p');
				help.className = 'muted q-help';
				help.textContent = item.help;
				wrap.appendChild(help);
			}
			const textarea = document.createElement('textarea');
			textarea.id = id;
			textarea.name = n + '. ' + item.q;
			if (!item.optional) textarea.required = true;
			if (PREFILL[item.id]) {
				textarea.defaultValue = PREFILL_MARKER + PREFILL[item.id];
				textarea.setAttribute('data-prefilled', '1');
			}
			wrap.appendChild(textarea);
			fieldset.appendChild(wrap);
			n++;
		});
		holder.appendChild(fieldset);
	});

	// Restore any unfinished answers saved on this device (edited answers win over the draft text)
	const draft = window.initDraft
		? window.initDraft(form, 'questionnaire-doe-' + DRAFT_VERSION + '-' + tierKey)
		: { restored: false, clear: function () {} };

	form.addEventListener('submit', async function (e) {
		e.preventDefault();
		statusEl.classList.remove('is-error');

		const firstEmpty = form.querySelector(':invalid');
		if (firstEmpty) {
			statusEl.classList.add('is-error');
			statusEl.textContent = 'A few required questions are still empty. Write “not sure” if you don’t know.';
			firstEmpty.focus();
			return;
		}
		if (form.querySelector('[name="botcheck"]').checked) return;

		statusEl.textContent = 'Sending...';
		submitBtn.disabled = true;

		const answers = {};
		new FormData(form).forEach(function (value, key) {
			if (key !== 'botcheck') answers[key] = value;
		});
		// How many draft answers were sent without the "confirm" line being removed
		const unconfirmed = Array.prototype.filter.call(form.querySelectorAll('textarea[data-prefilled]'), function (t) {
			return t.value.indexOf(PREFILL_MARKER) === 0;
		}).length;
		// The name field may be called Business or Organisation depending on the page markup
		const org = answers.Organisation || answers.Business || 'Daughter of Ellen';

		try {
			const res = await fetch('https://api.web3forms.com/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify(Object.assign({
					access_key: WEB3FORMS_KEY,
					subject: 'DoE Questionnaire (' + tier.label + '): ' + org,
					from_name: 'victorosondu.com',
					Tier: tier.label,
					Variant: 'NGO, DoE',
					Unconfirmed_draft_answers: String(unconfirmed),
				}, answers)),
			});
			const json = await res.json();
			if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
			if (window.sendToSheet) window.sendToSheet('DoE Questionnaire ' + tier.label, Object.assign({ Tier: tier.label, Variant: 'NGO, DoE', Unconfirmed_draft_answers: String(unconfirmed) }, answers));
			draft.clear();
			statusEl.textContent = '';
			form.hidden = true;
			successEl.hidden = false;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (err) {
			statusEl.classList.add('is-error');
			statusEl.textContent = 'Something went wrong. Please try again, or email hello@victorosondu.com. Your answers are still on this page.';
		} finally {
			submitBtn.disabled = false;
		}
	});
})();
