let map = L.map('map').setView([4.2105, 101.9758], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

let hospitals = [];
let markers = [];

fetch('get_hospitals.php')
    .then(response => response.json())
    .then(data => {
        hospitals = data.filter(h => h.hospital_id !== "Hospital_ID");
        populateDropdowns();
	populateTableStateFilter();
        displayHospitals(hospitals);
    })
    .catch(error => console.error(error));

function populateDropdowns() {
    fillDropdown("stateFilter", hospitals.map(h => h.state));
    fillDropdown("typeFilter", hospitals.map(h => h.hospital_type));
    console.log(
        hospitals.map(h => h.state)
    );
    console.log(document.getElementById("tableStateFilter").options.length);
}

function fillDropdown(id, values) {
    let dropdown = document.getElementById(id);
    let uniqueValues = [...new Set(values)].sort();

    uniqueValues.forEach(value => {
        if (value && value.trim() !== "") {
            let option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            dropdown.appendChild(option);
        }
    });
}

function populateTableStateFilter() {

    let dropdown = document.getElementById("tableStateFilter");

    dropdown.innerHTML =
        '<option value="All">All States</option>';

    let states =
        [...new Set(hospitals.map(h => h.state))].sort();

    states.forEach(state => {

        let option = document.createElement("option");

        option.value = state;
        option.textContent = state;

        dropdown.appendChild(option);
    });

    console.log("Table filter populated");
    console.log(dropdown.options.length);
}

function getMarkerColor(type) {
    if (type === "General Hospital") return "blue";
    if (type === "Specialist Hospital") return "red";
    if (type === "University Hospital") return "purple";
    if (type === "Women & Children") return "pink";
    if (type === "Health Clinic") return "green";
    return "grey";
}

function createHospitalIcon(type) {
    let color = getMarkerColor(type);

    return L.divIcon({
        className: "",
        html: `
            <div style="
                background:${color};
                width:12px;
                height:12px;
                border-radius:50%;
                border:2px solid white;
                box-shadow:0 0 4px rgba(0,0,0,0.5);
            "></div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
}

function displayHospitals(data) {
    clearMarkers();

    let totalBeds = 0;
    let totalICU = 0;
    let totalEmergency = 0;
    let totalMaternity = 0;

    data.forEach(hospital => {
        let lat = parseFloat(hospital.latitude);
        let lng = parseFloat(hospital.longitude);

        if (isNaN(lat) || isNaN(lng)) return;

        totalBeds += parseInt(hospital.beds) || 0;

        if (hospital.icu === "Yes") totalICU++;
        if (hospital.emergency === "Yes") totalEmergency++;
        if (hospital.maternity === "Yes") totalMaternity++;

        let marker = L.marker([lat, lng], {
            icon: createHospitalIcon(hospital.hospital_type)
        }).addTo(map);

        marker.bindPopup(`
            <b>${hospital.hospital_name}</b><br>
            ID: ${hospital.hospital_id}<br>
            State: ${hospital.state}<br>
            District: ${hospital.district}<br>
            Type: ${hospital.hospital_type}<br>
            Ownership: ${hospital.ownership}<br>
            Beds: ${hospital.beds}<br>
            Emergency: ${hospital.emergency}<br>
            ICU: ${hospital.icu}<br>
            Surgery: ${hospital.surgery}<br>
            Maternity: ${hospital.maternity}
        `);

        marker.hospitalData = hospital;
        markers.push(marker);
    });

    document.getElementById("totalHospitals").innerText = data.length;
    document.getElementById("totalBeds").innerText = totalBeds;
    document.getElementById("totalICU").innerText = totalICU;
    document.getElementById("totalEmergency").innerText = totalEmergency;
    document.getElementById("totalMaternity").innerText = totalMaternity;

    populateHospitalList(data);
    populateHospitalTable(data);
    createStateChart(data);
    createTypePieChart(data);

    if (markers.length > 0) {
        let group = L.featureGroup(markers);
        map.fitBounds(group.getBounds(), {
            padding: [30, 30]
        });
    }
}

function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

function applyFilters() {
    let searchText = document.getElementById("searchHospital").value.toLowerCase();
    let selectedState = document.getElementById("stateFilter").value;
    let selectedType = document.getElementById("typeFilter").value;
    let selectedService = document.getElementById("serviceFilter").value;

    let filtered = hospitals.filter(hospital => {
        let matchSearch =
            hospital.hospital_name.toLowerCase().includes(searchText) ||
            hospital.hospital_id.toLowerCase().includes(searchText);

        let matchState =
            selectedState === "All" || hospital.state === selectedState;

        let matchType =
            selectedType === "All" || hospital.hospital_type === selectedType;

        let matchService = true;

        if (selectedService !== "All") {
            matchService = hospital[selectedService] === "Yes";
        }

        return matchSearch && matchState && matchType && matchService;
    });

    displayHospitals(filtered);
}

function populateHospitalList(data) {
    let list = document.getElementById("hospitalList");
    list.innerHTML = "";

    if (data.length === 0) {
        list.innerHTML = "<p>No hospital found.</p>";
        return;
    }

    data.forEach(hospital => {
        let distanceText = "";

        if (hospital.distance !== undefined) {
            distanceText = `<span class="badge">${hospital.distance.toFixed(2)} km away</span>`;
        }

        let item = document.createElement("div");
        item.className = "hospital-item";

        item.innerHTML = `
            <h4>${hospital.hospital_name}</h4>
            <p>${hospital.state} | ${hospital.district}</p>
            <p>${hospital.hospital_type}</p>
            <span class="badge">${hospital.beds} beds</span>
            ${distanceText}
        `;

        item.addEventListener("click", () => {
            zoomToHospital(hospital);
        });

        list.appendChild(item);
    });
}

function zoomToHospital(hospital) {
    let lat = parseFloat(hospital.latitude);
    let lng = parseFloat(hospital.longitude);

    map.setView([lat, lng], 13);

    markers.forEach(marker => {
        if (marker.hospitalData.hospital_id === hospital.hospital_id) {
            marker.openPopup();
        }
    });
}

function populateHospitalTable(data) {
    let table = document.getElementById("hospitalTable");
    table.innerHTML = "";

    data.forEach(hospital => {
        table.innerHTML += `
            <tr>
                <td>${hospital.hospital_id}</td>
                <td>${hospital.hospital_name}</td>
                <td>${hospital.state}</td>
                <td>${hospital.hospital_type}</td>
                <td>${hospital.beds}</td>
                <td>${hospital.emergency}</td>
                <td>${hospital.icu}</td>
                <td>${hospital.surgery}</td>
                <td>${hospital.maternity}</td>
            </tr>
        `;
    });
    filterTableOnly();   // ADD THIS
}

let stateBarChart = null;

function createStateChart(data) {
    const counts = {};

    data.forEach(hospital => {
        const state = hospital.state;
        counts[state] = (counts[state] || 0) + 1;
    });

    const labels = Object.keys(counts).sort();
    const values = labels.map(state => counts[state]);

    const ctx = document.getElementById("stateChart");

    if (stateBarChart !== null) {
        stateBarChart.destroy();
    }

    stateBarChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Number of hospitals",
                data: values,
                backgroundColor: "#0b7a70",
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}
function resetFilters() {
    document.getElementById("searchHospital").value = "";
    document.getElementById("stateFilter").value = "All";
    document.getElementById("typeFilter").value = "All";
    document.getElementById("serviceFilter").value = "All";

    displayHospitals(hospitals);
}

document.getElementById("searchHospital").addEventListener("input", applyFilters);
document.getElementById("stateFilter").addEventListener("change", applyFilters);
document.getElementById("typeFilter").addEventListener("change", applyFilters);
document.getElementById("serviceFilter").addEventListener("change", applyFilters);
document.getElementById("resetBtn").addEventListener("click", resetFilters);

let typePieChart = null;

function createTypePieChart(data) {
    const counts = {};

    data.forEach(hospital => {
        const type = hospital.hospital_type;

        counts[type] = (counts[type] || 0) + 1;
    });

    const ctx = document.getElementById("typeChart");

    if (typePieChart !== null) {
        typePieChart.destroy();
    }

    typePieChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: [
                    "#1e40ff",
                    "#ff0000",
                    "#8000ff",
                    "#00a651",
                    "#ffb6c1",
                    "#808080"
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}
function findNearbyHospitals() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        let userLat = position.coords.latitude;
        let userLng = position.coords.longitude;

        let hospitalsWithDistance = hospitals.map(hospital => {
            let distance = calculateDistance(
                userLat,
                userLng,
                parseFloat(hospital.latitude),
                parseFloat(hospital.longitude)
            );

            return {
                ...hospital,
                distance: distance
            };
        });

        hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

        let nearestHospitals = hospitalsWithDistance.slice(0, 5);

        displayHospitals(nearestHospitals);

        L.marker([userLat, userLng])
            .addTo(map)
            .bindPopup("<b>You are here</b>")
            .openPopup();

        map.setView([userLat, userLng], 11);
    }, error => {
        alert("Please allow location access in your browser.");
        console.log(error);
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;

    let dLat = (lat2 - lat1) * Math.PI / 180;
    let dLon = (lon2 - lon1) * Math.PI / 180;

    let a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
console.log("Script loaded");

document.getElementById("nearbyBtn").addEventListener("click", function () {
    console.log("Nearby button clicked");
    findNearbyHospitals();
}
);
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({
        behavior: "smooth"
    });
}
function filterTableOnly() {
    let searchValue = document.getElementById("tableSearch").value.toLowerCase();
    let selectedState = document.getElementById("tableStateFilter").value;
    let rows = document.querySelectorAll("#hospitalTable tr");

    rows.forEach(row => {
        let rowText = row.textContent.toLowerCase();
        let stateCell = row.children[2].textContent;

        let matchSearch = rowText.includes(searchValue);
        let matchState = selectedState === "All" || stateCell === selectedState;

        row.style.display = matchSearch && matchState ? "" : "none";
    });
}

document.getElementById("tableSearch").addEventListener("keyup", filterTableOnly);
document.getElementById("tableStateFilter").addEventListener("change", filterTableOnly);