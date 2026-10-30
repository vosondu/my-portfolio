// Brand discovery questionnaire.
// Links to send clients:
//   /questionnaire?tier=lite      sections A to F
//   /questionnaire?tier=standard  sections A to F + G
//   /questionnaire?tier=full      sections A to F + G, plus a "role" field (send one per decision-maker)
// To change a question, edit the text below. Keep it in sync with the Brand Discovery Questionnaire doc.

(function () {
	const SECTIONS = [
		{ key: 'A', title: 'A. The business', questions: [
			{ q: 'In one or two sentences, what does your business do and for whom?' },
			{ q: 'Why did you start it? What gap or frustration were you responding to?' },
			{ q: 'Where do you want the business to be in 3 years? Be as specific as you can (locations, revenue, number of customers, new products).' },
			{ q: 'What are the 3 values you would refuse to compromise on, even if it cost you money?' },
			{ q: 'What do you sell, and which product or service brings in the most money?' },
		] },
		{ key: 'B', title: 'B. The problem', questions: [
			{ q: 'Why are you investing in your brand now? What changed?' },
			{ q: 'What is your current brand (or lack of one) costing you? For example: losing customers to competitors, being underpriced, looking smaller than you are.' },
			{ q: 'If this project succeeds, what will be different in 12 months? How will you know?' },
			{ q: 'What has already been tried, and why didn’t it work?' },
		] },
		{ key: 'C', title: 'C. Audience', questions: [
			{ q: 'Describe your best customer: who they are, what they care about, and why they chose you.' },
			{ q: 'Who do you want more of? Is that different from who you serve now?' },
			{ q: 'Where do your customers find you, and where do they ask about you (Instagram, WhatsApp, referrals, Google, walk-ins)?' },
			{ q: 'What do customers say when they recommend you? Quote them if you can.' },
		] },
		{ key: 'D', title: 'D. Competition', questions: [
			{ q: 'Name 3 to 5 competitors, with their Instagram handles or websites if possible.' },
			{ q: 'What do they do better than you? Be honest.' },
			{ q: 'What do you do that none of them can easily copy?' },
			{ q: 'Name 1 or 2 brands (any industry, anywhere in the world) whose presence you admire. What specifically do you admire?' },
		] },
		{ key: 'E', title: 'E. Current brand and voice', questions: [
			{ q: 'Please share everything you currently use: logo, social pages, flyers, packaging, signage, website, business cards.', help: 'Paste links (Instagram, website, or a Google Drive folder). You can also send photos to me on WhatsApp.' },
			{ q: 'What works about your current brand, and what embarrasses you?' },
			{ q: 'Pick 3 words you want people to use when describing your brand, and 3 words you never want associated with it.' },
			{ q: 'If your brand were a person walking into a room, how would they speak and carry themselves?' },
			{ q: 'Is there anything you are attached to and want to keep (a name, a colour, a symbol)? Why?' },
		] },
		{ key: 'F', title: 'F. Project scope and practicalities', questions: [
			{ q: 'Where will the brand appear first? List the touchpoints that matter most in the next 6 months.' },
			{ q: 'Who makes the final decision on this project? Who else needs to be consulted?' },
			{ q: 'Are there any fixed deadlines (a launch, an event, a product release)?' },
			{ q: 'Is there anything else I should know that these questions didn’t cover?', optional: true },
		] },
		{ key: 'G', title: 'G. Going deeper', questions: [
			{ q: 'What does your business stand for beyond making money? If it disappeared tomorrow, what would customers miss?' },
			{ q: 'Where do you sit on price compared to competitors: premium, mid-market, or affordable? Is that where you want to be?' },
			{ q: 'What are the most common objections or doubts customers raise before buying?' },
			{ q: 'Can you connect me with 3 to 5 customers (past or current) for a 15-minute chat?', help: 'Names and phone numbers are enough. I’ll reach out politely and keep it brief.', optional: true },
			{ q: 'What does internal decision-making look like? Has a previous creative project stalled, and why?' },
			{ q: 'Are there plans that will affect the brand soon: new markets, new products, investors, rebranding a sub-brand?' },
			{ q: 'What budget is set aside for rolling out the brand after this project (printing, signage, ads, website)?' },
		] },
	];

	const TIERS = {
		lite: { label: 'Lite', keys: ['A', 'B', 'C', 'D', 'E', 'F'], role: false },
		standard: { label: 'Standard', keys: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], role: false },
		full: { label: 'Full', keys: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], role: true },
	};

	// Web3Forms emails you a copy of every submission (same key as the contact form)
	const WEB3FORMS_KEY = '6f7eea82-8ff3-4fec-aff4-9cf417bcae4c';

	const tierKey = (new URLSearchParams(window.location.search).get('tier') || 'lite').toLowerCase();
	const tier = TIERS[tierKey] || TIERS.lite;

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
			wrap.appendChild(textarea);
			fieldset.appendChild(wrap);
			n++;
		});
		holder.appendChild(fieldset);
	});

	// Restore any unfinished answers saved on this device
	const draft = window.initDraft
		? window.initDraft(form, 'questionnaire-' + tierKey)
		: { restored: false, clear: function () {} };
	if (draft.restored) {
		statusEl.textContent = 'Welcome back. Your saved answers have been restored.';
	}

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
		const business = answers.Business || 'Unknown business';

		try {
			const res = await fetch('https://api.web3forms.com/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify(Object.assign({
					access_key: WEB3FORMS_KEY,
					subject: 'Questionnaire (' + tier.label + '): ' + business,
					from_name: 'victorosondu.com',
					Tier: tier.label,
				}, answers)),
			});
			const json = await res.json();
			if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
			if (window.sendToSheet) window.sendToSheet('Questionnaire ' + tier.label, Object.assign({ Tier: tier.label }, answers));
			draft.clear();
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
