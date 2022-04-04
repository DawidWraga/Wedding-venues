let data;

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

// ################### DATES ##################

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

// function countWeekdays(dates) {
// 	let count = 0;
// 	dates.forEach((date) => {
// 		let day = date.getDay();
// 		if (0 != day && day != 6) count++;
// 	});
// 	return count;
// }

// function countWeekends(dates) {
// 	let count = 0;
// 	dates.forEach((date) => {
// 		let day = date.getDay();
// 		if (0 == day || day == 6) count++;
// 	});
// 	return count;
// }

//################### DATABASE ##################

async function queryDB(query) {
	try {
		const response = await fetch(`get-data.php?q=${query}`);
		if (!response.ok) {
			throw new Error('HTTP Error: ', response.status);
		}
		let venues = await response.json();
		return venues;
	} catch (err) {
		console.error(err);
	}
}

async function getVenueData() {
	const cateringGrade = document.getElementById('catering').value;
	const partySizeHTML = document.getElementById('partySize');
	const partySize = partySizeHTML.value;
	let checkin = sqlFormatDate(document.getElementById('checkin').valueAsDate);
	let checkout = sqlFormatDate(document.getElementById('checkout').valueAsDate);
	const checkinDates = getCheckinDates();

	const query = `
		SELECT name, weekend_price, weekday_price, catering.cost AS catering_price, capacity, IF(venue.licensed, 'Yes', 'No') AS licensed, available_days, popularity, popularity_rank  
		FROM venue
		INNER JOIN catering ON venue.venue_id=catering.venue_id
		INNER JOIN (
	  	SELECT DISTINCT ${checkinDates.length}-COUNT(booking_date) AS available_days, venue_id
			FROM venue_booking
			WHERE booking_date BETWEEN '${checkin}' AND '${checkout}'
	    GROUP BY venue_id
			) avail ON avail.venue_id=catering.venue_id
		INNER JOIN (
			SELECT a.venue_id, a.pop AS popularity, COUNT(*) AS popularity_rank 
			FROM (SELECT venue_id, count(booking_date) AS pop 
					 FROM venue_booking 
					 GROUP BY venue_id) a 
			JOIN (SELECT venue_id, COUNT(booking_date) AS pop 
						FROM venue_booking 
					 GROUP BY venue_id) b ON a.pop<b.pop 
			GROUP BY a.venue_id 
			) pr ON avail.venue_id=pr.venue_id 
		WHERE venue.capacity >= ${partySize} AND grade=${cateringGrade}
		GROUP BY name, capacity, licensed, catering_price, venue.venue_id;
	`.replaceAll(/\n|\t/g, ' ');

	let venues = await queryDB(query);
	return venues;
}

async function getVenueBookings(name) {
	let checkin = sqlFormatDate(document.getElementById('checkin').valueAsDate);
	let checkout = sqlFormatDate(document.getElementById('checkout').valueAsDate);

	const query = `
	SELECT booking_date as date 
	FROM venue v 
	JOIN venue_booking vb on v.venue_id=vb.venue_id 
	WHERE 
		booking_date BETWEEN '${checkin}' and '${checkout}' 
    and name='${name}';
	`;

	let bookedDates = await queryDB(query);
	// transform array of objects into array of dates
	return bookedDates.map(({ date }) => new Date(date));
}

// ################### RESULTS ##################

// COMPONENTS

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
		`.replace(/\n|\t/, '');

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
			catering: catering_price * daysCount,
			weekdays: weekday_price * weekdayCount,
			weekends: weekend_price * weekendCount,
		};
		p.perPerson = p.catering + p.weekdays + p.weekends;
		p.total = p.perPerson * partySize;

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
				: `<h5>Total price per person:</h5>
			<h5 class="text-end">£${numberWithCommas(p.perPerson)}</h5>
		`;

		// COMPLETE PRICES STRING
		const priceString = `
		<div class="price-grid py-3 px-md-4">
			<h5>Catering for ${daysCount} days:</h5>
			<h5 class="text-end">£${numberWithCommas(catering_price * daysCount)}</h5>
			${weekendPriceHTML}
			${weekdayPriceHTML}
			${pricePerPersonHTML}
		</div>
		<div class="d-flex justify-content-center text-center mt-3">
			<h4 class="col fw-bold fs-5 ms-4">
				Total price for ${partySize} Guest${sCheck(partySize)}:
			</h4>
			<h4 class="col fw-bold fs-5">£${numberWithCommas(p.total)}</h4>
		</div>
	`.replace(/\n|\t/, '');

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

function formatDisplayString(text) {
	return text[0].toUpperCase() + text.slice(1).replace('_', ' ');
}

async function renderCards() {
	const cardTemplate = document.getElementById('venueCard');
	const results = document.getElementById('result');
	results.innerHTML = ``;

	const cardsContainerHTML = document.createElement('div');
	cardsContainerHTML.classList.add('cards-container');
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
			changeBookingDetailsModal(name);
		});

		cardsContainerHTML.appendChild(cardHTML);
	});
	results.appendChild(cardsContainerHTML);
}

// TODO: CSS based alternating rows
let rowType = 'rowB';
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
				colHTML.addEventListener('dblclick', sortDataByColAndRender);
				firstRowHTML.appendChild(colHTML);
			}
			tableHTML.appendChild(firstRowHTML);
		}

		// Create rows
		const rowHTML = document.createElement('tr');

		for (let [col, cell] of Object.entries(venue)) {
			if (col.includes('price')) cell = '£' + cell;
			const cellHTML = document.createElement('td');

			// name and btn
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

				// data cols
			} else {
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

let displayMode = 'cards';

document.getElementById('showTable').onclick = () => (displayMode = 'table');
document.getElementById('showCards').onclick = () => (displayMode = 'cards');

async function getVenueDataAndRender() {
	data = await getVenueData();
	if (displayMode === 'table') renderTable(data);
	if (displayMode === 'cards') renderCards(data);
}

document.querySelector('form').addEventListener('submit', (ev) => {
	ev.preventDefault();
	getVenueDataAndRender();
});

// settings

// SORTING DATA

const sortby = { order: '', col: '' };

// TODO: remove redundant regex
function sortDataByColAndRender(ev) {
	const col = ev.target.innerText.replace(' ', '_').toLowerCase();
	beforeSpace = /[^ ]*/;

	if (sortby.col === col) {
		// swap order
		if (sortby.order === 'DESC') {
			sortby.order = 'ASC';
			data.sort(
				(a, b) => a[col].match(beforeSpace) - b[col].match(beforeSpace)
			);
		} else if (sortby.order === 'ASC') {
			sortby.order = 'DESC';
			data.sort(
				(a, b) => b[col].match(beforeSpace) - a[col].match(beforeSpace)
			);
		}
	} else {
		sortby.col = col;
		sortby.order = 'DESC';
		data.sort((a, b) => b[col].match(beforeSpace) - a[col].match(beforeSpace));
	}
	renderTable(data);
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

// Check in / checkout input validation

document.getElementById('checkin').addEventListener('change', (ev) => {
	const checkout = document.getElementById('checkout');
	if (ev.target.valueAsDate > checkout.valueAsDate) {
		alert('Invalid input: check in date must be BEFORE check out date.');
		ev.target.value = checkout.value;
	}
});

document.getElementById('checkout').addEventListener('change', (ev) => {
	const checkin = document.getElementById('checkin');
	if (ev.target.valueAsDate < checkin.valueAsDate) {
		alert('Invalid input: check out date must be AFTER check out date.');
		ev.target.value = checkin.value;
	}
});

// save query

document.getElementById('save').addEventListener('click', (ev) => {
	ev.preventDefault();
	const query = {};
	document.querySelectorAll('input').forEach((inputHTML) => {
		query[inputHTML.name] = inputHTML.value;
	});
	localStorage.setItem('savedQuery', JSON.stringify(query));
});

// load query

document.getElementById('load').addEventListener('click', (ev) => {
	ev.preventDefault();
	let savedQuery = JSON.parse(localStorage.getItem('savedQuery'));
	for (const [name, value] of Object.entries(savedQuery)) {
		document.querySelector(`input[name=${name}]`).value = value;
	}
	getVenueDataAndRender();
});
