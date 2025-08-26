const path = window.location.pathname;
const parts = path.split("/");
const vm_id_in_url = parts[3];

fetch(`/get_machine_details?vm_id=${vm_id_in_url}`, {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
    }
})
.then(response => {
    if (!response.status === 404) {
        throw new Error("Vending Machine ID cannot be found");

    } else if (!response.ok) {
        return response.json().then(error => {
            throw new Error(error.error || 'Unknown error');
        });
    }
    return response.json();
})
.then(data => {
    const general = document.getElementById("general");

    general.querySelector("div > p:nth-of-type(2)").textContent = vm_id_in_url;
    document.getElementById("school").value = data["general"]["school"];
    document.getElementById("vendor").value = data["general"]["vendor_name"];
    document.getElementById("block").value = data["general"]["block"];
    document.getElementById("level").value = data["general"]["floor"];
    document.querySelector(`input[name="status"][value='${data["general"]["status_id"]}']`).checked = true;
    
    data["payment"].forEach(payment => {
        document.querySelectorAll("#payment input ~ label").forEach(label => {
            if (label.textContent.trim() === payment["payment_name"]) {
                label.previousElementSibling.previousElementSibling.checked = true;
            }
        });
    });

    data["items"].forEach(item => {
        const item_template = document.getElementById("item_template");
        const clone = document.importNode(item_template.content, true).querySelector("div");

        clone.setAttribute("data-vm-item-id", item["vending_item_id"]);
        clone.setAttribute("data-item-id", item["item_id"]);
        clone.querySelector("img").src = `/item_images/${item["item_image"]}.webp`;
        clone.querySelector("img").alt = item["item_image"];
        clone.querySelector("p:nth-of-type(1)").textContent = item["item_name"];
        clone.querySelector("p:nth-of-type(2)").textContent = `$${item["item_cost"]}`;
        clone.querySelector("p:nth-of-type(3)").textContent = `Quantity: ${item["item_quantity"]}`;
        clone.querySelector("p:nth-of-type(4)").innerHTML = `<span class="status_option status${item["availability"] === 1 ? "1" : "3"}"></span> ${item["availability"] ? "Available" : "Not Available"}`;
    
        document.querySelector("#items > div:last-of-type").appendChild(clone);
    })
})
.catch(error => {
    if (!error.name.toLowerCase().includes("cannot be found")) {
        window.location.href = "/page_not_found";
    }

    if (!error.name.toLowerCase().includes("typeerror")) {
        console.error(`Failed to fetch /get_machine_details: ${error}`);
    } else {
        document.querySelector("#general > div:first-of-type > div span").classList.replace("status1", "status3");
        document.querySelector("#general > div:first-of-type > div p").textContent = "Disconnected";
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

document.querySelector("#items>div:first-of-type>div>button:first-of-type").addEventListener("click", () => {
    window.location.href = "/items";
})

document.querySelector("#items > div:last-of-type").addEventListener("click", (event) => {
    if (event.target.tagName.toLowerCase() === "i") {
        const item_id = event.target.parentElement.getAttribute("data-vm-item-id");
        const confirmation = document.querySelector(".confirmation");

        confirmation.style.display = "flex";
        confirmation.querySelector("button:first-of-type").addEventListener("click", () => {
            fetch(`/delete_vm_item?vm_item_id=${item_id}&vm_id=${vm_id_in_url}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
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
                if (data["deleted"]) {
                    confirmation.style.display = "none";
                    event.target.parentElement.remove();
                }
            })
            .catch(error => {
                if (!error.name.toLowerCase().includes("typeerror")) {
                    console.error(`Failed to fetch /delete_vm_item: ${error}`);
                } else {
                    document.querySelector("#general > div:first-of-type > div span").classList.replace("status1", "status3");
                    document.querySelector("#general > div:first-of-type > div p").textContent = "Disconnected";
                }
            })
        })
        
        confirmation.querySelector("button:last-of-type").addEventListener("click", () => {
            confirmation.style.display = "none";
        })
    }
})

document.querySelector("#danger button").addEventListener("click", (event) => {
    const confirmation = document.getElementById("delete_vm");

    confirmation.style.display = "flex";
    confirmation.querySelector("button:first-of-type").addEventListener("click", () => {
        fetch(`/delete_vm?vm_id=${vm_id_in_url}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
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
            if (data["deleted"]) {
                window.location.href = "/vm";
            }
        })
        .catch(error => {
            if (!error.name.toLowerCase().includes("typeerror")) {
                console.error(`Failed to fetch /delete_vm_item: ${error}`);
            } else {
                document.querySelector("#general > div:first-of-type > div span").classList.replace("status1", "status3");
                document.querySelector("#general > div:first-of-type > div p").textContent = "Disconnected";
            }
        })
    })
        
    confirmation.querySelector("button:last-of-type").addEventListener("click", () => {
        confirmation.style.display = "none";
    })
})

function getUpdatedItemIds() {
    return Array.from(document.querySelectorAll(".item")).map(item => Number(item.getAttribute("data-item-id")));
}

document.querySelector("#items > div:first-of-type > div > button:last-of-type").addEventListener("click", () => {
    document.querySelector(".add_vm_item_container").style.display = "flex";

    fetch("/get_all_items", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
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
        const already_added = getUpdatedItemIds();

        data["items"].forEach(item => {
            const template = document.getElementById("add_vm_item_template");
            const clone = document.importNode(template.content, true).querySelector("div");

            clone.setAttribute("data-item-id", item["item_id"]);
            clone.querySelector("span").classList.add(item["availability"] === 0 ? "status3" : "status1");
            clone.querySelector("img").src = `/item_images/${item["item_image"]}.webp`;
            clone.querySelector("img").alt = item["item_image"];
            clone.querySelector("p:nth-of-type(1)").textContent = item["item_name"];
            clone.querySelector("p:nth-of-type(2)").textContent = `$${item["item_cost"]}`;
            clone.querySelector("p:nth-of-type(3)").textContent = `Quantity: ${item["item_quantity"]}`;
    
            if (already_added.includes(item["item_id"])) {
                clone.classList.add("already_added");
                clone.querySelector(":scope > p:last-of-type").style.display = "block";
            }

            document.querySelector(".add_vm_item_container > div > div").appendChild(clone);
        })
    })
    .catch(error => {
        if (!error.name.toLowerCase().includes("typeerror")) {
            console.error(`Failed to fetch /get_all_items: ${error}`);
        } else {
            document.querySelector("#general > div:first-of-type > div span").classList.replace("status1", "status3");
            document.querySelector("#general > div:first-of-type > div p").textContent = "Disconnected";
        }
    })
})

document.querySelector(".add_vm_item_container .fa-xmark").addEventListener("click", () => {
    document.querySelector(".add_vm_item_container").style.display = "none";
    document.querySelector(".add_vm_item_container > div > div").innerHTML = "";
})

let cart_list = {}; 

document.querySelector(".add_vm_item_container > div > div:first-of-type").addEventListener("click", (event) => {
    const item = event.target.closest(".add_vm_item");

    if (item) {
        item.classList.toggle("add_to_list");
        if (item.classList.contains("add_to_list")) {
            cart_list[item.getAttribute("data-item-id")] = item.querySelector("p:first-of-type").textContent.trim();
        } else {
            delete cart_list[item.getAttribute("data-item-id")];
        }
    }

    if (Object.keys(cart_list).length === 0) {
        document.querySelector(".add_vm_item_container > div > div:last-of-type > p").textContent = "No items selected";
        document.querySelector(".add_vm_item_container > div > div:last-of-type > button").disabled = true;
    } else {
        document.querySelector(".add_vm_item_container > div > div:last-of-type > p").textContent = Object.values(cart_list).join(", ");
        document.querySelector(".add_vm_item_container > div > div:last-of-type > button").disabled = false;
    }
})

document.querySelector(".add_vm_item_container > div > div:last-of-type > button").addEventListener("click", () => {
    fetch("/add_vm_items", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            vm_id: vm_id_in_url,
            items: Object.keys(cart_list)
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
            data["details"].forEach(item => {
                const template = document.getElementById("item_template");
                const clone = document.importNode(template.content, true).querySelector("div");

                clone.setAttribute("data-vm-item-id", item["item_id"]);
                clone.querySelector("img").src = `/item_images/${item["item_image"]}.webp`;
                clone.querySelector("img").alt = item["item_image"];
                clone.querySelector("p:nth-of-type(1)").textContent = item["item_name"];
                clone.querySelector("p:nth-of-type(2)").textContent = `$${item["item_cost"]}`;
                clone.querySelector("p:nth-of-type(3)").textContent = `Quantity: ${item["item_quantity"]}`;
                clone.querySelector("p:nth-of-type(4)").innerHTML = `<span class="status_option ${item["availability"] === 0 ? "status3" : "status1"}"></span>${item["availability"] === 0 ? "Unavailable" : "Available"}`;
                
                document.querySelector("#items > div:last-of-type").appendChild(clone);
            })
        }

        document.querySelector(".add_vm_item_container").style.display = "none";
    })
    .catch(error => {
        if (!error.name.toLowerCase().includes("typeerror")) {
            console.error(`Failed to fetch /add_vm_items: ${error}`);
        } else {
            document.querySelector("#general > div:first-of-type > div span").classList.replace("status1", "status3");
            document.querySelector("#general > div:first-of-type > div p").textContent = "Disconnected";
        }
    })
})

document.querySelectorAll("#payment > div input").forEach(input => {
    input.addEventListener("change", () => {
        fetch(`/update_vm_payment?vm_id=${vm_id_in_url}&payment_name=${input.name}&payment_value=${input.checked}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
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
            if (!data["updated"]) {
                document.querySelector(`#payment > div input[name=${input.name}] + label`).click();
            }
        })
        .catch(error => {
            if (!error.name.toLowerCase().includes("typeerror")) {
                console.error(`Failed to fetch /update_vm_payment: ${error}`);
            } else {
                document.querySelector("#general > div:first-of-type > div span").classList.replace("status1", "status3");
                document.querySelector("#general > div:first-of-type > div p").textContent = "Disconnected";
            }
        })
    })
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

document.querySelectorAll("#general input").forEach(input => {
    input.addEventListener("input", () => {
        const school = document.getElementById("school").value;
        const vendor = document.getElementById("vendor").value;
        const block = document.getElementById("block").value;
        const level = document.getElementById("level").value;
        const status_id = document.querySelector(`input[name="status"]:checked`).value;


        fetch(`/update_vm_general?vm_id=${vm_id_in_url}&school=${school}&vendor_name=${vendor}&block=${block}&level=${level}&status_id=${status_id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
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
            if (!data["updated"]) {
                console.error("Failed to update vending machine details at /update_vm_general");
            }
        })
        .catch(error => {
            if (!error.name.toLowerCase().includes("typeerror")) {
                console.error(`Failed to fetch /update_vm_general: ${error}`);
            } else {
                document.querySelector("#general > div:first-of-type > div span").classList.replace("status1", "status3");
                document.querySelector("#general > div:first-of-type > div p").textContent = "Disconnected";
            }
        })      
    })
})