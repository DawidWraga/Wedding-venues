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
		document.getElementById('checkin').valueAsDate =
			document.getElementById('checkout').valueAsDate;
		return alert(
			`invalid input for date range: start range must be before end range`
		);
	}

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

	//clear body
	const modalBody = document.getElementById('bookModalBody');
	modalBody.innerHTML = '';

	// DATE SELECTOR
	const dateSelectionHTML = await createDateSelectionHTML(name);
	dateSelectionHTML.addEventListener('change', updatePrices);
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
				: `<h5>Price for ${weekdayCount} weekday${sCheck(weekdayCount)}:</h5>
			<h5 class="text-end">£${numberWithCommas(p.weekdays)}</h5>`;

		const pricePerPersonHTML =
			partySize <= 1
				? ''
				: `<h5 class="mx-4 position-relative" style="right:22px">Total price per person:</h5>
			<h5 class="text-end mx-4">£${numberWithCommas(p.perPerson)}</h5>
		`;

		// COMPLETE PRICES STRING
		const priceString = `
		<div class="price-grid py-3 px-md-4">
			<h5 >Catering for ${daysCount} days:</h5>
			<h5 class="text-end">£${numberWithCommas(catering_price * daysCount)}</h5>
			${weekendPriceHTML}
			${weekdayPriceHTML}
		</div>
		<div class="d-flex justify-content-center text-center mt-3 flex-wrap">
			<h4 class="col fw-bold fs-5 ms-4">
				Total price for ${partySize} Guest${sCheck(partySize)}:
			</h4>
			<h4 class="col fw-bold fs-5">£${numberWithCommas(p.total)}</h4>
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
	btn.classList.add('btn', 'checkOutSmallBtn', 'btn-outline-success', 'd-flex');
	btn.innerHTML = `<i class="bi bi-calendar-check svg"></i>`;
	btn.setAttribute('data-bs-toggle', 'modal');
	btn.setAttribute('data-bs-target', '#bookModal');
	return btn;
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

		// modal header image
		cardHTML.querySelector('img').src =
			venue['name'].toLowerCase().replaceAll(' ', '_') + '.avif';

		// modal header name
		cardHTML.querySelector('.card-name').innerHTML = venue.name;

		// modal body details
		let listItems = ``;
		for (let [col, cell] of Object.entries(venue)) {
			if (col === 'name') continue;
			col = formatDisplayString(col);
			if (col.includes('price')) cell = '£' + cell;

			listItems += `<li class="list-group-item d-flex justify-content-between">
			<p class="pe-1">${formatDisplayString(col)}:  </p>
			<p class="fw-bolder pe-1 text-end">${numberWithCommas(cell)}</P
			</li>`;
		}
		cardHTML.querySelector('ul').innerHTML = listItems;

		//modal footer book now btn
		cardHTML.querySelector('.bookNowBtn').addEventListener('click', (ev) => {
			const cardHTML = ev.target.parentNode;
			const name = cardHTML.querySelector('.card-name').innerHTML;
			console.log(name);
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

document.getElementById('showTable').onclick = () => (displayMode = 'table');
document.getElementById('showCards').onclick = () => (displayMode = 'cards');

function conditionalRender(data) {
	if (displayMode === 'table') renderTable(data);
	if (displayMode === 'cards') renderCards(data);
}

async function getVenueDataAndRender() {
	// data = await getVenueData();

	const newData = await getVenueData();
	if (newData !== undefined) data = newData;
	if (!data) return;
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
