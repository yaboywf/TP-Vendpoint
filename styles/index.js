window.onload = () => {
    document.querySelector(".loader").style.display = "none";
}

const map = L.map('map').setView([1.346, 103.932], 17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const bounds = [
    [1.34999, 103.92620],
    [1.33795, 103.93757]
];

map.setMaxBounds(bounds);
map.fitBounds(bounds);
map.setMinZoom(map.getZoom());
map.on('drag', () => map.panInsideBounds(bounds, { animate: false }));

function fetch_building_data(way_id, vm_id) {
    fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(`[out:json]; way(${way_id}); out geom;`)
    })
    .then(response => response.json())
    .then(data => {
        if (data.elements && data.elements.length > 0) {
            display_building(data.elements[0], vm_id);
        } else {
            console.error('No building data found');
        }
    })
    .catch(error => console.error('Error fetching data:', error));
}

function display_building(building, vm_id) {
    const coordinates = building.geometry.map(coord => [coord.lat, coord.lon]);
    const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
    const centerLon = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
    const customIcon = L.icon({
        iconUrl: '/system_images/location-dot-solid.svg',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    L.marker([centerLat, centerLon], { icon: customIcon }).addTo(map).on('click', function() {
        fetch(`/get_building_details?id=${vm_id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => {
                    throw new Error(error.error || 'Unknown error');
                });
            }
            return response.json();
        })
        .then(data => {
            let count = 0;

            document.getElementById("results_payment").classList.remove("overflow");
            document.querySelector(".results").style.display = "flex";
            const results_container = document.querySelector(".results > div > div:nth-of-type(2)");

            document.querySelector(".results").setAttribute("data-vending-machine-id", data["vending_machine"]["vending_machine_id"]);
            results_container.querySelector(":scope > p:nth-of-type(1)").textContent = data["vending_machine"]["school"];
            results_container.querySelector(":scope > p:nth-of-type(2)").textContent = data["vending_machine"]["block"];
            results_container.querySelector(":scope > p:nth-of-type(3)").textContent = data["vending_machine"]["floor"];
            results_container.querySelector(":scope > p:nth-of-type(4)").textContent = data["vending_machine"]["vendor_name"]
            
            document.getElementById("results_payment").innerHTML = "";
            data["payment"].forEach(dict => {
                if (count < (window.innerWidth < 420 ? 1 : 2) ) {
                    const span = document.createElement('span');
                    span.classList.add(dict["payment_name"].toLowerCase());
                    span.textContent = dict["payment_name"];
                    document.getElementById("results_payment").appendChild(span);
                    count++;
                } else {
                    document.getElementById("results_payment").classList.add("overflow");
                }
            })

            results_container.querySelector(":scope > p:nth-of-type(5)").innerHTML = `<span class="status${data["status"]["status_id"]}"></span>${data["status"]["status_name"]}`;
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    });
}

fetch("/get_way_ids", {
    method: "GET",
    headers: {
        "Content-Type": "application/json"
    }
})
.then(response => {
    if (!response.ok) {
        return response.json().then(error => {
            throw new Error(error.error || 'Unknown error');
        });
    }
    return response.json();
})
.then(data => {
    Object.entries(data).forEach(([key, value]) => {
        fetch_building_data(Number(key), Number(value));    
    })
})
.catch(error => {
    console.error('Error at getting way ids:', error);
});

function add_row() {
    fetch(`/get_all_machines`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(error => {
                throw new Error(error.error || 'Unknown error');
            });
        }
        return response.json();
    })
    .then(data => {
        data["vending_machine"].forEach(vm => {
            const template = document.getElementById("add_row");
            let clone = document.importNode(template.content, true).querySelector("div");

            clone.setAttribute("data-vending-machine-id", vm.vending_machine_id);
            clone.querySelector("p:nth-of-type(1)").innerHTML = `<i class="fa-solid fa-school"></i>School: ${vm.school}`;
            clone.querySelector("p:nth-of-type(2)").innerHTML = `<i class="fa-solid fa-building"></i>Block: ${vm.block}`;
            clone.querySelector("p:nth-of-type(3)").innerHTML = `<i class="fa-solid fa-elevator"></i>Level: ${vm.floor}`;

            data["payment"].forEach(pt => {
                if (pt["vending_id"] === vm["vending_machine_id"]) {
                    const span = document.createElement("span");

                    span.classList.add(pt["payment_name"].toLowerCase());
                    span.textContent = pt["payment_name"];

                    clone.querySelector(":scope > div > div:last-of-type > div").appendChild(span);
                }
            })

            data["status"].forEach(s => {
                if (s["vending_machine_id"] === vm["vending_machine_id"]) {
                    clone.querySelector("p:nth-of-type(4)").innerHTML = `<i class="fa-solid fa-info-circle"></i>Status: ${s["status_name"]}`;
                }
            })

            document.querySelector("main > section:nth-of-type(2)").appendChild(clone);
        })
    })
    .catch(error => {
        console.error('Error at adding rows:', error);
    });
}

document.querySelector(".results > i").addEventListener("click", () => {
    document.querySelector(".results").style.display = "none";
})

document.querySelector("section:nth-of-type(2)").addEventListener("click", (event) => {
    if (event.target.tagName.toLowerCase() === "button") {
        const parent = event.target.closest("div[data-vending-machine-id]");
        const vm_id = parent.getAttribute("data-vending-machine-id");
        window.location.href = `/vm/details/${vm_id}`;
    }
})

document.querySelector("header button:first-of-type").addEventListener("click", () => {
    window.location.href = "/vm";
})

document.querySelector("header button:nth-of-type(2)").addEventListener("click", () => {
    window.location.href = "/items";
})

document.querySelector("header button:last-of-type").addEventListener("click", () => {
    window.location.href = "/notifications";
})

document.querySelector(".results button").addEventListener("click", () => {
    const vm_id = document.querySelector(".results").getAttribute("data-vending-machine-id");

    if (vm_id) {
        window.location.href = `/vm/details/${vm_id}`;
    } else {
        document.querySelector(".results").style.display = "none";
        console.error("Vending Machine ID not found");
    }
})

document.querySelector(".add_vm i").addEventListener("click", () => {
    document.querySelector(".add_vm").style.display = "none";
})

document.querySelector("#home_page>div:first-of-type>button").addEventListener("click", () => {
    document.querySelector(".add_vm").style.display = "flex";
})

document.getElementById("block").addEventListener("input", () => {
    const input = document.getElementById("block");
    const value = input.value;
    if (!/^\d+$/.test(value)) {
        input.nextElementSibling.style.display = "block";
    } else {
        input.nextElementSibling.style.display = "none";
    }

    let school;

    switch (true) {
        case (parseInt(input.value) === 1):
            school = "HSS";
            break;
        case (parseInt(input.value) === 28):
            school = "DES";
            break;
        case ((parseInt(input.value) >= 10 && parseInt(input.value) <= 25) || 
              (parseInt(input.value) >= 32 && parseInt(input.value) <= 33)):
            school = "ENG";
            break;
        case (parseInt(input.value) === 26):
            school = "BUS";
            break;
        case (parseInt(input.value) >= 5 && parseInt(input.value) <= 8):
            school = "ASC";
            break;
        case (parseInt(input.value) > 1 && parseInt(input.value) <= 4):
            school = "IIT";
            break;
        default:
            school = "Others";
            break;
    }

    document.getElementById("school").value = school;
});

function find_next_p(input) {
    let current = input;
  
    while (current) {
        let next = current.nextElementSibling;
        while (next) {
            if (next.tagName === 'P') {
                return next;
            }
            next = next.nextElementSibling;
        }
  
        current = current.parentElement;
    }
  
    return null;
}

document.querySelector(".add_vm > form").addEventListener("submit", (event) => {
    event.preventDefault();

    let can_submit = true;

    document.querySelectorAll(".add_vm > form input").forEach(input => {
        if (input.type === "radio") {
            const radio = document.querySelectorAll(`input[name="${input.name}"]`);
            const checked = Array.from(radio).some(radio => radio.checked);
            
            if (!checked) {
                find_next_p(input).style.display = "block";
                can_submit = false;
            }
        } else {
            if (input.value === "") {
                find_next_p(input).style.display = "block";
                can_submit = false;
            }
        }
    })

    if (parseInt(document.getElementById("block").value) > 34 || parseInt(document.getElementById("block").value) < 1) {
        find_next_p(document.getElementById("block")).style.display = "block";
        can_submit = false;
    }

    if (parseInt(document.getElementById("level").value) > 8 || parseInt(document.getElementById("level").value) < 1) {
        can_submit = false
        find_next_p(document.getElementById("level")).style.display = "block";
    }

    if (!can_submit) {
        return;
    }

    fetch(`/add_vm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "block": document.getElementById("block").value,
            "level": document.getElementById("level").value,
            "vendor": document.getElementById("vendor").value,
            "school": document.getElementById("school").value,
            "status": document.querySelector('input[name="status"]:checked').value,
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(error => {
                throw new Error(error.error || 'Unknown error');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data["added"]) {
            window.location.reload();
        }
    })
    .catch(error => {
        console.error('Error at adding vending machine:', error);
    });
});

add_row();