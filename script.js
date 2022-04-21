let data;
const sortby = { order: 'ASC', col: 'popularity_rank' };
let displayMode = 'cards';
let cardTemplate;

window.onload = () => {
	cardTemplate = document.querySelector('template');
};

// ################### FORMATTING ##################

function numberWithCommas(x) {
	return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',') || x;
}

const sqlFormatDate = (date) => date.toISOString().split('T')[0];

// conditional formatting of plural words eg day => days
const sCheck = (num) => (num > 1 ? 's' : '');

function formatDisplayString(text) {
	return text[0].toUpperCase() + text.slice(1).replaceAll('_', ' ');
}

// ################### DATES ##################

// Check in / checkout input validation
const checkin = document.getElementById('checkin');
const checkout = document.getElementById('checkout');

checkin.valueAsDate = new Date();
checkout.valueAsDate = new Date(new Date().setDate(new Date().getDate() + 7));

checkout.min = checkin.value;
checkin.onchange = (ev) => (checkout.min = ev.target.value);

function getCheckinDates() {
	let checkin = document.getElementById('checkin').valueAsDate;
	const checkout = document.getElementById('checkout').valueAsDate;

	const incrementDate = (date) => {
		let result = new Date(date);
		result.setDate(result.getDate() + 1);
		return result;
	};

	let dates = [];
	while (checkin <= checkout) {
		dates.push(checkin);
		checkin = incrementDate(checkin);
	}

	return dates;
}

//################### DATABASE ##################

async function getVenueData() {
	let cateringGrade = document.getElementById('catering').value;
	let partySizeHTML = document.getElementById('partySize');
	let partySize = partySizeHTML.value;
	let checkout = sqlFormatDate(document.getElementById('checkout').valueAsDate);
	let checkin = sqlFormatDate(document.getElementById('checkin').valueAsDate);

	// input validation
	// (extends html validation to ensure functionality when using auto-update ie no submit)
	if (+partySize < 1) {
		partySizeHTML.value = 1;
		return alert(`invalid input for party size: must be number over 1`);
	}

	if (+cateringGrade < 1 || +cateringGrade > 5) {
		document.getElementById('catering').value = 1;
		return alert(`invalid input for catering grade: Must be between 1 and 5.`);
	}

	if (new Date(checkin) > new Date(checkout)) {
		const checkin = document.getElementById('checkin');
		const checkout = document.getElementById('checkout');
		checkin.valueAsDate = checkout.valueAsDate;
		checkout.min = sqlFormatDate(checkin.valueAsDate);
		return alert(
			`invalid input for date range: start range must be before end range`
		);
	}

	// get data
	try {
		const response = await fetch(
			`get-venue-details.php?checkin=${checkin}&checkout=${checkout}&partySize=${partySize}&cateringGrade=${cateringGrade}`
		);
		if (!response.ok) {
			throw new Error('HTTP Error: ', response.status);
		}
		let venues = await response.json();
		return venues;
	} catch (err) {
		console.error(err);
	}
}

async function getVenueBookings(name) {
	let checkin = sqlFormatDate(document.getElementById('checkin').valueAsDate);
	let checkout = sqlFormatDate(document.getElementById('checkout').valueAsDate);

	try {
		const response = await fetch(
			`get-venue-bookings.php?checkin=${checkin}&checkout=${checkout}&name=${name}`
		);
		if (!response.ok) {
			throw new Error('HTTP Error: ', response.status);
		}
		let bookedDates = await response.json();
		// transform array of objects into array of dates
		return bookedDates.map(({ date }) => new Date(date));
	} catch (err) {
		console.error(err);
	}
}

// ################### RESULTS ##################

// BOOK NOW MODAL COMPONENTS

const createLoadingHTML = () => {
	return `
	<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin:auto;background:#fff;display:block;" width="120px" height="120px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
	<g transform="translate(20 50)">
	<circle cx="0" cy="0" r="6" fill="#e15b64">
		<animateTransform attributeName="transform" type="scale" begin="-0.375s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
	</circle>
	</g><g transform="translate(40 50)">
	<circle cx="0" cy="0" r="6" fill="#f8b26a">
		<animateTransform attributeName="transform" type="scale" begin="-0.25s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
	</circle>
	</g><g transform="translate(60 50)">
	<circle cx="0" cy="0" r="6" fill="#abbd81">
		<animateTransform attributeName="transform" type="scale" begin="-0.125s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
	</circle>
	</g><g transform="translate(80 50)">
	<circle cx="0" cy="0" r="6" fill="#81a3bd">
		<animateTransform attributeName="transform" type="scale" begin="0s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
	</circle>
	</g>
	</svg>
`;
};

async function createDateSelectionHTML(name) {
	function formatDate(date) {
		return `${date.toLocaleDateString()} \
${date.toLocaleString('en', { weekday: 'long' })}`;
	}

	// calc avaiable days
	let bookedDates = (await getVenueBookings(name)).map(formatDate);
	let checkinDates = getCheckinDates().map(formatDate);

	// create form
	const formHTML = document.createElement('form');
	formHTML.classList.add('my-2', 'mx-auto', 'text-nowrap');
	formHTML.id = 'dateSelector';

	// add dates to form
	checkinDates.forEach((date) => {
		let isBooked = bookedDates.includes(date);
		let conditionalDisabled = isBooked ? 'disabled' : '';

		const checkboxHTML = document.createElement('div');
		checkboxHTML.classList.add('form-check');
		checkboxHTML.innerHTML = `
  	<input class="form-check-input" style="margin-top: 0.7rem;" type="checkbox" id="${date}" ${conditionalDisabled}>
  	<label class="form-check-label" for="${date}">
    ${date}</label>
		`.replaceAll(/\n|\t/g, '');

		formHTML.appendChild(checkboxHTML);
	});

	return formHTML;
}

async function changeBookingDetailsModal(name) {
	//TITLE
	document.getElementById('bookModalTitle').innerHTML =
		name + ' Booking Details';

	// DATE SELECTOR
	const modalBody = document.getElementById('bookModalBody');
	modalBody.innerHTML = `<p class="text-center">${createLoadingHTML()}</p>`;

	const dateSelectionHTML = await createDateSelectionHTML(name);
	dateSelectionHTML.addEventListener('change', updatePrices);
	modalBody.innerHTML = '';
	modalBody.appendChild(dateSelectionHTML);

	// UPDATE PRICES
	const { catering_price, weekday_price, weekend_price } = data.find(
		(venue) => venue.name === name
	);
	const partySizeHTML = document.getElementById('partySize');
	const partySize = partySizeHTML.value;

	function updatePrices() {
		let previousContainer = document.getElementById('pricesContainer');
		if (previousContainer) previousContainer.remove();

		// COUNT WEEKENDS/ WEEKDAYS
		let weekendCount = 0;
		let weekdayCount = 0;
		modalBody.querySelectorAll('input[type="checkbox"]').forEach((inputEl) => {
			if (inputEl.checked) {
				let weekday = inputEl.id.split(' ')[1];
				if (weekday === 'Sunday' || weekday === 'Saturday') weekendCount++;
				else weekdayCount++;
			}
		});
		let daysCount = weekdayCount + weekendCount;

		// PRICE VALUES
		let p = {
			catering: catering_price * daysCount * partySize,
			weekdays: weekday_price * weekdayCount,
			weekends: weekend_price * weekendCount,
		};

		p.total = p.catering + p.weekdays + p.weekends;
		p.perPerson = p.total / partySize;

		// PRICE HTML
		const weekendPriceHTML =
			weekendCount < 1
				? ''
				: `<h5>Price for ${weekendCount} weekend day${sCheck(weekendCount)}:
				</h5> <h5 class="text-end">£${numberWithCommas(p.weekends)}</h5>`;

		const weekdayPriceHTML =
			weekdayCount < 1
				? ''
				: `<h5 class="text-start">Price for ${weekdayCount} weekday${sCheck(
						weekdayCount
				  )}:</h5>
			<h5 class="text-end">£${numberWithCommas(p.weekdays)}</h5>`;

		const pricePerPersonHTML =
			partySize <= 1
				? ''
				: `<h5 class="text-start">Total price per person:</h5>
			<h5 class="text-end">£${numberWithCommas(Math.round(p.perPerson))}</h5>
		`;

		// COMPLETE PRICES STRING
		const priceString = `
		<div class="price-grid py-3 px-3 px-sm-5">
			<h5 >Catering for ${daysCount} days:</h5>
			<h5 class="text-end">£${numberWithCommas(
				catering_price * daysCount * partySize
			)}</h5>
			${weekendPriceHTML}
			${weekdayPriceHTML}
		</div>
		<div class="price-grid py-3 justify-content-center text-center w-75 mx-auto">
			<h5 class="fw-semibold text-start">
				Total price for ${partySize} Guest${sCheck(partySize)}:
			</h5>
			<h5 class="fw-bold text-end">£${numberWithCommas(p.total)}</h5>
			${pricePerPersonHTML}
		</div>
	`.replaceAll(/\n|\t/g, '');

		// add
		const pricesHTML = document.createElement('div');
		pricesHTML.id = 'pricesContainer';
		pricesHTML.innerHTML = priceString;
		modalBody.appendChild(pricesHTML);
	}
}

function createBookNowButton() {
	const btn = document.createElement('button');
	btn.classList.add(
		'btn',
		'checkOutSmallBtn',
		'btn-outline-success',
		'd-flex',
		'justify-content-center'
	);
	btn.innerHTML = `<i class="bi bi-calendar-check svg"></i>`;
	btn.setAttribute('data-bs-toggle', 'modal');
	btn.setAttribute('data-bs-target', '#bookModal');
	return btn;
}

function formatRank(num) {
	const j = num % 10;
	const k = num % 100;
	if (j == 1 && k != 11) {
		return num + 'st';
	}
	if (j == 2 && k != 12) {
		return num + 'nd';
	}
	if (j == 3 && k != 13) {
		return num + 'rd';
	}
	return num + 'th';
}

// RENDER VENUE

async function renderCards() {
	const cardTemplate = document.getElementById('venueCard');
	const results = document.getElementById('result');
	results.innerHTML = ``;

	const cardsContainerHTML = document.createElement('div');
	cardsContainerHTML.classList.add('cards-container');
	// if (!data) return;
	data.forEach((venue) => {
		const cardHTML = document.importNode(cardTemplate.content, true);

		// card header image
		cardHTML.querySelector('img').src =
			venue['name'].toLowerCase().replaceAll(' ', '_') + '.avif';

		// card header name
		cardHTML.querySelector('.card-name').innerHTML = venue.name;

		// licensed check
		const icon = cardHTML.querySelector('.verified-icon-container');
		new bootstrap.Tooltip(icon);
		if (venue.licensed === 'No') {
			icon.setAttribute('data-bs-original-title', 'Unlicensed');
			icon.querySelector('svg').setAttribute('fill', 'rgba(20 20 20 / .2)');
			icon.querySelector('svg').setAttribute('stroke', 'lightgray');
			icon.querySelector('rect').style.display = 'none';
		}

		// card body details
		const list = cardHTML.querySelector('ul');
		for (let [col, cell] of Object.entries(venue)) {
			if (
				col === 'weekend_price' ||
				col === 'weekday_price' ||
				col === 'catering_price' ||
				col === 'capacity'
			) {
				list.innerHTML += `
				<li class="list-group-item d-flex justify-content-between">
					<p class="pe-1">${formatDisplayString(col)}:  </p>
					<p class="fw-bolder pe-1 text-end mb-0">
					${col.includes('price') ? '£' : ''}${numberWithCommas(cell)}
					${
						col === 'catering_price'
							? '<a class="ppToolTip text-decoration-none text-black" data-bs-toggle="tooltip" title="per person ASD">pp</a>'
							: ''
					}
					${col === 'capacity' ? 'guests' : ''}
					</p>
				</li>`;
			}
		}

		const ppToolTip = list.querySelector('.ppToolTip');
		new bootstrap.Tooltip(ppToolTip, { boundary: document.body });

		// popularity
		list.innerHTML += `
		<li class="list-group-item d-flex justify-content-between">
			<p class="pe-1">Total bookings:  </p>
			<p class="fw-bolder pe-1 text-end">
			${numberWithCommas(venue.popularity)} (${formatRank(venue.popularity_rank)})</p>
		</li>`;

		//card footer book now btn
		const bookNowBtn = cardHTML.querySelector('.bookNowBtn');

		bookNowBtn.innerHTML += ` (${venue.available_days})`;

		bookNowBtn.addEventListener('click', (ev) => {
			const cardHTML = ev.target.parentNode;
			const name = cardHTML.querySelector('.card-name').innerHTML;
			changeBookingDetailsModal(name);
		});

		cardsContainerHTML.appendChild(cardHTML);
	});
	results.appendChild(cardsContainerHTML);
}

const inverseOrder = () => {
	sortby.order = sortby.order === 'ASC' ? 'DESC' : 'ASC';
};

function renderTable(data) {
	const resultHTML = document.getElementById('result');
	resultHTML.innerHTML = '';

	const tableHTML = document.createElement('table');
	data.forEach((venue, i) => {
		// Create headers
		if (i === 0) {
			const firstRowHTML = document.createElement('tr');
			for (let col in venue) {
				colHTML = document.createElement('th');
				colHTML.innerHTML = formatDisplayString(col);
				colHTML.addEventListener('dblclick', (ev) => {
					const inputCol = ev.target.innerText
						.replaceAll(' ', '_')
						.toLowerCase();

					if (sortby.col === inputCol) inverseOrder();
					else sortby.col = inputCol;

					sortDataByCol();
					conditionalRender(data);
				});
				firstRowHTML.appendChild(colHTML);
			}
			tableHTML.appendChild(firstRowHTML);
		}

		// Create rows
		const rowHTML = document.createElement('tr');

		for (let [col, cell] of Object.entries(venue)) {
			const cellHTML = document.createElement('td');

			// NAME col
			if (col === 'name') {
				cellHTML.classList.add(
					'd-flex',
					'justify-content-between',
					'align-content-center'
				);
				cellHTML.innerHTML += `<h6 class="my-auto">${cell}</h6>`;

				// details btn
				const btnHTML = createBookNowButton();
				btnHTML.onclick = () => changeBookingDetailsModal(cell);
				cellHTML.append(btnHTML);

				// DATA cols
			} else {
				if (col.includes('price')) cell = '£' + cell;
				cellHTML.innerHTML = numberWithCommas(cell);
			}
			rowHTML.appendChild(cellHTML);
		}
		tableHTML.appendChild(rowHTML);
	});

	resultHTML.appendChild(tableHTML);

	// extra info
	const extraInfo = document.createElement('p');
	extraInfo.classList.add('text-center');
	extraInfo.innerHTML =
		'Double press column header to sort. Press again to toggle ascending/ descending.';
	resultHTML.appendChild(extraInfo);
}

// Switch display modes

document.getElementById('settingsModal').onchange = () => {
	sortDataByCol();
	conditionalRender(data);
};

document.getElementById('showTable').onclick = () => (displayMode = 'table');
document.getElementById('showCards').onclick = () => (displayMode = 'cards');

function conditionalRender(data) {
	if (!data.length) {
		document.getElementById(
			'result'
		).innerHTML = `<p class="text-center fs-5">no results to show. Please change the search input and try again.</p>`;
		return;
	}
	if (displayMode === 'table') renderTable(data);
	if (displayMode === 'cards') renderCards(data);
}

async function getVenueDataAndRender() {
	const results = document.getElementById('result');
	results.innerHTML = `
	<p class="text-center">	${createLoadingHTML()}</p>
	${results.innerHTML}`;

	const newData = await getVenueData();
	// prevent invalid input from changing data
	if (newData !== undefined) data = newData;
	else data = await getVenueData();
	sortDataByCol();
	conditionalRender(data);
}

document.querySelector('form').addEventListener('submit', (ev) => {
	ev.preventDefault();
	getVenueDataAndRender();
});

// settings

// SORTING DATA

const sortByContainer = document.getElementById('sortByContainer');

sortByContainer.querySelectorAll('a').forEach((item) => {
	item.addEventListener('click', (ev) => {
		sortby.col = ev.target.innerText.replaceAll(' ', '_').toLowerCase();
		sortDataByCol();

		sortByContainer.querySelector('button').innerHTML = ev.target.innerHTML;
		conditionalRender(data);
	});
});

document.getElementById('sortASC').onclick = () => {
	sortby.order = 'ASC';
	conditionalRender(data);
};

document.getElementById('sortDESC').onclick = () => {
	sortby.order = 'DESC';
	conditionalRender(data);
};

function sortDataByCol() {
	if (!data) return;
	const { col, order } = sortby;
	if (order === 'ASC') data.sort((a, b) => a[col] - b[col]);
	if (order === 'DESC') data.sort((a, b) => b[col] - a[col]);
}

// AUTO-UPDATE

function turnOnAutoUpdate() {
	document.querySelectorAll('input').forEach((inputHTML) => {
		inputHTML.addEventListener('change', getVenueDataAndRender);
	});
	getVenueDataAndRender();
}

if (JSON.parse(localStorage.getItem('autoUpdate'))) {
	turnOnAutoUpdate();
	document.getElementById('autoUpdateToggle').checked = true;
}

document.getElementById('autoUpdateToggle').addEventListener('click', (ev) => {
	if (ev.target.checked) {
		turnOnAutoUpdate();
		localStorage.setItem('autoUpdate', true);
	} else {
		document.querySelectorAll('input').forEach((inputHTML) => {
			inputHTML.removeEventListener('change', getVenueDataAndRender);
		});
		localStorage.setItem('autoUpdate', false);
	}
});
