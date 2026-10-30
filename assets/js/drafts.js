// Saves form answers on the visitor's own device as they type, so they can
// close the page and finish later on the same phone or computer.
// Nothing is sent anywhere until they press submit. Drafts are cleared on a
// successful submit and expire after 30 days.

(function () {
	const PREFIX = 'vo-draft:';
	const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
	const SKIP = ['access_key', 'botcheck', 'subject', 'from_name'];

	function storage() {
		try {
			const s = window.localStorage;
			s.setItem(PREFIX + 'test', '1');
			s.removeItem(PREFIX + 'test');
			return s;
		} catch (e) {
			return null;
		}
	}

	function fields(form) {
		return Array.prototype.filter.call(form.elements, function (el) {
			return el.name && SKIP.indexOf(el.name) === -1 && el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button';
		});
	}

	// Returns { restored: boolean, clear: function }
	window.initDraft = function (form, key) {
		const store = storage();
		if (!form || !store) return { restored: false, clear: function () {} };
		const id = PREFIX + key;
		let restored = false;

		try {
			const saved = JSON.parse(store.getItem(id) || 'null');
			if (saved && Date.now() - saved.t < MAX_AGE) {
				fields(form).forEach(function (el) {
					if (!(el.name in saved.v)) return;
					const value = saved.v[el.name];
					if (el.type === 'radio' || el.type === 'checkbox') {
						el.checked = Array.isArray(value) ? value.indexOf(el.value) !== -1 : el.value === value;
					} else if (value !== '') {
						el.value = value;
						restored = true;
					}
				});
			} else if (saved) {
				store.removeItem(id);
			}
		} catch (e) {}

		let timer;
		function save() {
			clearTimeout(timer);
			timer = setTimeout(function () {
				const v = {};
				fields(form).forEach(function (el) {
					if (el.type === 'radio') {
						if (el.checked) v[el.name] = el.value;
					} else if (el.type === 'checkbox') {
						v[el.name] = v[el.name] || [];
						if (el.checked) v[el.name].push(el.value);
					} else {
						v[el.name] = el.value;
					}
				});
				try { store.setItem(id, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
			}, 400);
		}
		form.addEventListener('input', save);
		form.addEventListener('change', save);

		return {
			restored: restored,
			clear: function () {
				clearTimeout(timer);
				try { store.removeItem(id); } catch (e) {}
			},
		};
	};
})();
